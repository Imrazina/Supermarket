package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.Log;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LogJdbcService {

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    public List<LogWithPath> findRecentWithPath() {
        String sql = """
                SELECT l.ID_LOG          AS idLog,
                       l.TABULKANAZEV    AS tableName,
                       l.OPERACE         AS operation,
                       l.DATUMZMENY      AS timestamp,
                       CAST(l.POPIS AS VARCHAR2(4000)) AS popis,
                       DBMS_LOB.SUBSTR(l.NOVADATA, 4000, 1) AS novaData,
                       DBMS_LOB.SUBSTR(l.STARADATA, 4000, 1) AS staraData,
                       l.IDREKORD        AS idRekord,
                       COALESCE(h.cesta, a.NAZEV) AS archivPath
                FROM LOG l
                JOIN ARCHIV a ON a.ID_ARCHIV = l.ID_ARCHIV
                LEFT JOIN (
                    SELECT id_archiv, SYS_CONNECT_BY_PATH(nazev, '/') AS cesta
                    FROM ARCHIV
                    START WITH parent_id IS NULL
                    CONNECT BY PRIOR id_archiv = parent_id
                ) h ON h.id_archiv = l.ID_ARCHIV
                ORDER BY l.DATUMZMENY DESC
                FETCH FIRST 50 ROWS ONLY
                """;
        return jdbcTemplate.query(sql, (rs, i) -> new LogWithPath(
                rs.getLong("idLog"),
                rs.getString("tableName"),
                rs.getString("operation"),
                toLdt(rs.getTimestamp("timestamp")),
                rs.getString("popis"),
                rs.getString("novaData"),
                rs.getString("staraData"),
                rs.getString("idRekord"),
                rs.getString("archivPath")
        ));
    }

    public List<LogWithPath> findFilteredWithPath(Long archiveId, String table, String op, int size) {
        int limit = Math.max(1, Math.min(size, 500));
        String sql = """
                SELECT l.ID_LOG          AS idLog,
                       l.TABULKANAZEV    AS tableName,
                       l.OPERACE         AS operation,
                       l.DATUMZMENY      AS timestamp,
                       CAST(l.POPIS AS VARCHAR2(4000)) AS popis,
                       DBMS_LOB.SUBSTR(l.NOVADATA, 4000, 1) AS novaData,
                       DBMS_LOB.SUBSTR(l.STARADATA, 4000, 1) AS staraData,
                       l.IDREKORD        AS idRekord,
                       COALESCE(h.cesta, a.NAZEV) AS archivPath
                FROM LOG l
                JOIN ARCHIV a ON a.ID_ARCHIV = l.ID_ARCHIV
                LEFT JOIN (
                    SELECT id_archiv, SYS_CONNECT_BY_PATH(nazev, '/') AS cesta
                    FROM ARCHIV
                    START WITH parent_id IS NULL
                    CONNECT BY PRIOR id_archiv = parent_id
                ) h ON h.id_archiv = l.ID_ARCHIV
                WHERE (:archiveId IS NULL OR l.ID_ARCHIV = :archiveId)
                  AND (:tableName IS NULL OR l.TABULKANAZEV = :tableName)
                  AND (:op IS NULL OR l.OPERACE = :op)
                ORDER BY l.DATUMZMENY DESC
                FETCH FIRST :limit ROWS ONLY
                """;
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("archiveId", archiveId)
                .addValue("tableName", table == null || table.isBlank() ? null : table)
                .addValue("op", op == null || op.isBlank() ? null : op)
                .addValue("limit", limit);
        return namedParameterJdbcTemplate.query(sql, params, (rs, i) -> new LogWithPath(
                rs.getLong("idLog"),
                rs.getString("tableName"),
                rs.getString("operation"),
                toLdt(rs.getTimestamp("timestamp")),
                rs.getString("popis"),
                rs.getString("novaData"),
                rs.getString("staraData"),
                rs.getString("idRekord"),
                rs.getString("archivPath")
        ));
    }

    public List<Log> findTop10() {
        String sql = """
                SELECT ID_LOG, TABULKANAZEV, OPERACE, STARADATA, NOVADATA, DATUMZMENY, IDREKORD, POPIS, ID_ARCHIV
                FROM LOG
                ORDER BY DATUMZMENY DESC
                FETCH FIRST 10 ROWS ONLY
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Log l = new Log();
            l.setIdLog(rs.getLong("ID_LOG"));
            l.setTabulkaNazev(rs.getString("TABULKANAZEV"));
            l.setOperace(rs.getString("OPERACE"));
            l.setStaraData(rs.getString("STARADATA"));
            l.setNovaData(rs.getString("NOVADATA"));
            l.setDatumZmeny(toLdt(rs.getTimestamp("DATUMZMENY")));
            l.setIdRekord(rs.getString("IDREKORD"));
            l.setPopis(rs.getString("POPIS"));
            return l;
        });
    }

    public Log findById(Long id) {
        if (id == null) {
            return null;
        }
        String sql = """
                SELECT ID_LOG, TABULKANAZEV, OPERACE, STARADATA, NOVADATA, DATUMZMENY, IDREKORD, POPIS, ID_ARCHIV
                FROM LOG
                WHERE ID_LOG = ?
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Log l = new Log();
            l.setIdLog(rs.getLong("ID_LOG"));
            l.setTabulkaNazev(rs.getString("TABULKANAZEV"));
            l.setOperace(rs.getString("OPERACE"));
            l.setStaraData(rs.getString("STARADATA"));
            l.setNovaData(rs.getString("NOVADATA"));
            l.setDatumZmeny(toLdt(rs.getTimestamp("DATUMZMENY")));
            l.setIdRekord(rs.getString("IDREKORD"));
            l.setPopis(rs.getString("POPIS"));
            return l;
        }, id).stream().findFirst().orElse(null);
    }

    public boolean existsById(Long id) {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(1) FROM LOG WHERE ID_LOG = ?", Integer.class, id);
        return count != null && count > 0;
    }

    public Log save(Log log) {
        LocalDateTime now = log.getDatumZmeny() != null ? log.getDatumZmeny() : LocalDateTime.now();
        log.setDatumZmeny(now);
        if (log.getIdLog() == null) {
            Long newId = jdbcTemplate.queryForObject("SELECT SEQ_LOG_ID.NEXTVAL FROM dual", Long.class);
            log.setIdLog(newId);
            jdbcTemplate.update("""
                    INSERT INTO LOG (ID_LOG, TABULKANAZEV, OPERACE, STARADATA, NOVADATA, DATUMZMENY, IDREKORD, POPIS, ID_ARCHIV)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    log.getIdLog(),
                    log.getTabulkaNazev(),
                    log.getOperace(),
                    log.getStaraData(),
                    log.getNovaData(),
                    Timestamp.valueOf(now),
                    log.getIdRekord(),
                    log.getPopis(),
                    log.getArchiv() != null ? log.getArchiv().getIdArchiv() : null
            );
        } else {
            jdbcTemplate.update("""
                    UPDATE LOG
                    SET TABULKANAZEV = ?, OPERACE = ?, STARADATA = ?, NOVADATA = ?, DATUMZMENY = ?, IDREKORD = ?, POPIS = ?, ID_ARCHIV = ?
                    WHERE ID_LOG = ?
                    """,
                    log.getTabulkaNazev(),
                    log.getOperace(),
                    log.getStaraData(),
                    log.getNovaData(),
                    Timestamp.valueOf(now),
                    log.getIdRekord(),
                    log.getPopis(),
                    log.getArchiv() != null ? log.getArchiv().getIdArchiv() : null,
                    log.getIdLog()
            );
        }
        return log;
    }

    public void deleteById(Long id) {
        if (id == null) return;
        jdbcTemplate.update("DELETE FROM LOG WHERE ID_LOG = ?", id);
    }

    private LocalDateTime toLdt(Timestamp ts) {
        return ts != null ? ts.toLocalDateTime() : null;
    }

    public record LogWithPath(Long idLog,
                              String tableName,
                              String operation,
                              LocalDateTime timestamp,
                              String popis,
                              String novaData,
                              String staraData,
                              String idRekord,
                              String archivPath) { }
}

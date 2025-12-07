package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.Log;
import lombok.RequiredArgsConstructor;
import oracle.jdbc.OracleTypes;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LogJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<LogWithPath> findRecentWithPath() {
        return listWithPath(50, null, null, null);
    }

    public List<LogWithPath> findFilteredWithPath(Long archiveId, String table, String op, int size) {
        int limit = Math.max(1, Math.min(size, 500));
        return listWithPath(limit,
                archiveId,
                (table == null || table.isBlank()) ? null : table,
                (op == null || op.isBlank()) ? null : op);
    }

    public List<Log> findTop10() {
        List<Log> result = new ArrayList<>();
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_log.list_recent(?, ?) }");
            cs.setInt(1, 10);
            cs.registerOutParameter(2, OracleTypes.CURSOR);
            cs.execute();
            try (ResultSet rs = (ResultSet) cs.getObject(2)) {
                while (rs.next()) {
                    Log l = new Log();
                    l.setIdLog(rs.getLong("idLog"));
                    l.setTabulkaNazev(rs.getString("tableName"));
                    l.setOperace(rs.getString("operation"));
                    l.setStaraData(rs.getString("staraData"));
                    l.setNovaData(rs.getString("novaData"));
                    l.setDatumZmeny(toLdt(rs.getTimestamp("datumZmeny")));
                    l.setIdRekord(rs.getString("idRekord"));
                    l.setPopis(rs.getString("popis"));
                    result.add(l);
                }
            }
            return null;
        });
        return result;
    }

    public Log findById(Long id) {
        if (id == null) {
            return null;
        }
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_log.get_log(?, ?) }");
            cs.setLong(1, id);
            cs.registerOutParameter(2, OracleTypes.CURSOR);
            cs.execute();
            try (ResultSet rs = (ResultSet) cs.getObject(2)) {
                if (rs.next()) {
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
                }
                return null;
            }
        });
    }

    public boolean existsById(Long id) {
        return findById(id) != null;
    }

    public Log save(Log log) {
        LocalDateTime now = log.getDatumZmeny() != null ? log.getDatumZmeny() : LocalDateTime.now();
        log.setDatumZmeny(now);
        Long id = jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_log.upsert_log(?, ?, ?, ?, ?, ?, ?, ?, ?) }");
            if (log.getIdLog() == null) {
                cs.setNull(1, Types.NUMERIC);
            } else {
                cs.setLong(1, log.getIdLog());
            }
            cs.registerOutParameter(1, Types.NUMERIC);
            cs.setString(2, log.getTabulkaNazev());
            cs.setString(3, log.getOperace());
            cs.setString(4, log.getStaraData());
            cs.setString(5, log.getNovaData());
            cs.setTimestamp(6, Timestamp.valueOf(now));
            cs.setString(7, log.getIdRekord());
            cs.setString(8, log.getPopis());
            cs.setObject(9, log.getArchiv() != null ? log.getArchiv().getIdArchiv() : null, Types.NUMERIC);
            cs.execute();
            return cs.getLong(1);
        });
        log.setIdLog(id);
        return log;
    }

    public void deleteById(Long id) {
        if (id == null) return;
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_log.delete_log(?) }");
            cs.setLong(1, id);
            cs.execute();
            return null;
        });
    }

    private LocalDateTime toLdt(Timestamp ts) {
        return ts != null ? ts.toLocalDateTime() : null;
    }

    private List<LogWithPath> listWithPath(int limit, Long archiveId, String table, String op) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_log.list_filtered(?, ?, ?, ?, ?) }");
            cs.setObject(1, archiveId, Types.NUMERIC);
            cs.setString(2, table);
            cs.setString(3, op);
            cs.setInt(4, limit);
            cs.registerOutParameter(5, OracleTypes.CURSOR);
            cs.execute();
            List<LogWithPath> list = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(5)) {
                while (rs.next()) {
                    list.add(new LogWithPath(
                            rs.getLong("idLog"),
                            rs.getString("tableName"),
                            rs.getString("operation"),
                            toLdt(rs.getTimestamp("datumZmeny")),
                            rs.getString("popis"),
                            rs.getString("novaData"),
                            rs.getString("staraData"),
                            rs.getString("idRekord"),
                            rs.getString("archivPath")
                    ));
                }
            }
            return list;
        });
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

package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.Archiv;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ArchivJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<Archiv> findAll() {
        String sql = """
                SELECT ID_ARCHIV, NAZEV, POPIS, PARENT_ID
                FROM ARCHIV
                ORDER BY ID_ARCHIV
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Archiv a = new Archiv();
            a.setIdArchiv(rs.getLong("ID_ARCHIV"));
            a.setNazev(rs.getString("NAZEV"));
            a.setPopis(rs.getString("POPIS"));
            a.setParentId(rs.getLong("PARENT_ID"));
            if (rs.wasNull()) {
                a.setParentId(null);
            }
            return a;
        });
    }

    public Archiv findById(Long id) {
        if (id == null) {
            return null;
        }
        String sql = """
                SELECT ID_ARCHIV, NAZEV, POPIS, PARENT_ID
                FROM ARCHIV
                WHERE ID_ARCHIV = ?
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Archiv a = new Archiv();
            a.setIdArchiv(rs.getLong("ID_ARCHIV"));
            a.setNazev(rs.getString("NAZEV"));
            a.setPopis(rs.getString("POPIS"));
            a.setParentId(rs.getLong("PARENT_ID"));
            if (rs.wasNull()) {
                a.setParentId(null);
            }
            return a;
        }, id).stream().findFirst().orElse(null);
    }

    public List<ArchivHierarchyRow> findHierarchy() {
        String sql = """
                SELECT id_archiv     AS idArchiv,
                       nazev         AS nazev,
                       parent_id     AS parentId,
                       LEVEL         AS lvl,
                       SYS_CONNECT_BY_PATH(nazev, '/') AS cesta
                FROM ARCHIV
                START WITH parent_id IS NULL
                CONNECT BY PRIOR id_archiv = parent_id
                ORDER SIBLINGS BY nazev
                """;
        return jdbcTemplate.query(sql, (rs, i) -> new ArchivHierarchyRow(
                rs.getLong("idArchiv"),
                rs.getString("nazev"),
                rs.getObject("parentId") == null ? null : rs.getLong("parentId"),
                rs.getInt("lvl"),
                rs.getString("cesta")
        ));
    }

    public record ArchivHierarchyRow(Long idArchiv, String nazev, Long parentId, Integer lvl, String cesta) { }
}

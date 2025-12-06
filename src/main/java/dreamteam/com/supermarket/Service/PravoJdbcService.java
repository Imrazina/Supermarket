package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Pravo;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PravoJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<Pravo> findAll() {
        String sql = """
                SELECT ID_PRAVO, NAZEV, KOD, POPIS
                FROM PRAVO
                ORDER BY ID_PRAVO
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Pravo p = new Pravo();
            p.setIdPravo(rs.getLong("ID_PRAVO"));
            p.setNazev(rs.getString("NAZEV"));
            p.setKod(rs.getString("KOD"));
            p.setPopis(rs.getString("POPIS"));
            return p;
        });
    }

    public Pravo findById(Long id) {
        String sql = """
                SELECT ID_PRAVO, NAZEV, KOD, POPIS
                FROM PRAVO
                WHERE ID_PRAVO = ?
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Pravo p = new Pravo();
            p.setIdPravo(rs.getLong("ID_PRAVO"));
            p.setNazev(rs.getString("NAZEV"));
            p.setKod(rs.getString("KOD"));
            p.setPopis(rs.getString("POPIS"));
            return p;
        }, id).stream().findFirst().orElse(null);
    }

    public Pravo findByKod(String kod) {
        String sql = """
                SELECT ID_PRAVO, NAZEV, KOD, POPIS
                FROM PRAVO
                WHERE UPPER(KOD) = UPPER(?)
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Pravo p = new Pravo();
            p.setIdPravo(rs.getLong("ID_PRAVO"));
            p.setNazev(rs.getString("NAZEV"));
            p.setKod(rs.getString("KOD"));
            p.setPopis(rs.getString("POPIS"));
            return p;
        }, kod).stream().findFirst().orElse(null);
    }

    public boolean existsById(Long id) {
        String sql = "SELECT 1 FROM PRAVO WHERE ID_PRAVO = ? AND ROWNUM = 1";
        return !jdbcTemplate.query(sql, (rs, i) -> 1, id).isEmpty();
    }

    public void deleteById(Long id) {
        jdbcTemplate.update("DELETE FROM PRAVO WHERE ID_PRAVO = ?", id);
    }

    /**
     * Inserts or updates Pravo.
     * If id is null -> INSERT with SEQ_PRAVO_ID.NEXTVAL, else UPDATE existing.
     */
    public Pravo save(Pravo pravo) {
        if (pravo.getIdPravo() == null) {
            Long newId = jdbcTemplate.queryForObject("SELECT SEQ_PRAVO_ID.NEXTVAL FROM dual", Long.class);
            jdbcTemplate.update("""
                    INSERT INTO PRAVO (ID_PRAVO, NAZEV, KOD, POPIS)
                    VALUES (?, ?, ?, ?)
                    """, newId, pravo.getNazev(), pravo.getKod(), pravo.getPopis());
            pravo.setIdPravo(newId);
        } else {
            jdbcTemplate.update("""
                    UPDATE PRAVO
                    SET NAZEV = ?, KOD = ?, POPIS = ?
                    WHERE ID_PRAVO = ?
                    """, pravo.getNazev(), pravo.getKod(), pravo.getPopis(), pravo.getIdPravo());
        }
        return pravo;
    }
}

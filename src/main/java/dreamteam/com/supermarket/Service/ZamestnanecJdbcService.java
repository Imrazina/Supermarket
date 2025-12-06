package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Zamestnanec;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ZamestnanecJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public Zamestnanec findById(Long id) {
        if (id == null) {
            return null;
        }
        String sql = """
                SELECT ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE
                FROM ZAMESTNANEC
                WHERE ID_UZIVATELU = ?
                """;
        return jdbcTemplate.query(sql, (rs, i) -> Zamestnanec.builder()
                        .id(rs.getLong("ID_UZIVATELU"))
                        .mzda(rs.getBigDecimal("MZDA"))
                        .datumNastupa(rs.getDate("DATUMNASTUPA").toLocalDate())
                        .pozice(rs.getString("POZICE"))
                .build(),
                id).stream().findFirst().orElse(null);
    }

    public List<Zamestnanec> findAll() {
        String sql = """
                SELECT ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE
                FROM ZAMESTNANEC
                ORDER BY ID_UZIVATELU
                """;
        return jdbcTemplate.query(sql, (rs, i) -> Zamestnanec.builder()
                .id(rs.getLong("ID_UZIVATELU"))
                .mzda(rs.getBigDecimal("MZDA"))
                .datumNastupa(rs.getDate("DATUMNASTUPA").toLocalDate())
                .pozice(rs.getString("POZICE"))
                .build());
    }

    public List<String> findDistinctPositions() {
        String sql = "SELECT DISTINCT POZICE FROM ZAMESTNANEC ORDER BY POZICE";
        return jdbcTemplate.query(sql, (rs, i) -> rs.getString("POZICE"));
    }

    public Zamestnanec save(Zamestnanec zamestnanec) {
        if (zamestnanec == null || zamestnanec.getId() == null) {
            return zamestnanec;
        }
        if (existsById(zamestnanec.getId())) {
            update(zamestnanec);
        } else {
            insert(zamestnanec);
        }
        return zamestnanec;
    }

    public void deleteById(Long id) {
        if (id == null) {
            return;
        }
        jdbcTemplate.update("DELETE FROM ZAMESTNANEC WHERE ID_UZIVATELU = ?", id);
    }

    private boolean existsById(Long id) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM ZAMESTNANEC WHERE ID_UZIVATELU = ?",
                Integer.class,
                id
        );
        return count != null && count > 0;
    }

    private void insert(Zamestnanec zamestnanec) {
        jdbcTemplate.update("""
                        INSERT INTO ZAMESTNANEC (ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE)
                        VALUES (?, ?, ?, ?)
                        """,
                zamestnanec.getId(),
                zamestnanec.getMzda(),
                zamestnanec.getDatumNastupa() != null ? Date.valueOf(zamestnanec.getDatumNastupa()) : null,
                zamestnanec.getPozice()
        );
    }

    private void update(Zamestnanec zamestnanec) {
        jdbcTemplate.update("""
                        UPDATE ZAMESTNANEC
                        SET MZDA = ?, DATUMNASTUPA = ?, POZICE = ?
                        WHERE ID_UZIVATELU = ?
                        """,
                zamestnanec.getMzda(),
                zamestnanec.getDatumNastupa() != null ? Date.valueOf(zamestnanec.getDatumNastupa()) : null,
                zamestnanec.getPozice(),
                zamestnanec.getId()
        );
    }
}

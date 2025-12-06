package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Zakaznik;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ZakaznikJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public Zakaznik findById(Long id) {
        if (id == null) {
            return null;
        }
        String sql = "SELECT ID_UZIVATELU, KARTAVERNOSTI FROM ZAKAZNIK WHERE ID_UZIVATELU = ?";
        return jdbcTemplate.query(sql, (rs, i) -> Zakaznik.builder()
                        .id(rs.getLong("ID_UZIVATELU"))
                        .kartaVernosti(rs.getString("KARTAVERNOSTI"))
                .build(),
                id).stream().findFirst().orElse(null);
    }

    public List<Zakaznik> findAll() {
        String sql = "SELECT ID_UZIVATELU, KARTAVERNOSTI FROM ZAKAZNIK ORDER BY ID_UZIVATELU";
        return jdbcTemplate.query(sql, (rs, i) -> Zakaznik.builder()
                .id(rs.getLong("ID_UZIVATELU"))
                .kartaVernosti(rs.getString("KARTAVERNOSTI"))
                .build());
    }

    public Zakaznik save(Zakaznik zakaznik) {
        if (zakaznik == null || zakaznik.getId() == null) {
            return zakaznik;
        }
        if (existsById(zakaznik.getId())) {
            jdbcTemplate.update("""
                            UPDATE ZAKAZNIK
                            SET KARTAVERNOSTI = ?
                            WHERE ID_UZIVATELU = ?
                            """,
                    zakaznik.getKartaVernosti(),
                    zakaznik.getId()
            );
        } else {
            jdbcTemplate.update("""
                            INSERT INTO ZAKAZNIK (ID_UZIVATELU, KARTAVERNOSTI)
                            VALUES (?, ?)
                            """,
                    zakaznik.getId(),
                    zakaznik.getKartaVernosti()
            );
        }
        return zakaznik;
    }

    public void deleteById(Long id) {
        if (id == null) {
            return;
        }
        jdbcTemplate.update("DELETE FROM ZAKAZNIK WHERE ID_UZIVATELU = ?", id);
    }

    private boolean existsById(Long id) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM ZAKAZNIK WHERE ID_UZIVATELU = ?",
                Integer.class,
                id
        );
        return count != null && count > 0;
    }
}

package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Dodavatel;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DodavatelJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public Dodavatel findById(Long id) {
        if (id == null) {
            return null;
        }
        String sql = "SELECT ID_UZIVATELU, FIRMA FROM DODAVATEL WHERE ID_UZIVATELU = ?";
        return jdbcTemplate.query(sql, (rs, i) -> Dodavatel.builder()
                        .id(rs.getLong("ID_UZIVATELU"))
                        .firma(rs.getString("FIRMA"))
                .build(),
                id).stream().findFirst().orElse(null);
    }

    public List<Dodavatel> findAll() {
        String sql = "SELECT ID_UZIVATELU, FIRMA FROM DODAVATEL ORDER BY ID_UZIVATELU";
        return jdbcTemplate.query(sql, (rs, i) -> Dodavatel.builder()
                .id(rs.getLong("ID_UZIVATELU"))
                .firma(rs.getString("FIRMA"))
                .build());
    }

    public Dodavatel save(Dodavatel dodavatel) {
        if (dodavatel == null || dodavatel.getId() == null) {
            return dodavatel;
        }
        if (existsById(dodavatel.getId())) {
            jdbcTemplate.update("""
                            UPDATE DODAVATEL
                            SET FIRMA = ?
                            WHERE ID_UZIVATELU = ?
                            """,
                    dodavatel.getFirma(),
                    dodavatel.getId()
            );
        } else {
            jdbcTemplate.update("""
                            INSERT INTO DODAVATEL (ID_UZIVATELU, FIRMA)
                            VALUES (?, ?)
                            """,
                    dodavatel.getId(),
                    dodavatel.getFirma()
            );
        }
        return dodavatel;
    }

    public void deleteById(Long id) {
        if (id == null) {
            return;
        }
        jdbcTemplate.update("DELETE FROM DODAVATEL WHERE ID_UZIVATELU = ?", id);
    }

    private boolean existsById(Long id) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM DODAVATEL WHERE ID_UZIVATELU = ?",
                Integer.class,
                id
        );
        return count != null && count > 0;
    }
}

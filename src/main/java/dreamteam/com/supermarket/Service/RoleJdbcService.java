package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<Role> findAll() {
        String sql = "SELECT ID_ROLE, NAZEV FROM APP_ROLE ORDER BY ID_ROLE";
        return jdbcTemplate.query(sql, (rs, i) -> Role.builder()
                .idRole(rs.getLong("ID_ROLE"))
                .nazev(rs.getString("NAZEV"))
                .build());
    }

    public Role findById(Long id) {
        if (id == null) {
            return null;
        }
        String sql = "SELECT ID_ROLE, NAZEV FROM APP_ROLE WHERE ID_ROLE = ?";
        return jdbcTemplate.query(sql, (rs, i) -> Role.builder()
                        .idRole(rs.getLong("ID_ROLE"))
                        .nazev(rs.getString("NAZEV"))
                        .build(),
                id).stream().findFirst().orElse(null);
    }

    public Role findByNazev(String name) {
        if (name == null || name.isBlank()) {
            return null;
        }
        String sql = "SELECT ID_ROLE, NAZEV FROM APP_ROLE WHERE UPPER(NAZEV) = UPPER(?)";
        return jdbcTemplate.query(sql, (rs, i) -> Role.builder()
                        .idRole(rs.getLong("ID_ROLE"))
                        .nazev(rs.getString("NAZEV"))
                        .build(),
                name).stream().findFirst().orElse(null);
    }
}

package dreamteam.com.supermarket.Service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * JDBC helper to read permissions (PRAVO) assigned to a role.
 */
@Service
@RequiredArgsConstructor
public class RolePravoJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<String> findCodesByRoleId(Long roleId) {
        if (roleId == null) {
            return List.of();
        }
        String sql = """
                SELECT p.KOD
                FROM APP_ROLE_PRAVO rp
                JOIN PRAVO p ON p.ID_PRAVO = rp.ID_PRAVO
                WHERE rp.ID_ROLE = ?
                """;
        return jdbcTemplate.query(sql, (rs, i) -> rs.getString("KOD"), roleId);
    }

    public void deleteByRoleId(Long roleId) {
        jdbcTemplate.update("DELETE FROM APP_ROLE_PRAVO WHERE ID_ROLE = ?", roleId);
    }

    public void deleteByPravoId(Long pravoId) {
        jdbcTemplate.update("DELETE FROM APP_ROLE_PRAVO WHERE ID_PRAVO = ?", pravoId);
    }

    public void insertMapping(Long pravoId, Long roleId) {
        jdbcTemplate.update("""
                INSERT INTO APP_ROLE_PRAVO(ID_PRAVO, ID_ROLE) VALUES (?, ?)
                """, pravoId, roleId);
    }
}

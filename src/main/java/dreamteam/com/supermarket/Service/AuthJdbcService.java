package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Role;
import dreamteam.com.supermarket.model.user.Uzivatel;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.util.List;

/**
 * JDBC-only сервис для работы с пользователями и ролями (без JPA).
 * Вставки делаются через процедуры:
 *  - PROC_UZIVATEL_CREATE(p_jmeno, p_prijmeni, p_email, p_heslo, p_telefon, p_role_id, p_id OUT)
 *  - PROC_ROLE_CREATE(p_nazev, p_id OUT)
 */
@Service
@RequiredArgsConstructor
public class AuthJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public boolean emailExists(String email) {
        String sql = "SELECT 1 FROM UZIVATEL WHERE EMAIL = ? AND ROWNUM = 1";
        return !jdbcTemplate.query(sql, (rs, i) -> 1, email).isEmpty();
    }

    public boolean phoneExists(String phone) {
        String sql = "SELECT 1 FROM UZIVATEL WHERE TELEFONNICISLO = ? AND ROWNUM = 1";
        return !jdbcTemplate.query(sql, (rs, i) -> 1, phone).isEmpty();
    }

    public Role findRoleByName(String name) {
        String sql = """
                SELECT ID_ROLE, NAZEV
                FROM APP_ROLE
                WHERE LOWER(NAZEV) = LOWER(?)
                """;
        List<Role> roles = jdbcTemplate.query(sql, (rs, i) -> Role.builder()
                        .idRole(rs.getLong("ID_ROLE"))
                        .nazev(rs.getString("NAZEV"))
                        .build(),
                name);
        return roles.isEmpty() ? null : roles.get(0);
    }

    public Role createRole(String name) {
        Long id = jdbcTemplate.execute((Connection con) -> {
            try (CallableStatement cs = con.prepareCall("{ call PROC_ROLE_CREATE(?, ?) }")) {
                cs.setString(1, name);
                cs.registerOutParameter(2, java.sql.Types.NUMERIC);
                cs.execute();
                return cs.getLong(2);
            }
        });
        return Role.builder().idRole(id).nazev(name).build();
    }

    public Uzivatel createUser(String jmeno,
                               String prijmeni,
                               String email,
                               String hesloHashed,
                               String telefon,
                               Long roleId) {
        Long id = jdbcTemplate.execute((Connection con) -> {
            try (CallableStatement cs = con.prepareCall("{ call PROC_UZIVATEL_CREATE(?, ?, ?, ?, ?, ?, ?) }")) {
                cs.setString(1, jmeno);
                cs.setString(2, prijmeni);
                cs.setString(3, email);
                cs.setString(4, hesloHashed);
                cs.setString(5, telefon);
                cs.setLong(6, roleId);
                cs.registerOutParameter(7, java.sql.Types.NUMERIC);
                cs.execute();
                return cs.getLong(7);
            }
        });

        return Uzivatel.builder()
                .idUzivatel(id)
                .jmeno(jmeno)
                .prijmeni(prijmeni)
                .email(email)
                .heslo(hesloHashed)
                .telefonniCislo(telefon)
                .role(Role.builder().idRole(roleId).build())
                .build();
    }
}

package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Role;
import dreamteam.com.supermarket.model.user.Uzivatel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.util.List;

/**
 * JDBC-only сервис для работы с пользователями и ролями (без JPA).
 */
@Service
@RequiredArgsConstructor
public class AuthJdbcService {

    private final dreamteam.com.supermarket.repository.UserProcedureDao userDao;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    private final dreamteam.com.supermarket.repository.RoleProcedureDao roleDao;

    public boolean emailExists(String email) {
        String sql = "SELECT 1 FROM UZIVATEL WHERE EMAIL = ? AND ROWNUM = 1";
        return !jdbcTemplate.query(sql, (rs, i) -> 1, email).isEmpty();
    }

    public boolean phoneExists(String phone) {
        String sql = "SELECT 1 FROM UZIVATEL WHERE TELEFONNICISLO = ? AND ROWNUM = 1";
        return !jdbcTemplate.query(sql, (rs, i) -> 1, phone).isEmpty();
    }

    public Role findRoleByName(String name) {
        var row = roleDao.getByName(name);
        return row == null ? null : Role.builder().idRole(row.id()).nazev(row.name()).build();
    }

    public Role createRole(String name) {
        Long id = roleDao.saveRole(null, name);
        return Role.builder().idRole(id).nazev(name).build();
    }

    public Uzivatel createUser(String jmeno,
                               String prijmeni,
                               String email,
                               String hesloHashed,
                               String telefon,
                               Long roleId) {
        Long id = userDao.createUser(jmeno, prijmeni, email, hesloHashed, telefon, roleId);

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

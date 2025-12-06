package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Role;
import dreamteam.com.supermarket.model.user.Uzivatel;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * JDBC-based access to UZIVATEL without JPA repositories.
 */
@Service
@RequiredArgsConstructor
public class UserJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public Uzivatel findByEmail(String email) {
        String sql = """
                SELECT u.ID_UZIVATEL, u.JMENO, u.PRIJMENI, u.EMAIL, u.HESLO, u.TELEFONNICISLO,
                       r.ID_ROLE AS ROLE_ID, r.NAZEV AS ROLE_NAZEV
                FROM UZIVATEL u
                LEFT JOIN APP_ROLE r ON r.ID_ROLE = u.ID_ROLE
                WHERE u.EMAIL = ?
                """;
        return jdbcTemplate.query(sql, (rs, i) -> Uzivatel.builder()
                        .idUzivatel(rs.getLong("ID_UZIVATEL"))
                        .jmeno(rs.getString("JMENO"))
                        .prijmeni(rs.getString("PRIJMENI"))
                        .email(rs.getString("EMAIL"))
                        .heslo(rs.getString("HESLO"))
                        .telefonniCislo(rs.getString("TELEFONNICISLO"))
                        .role(Role.builder()
                                .idRole(rs.getLong("ROLE_ID"))
                                .nazev(rs.getString("ROLE_NAZEV"))
                                .build())
                .build(),
                email
        ).stream().findFirst().orElse(null);
    }

    public boolean emailUsedByOther(String email, Long selfId) {
        String sql = """
                SELECT 1
                FROM UZIVATEL
                WHERE LOWER(EMAIL) = LOWER(?)
                  AND ID_UZIVATEL <> ?
                  AND ROWNUM = 1
                """;
        return !jdbcTemplate.query(sql, (rs, i) -> 1, email, selfId == null ? -1L : selfId).isEmpty();
    }

    public Uzivatel findById(Long id) {
        String sql = """
                SELECT u.ID_UZIVATEL, u.JMENO, u.PRIJMENI, u.EMAIL, u.HESLO, u.TELEFONNICISLO,
                       r.ID_ROLE AS ROLE_ID, r.NAZEV AS ROLE_NAZEV
                FROM UZIVATEL u
                LEFT JOIN APP_ROLE r ON r.ID_ROLE = u.ID_ROLE
                WHERE u.ID_UZIVATEL = ?
                """;
        return jdbcTemplate.query(sql, (rs, i) -> Uzivatel.builder()
                        .idUzivatel(rs.getLong("ID_UZIVATEL"))
                        .jmeno(rs.getString("JMENO"))
                        .prijmeni(rs.getString("PRIJMENI"))
                        .email(rs.getString("EMAIL"))
                        .heslo(rs.getString("HESLO"))
                        .telefonniCislo(rs.getString("TELEFONNICISLO"))
                        .role(Role.builder()
                                .idRole(rs.getLong("ROLE_ID"))
                                .nazev(rs.getString("ROLE_NAZEV"))
                                .build())
                .build(),
                id
        ).stream().findFirst().orElse(null);
    }

    public List<Uzivatel> findAll() {
        String sql = """
                SELECT u.ID_UZIVATEL, u.JMENO, u.PRIJMENI, u.EMAIL, u.HESLO, u.TELEFONNICISLO,
                       r.ID_ROLE AS ROLE_ID, r.NAZEV AS ROLE_NAZEV
                FROM UZIVATEL u
                LEFT JOIN APP_ROLE r ON r.ID_ROLE = u.ID_ROLE
                ORDER BY u.ID_UZIVATEL
                """;
        return jdbcTemplate.query(sql, (rs, i) -> Uzivatel.builder()
                .idUzivatel(rs.getLong("ID_UZIVATEL"))
                .jmeno(rs.getString("JMENO"))
                .prijmeni(rs.getString("PRIJMENI"))
                .email(rs.getString("EMAIL"))
                .heslo(rs.getString("HESLO"))
                .telefonniCislo(rs.getString("TELEFONNICISLO"))
                .role(Role.builder()
                        .idRole(rs.getLong("ROLE_ID"))
                        .nazev(rs.getString("ROLE_NAZEV"))
                        .build())
                .build());
    }

    public Uzivatel findByTelefonniCislo(String telefon) {
        String sql = """
                SELECT u.ID_UZIVATEL, u.JMENO, u.PRIJMENI, u.EMAIL, u.HESLO, u.TELEFONNICISLO,
                       r.ID_ROLE AS ROLE_ID, r.NAZEV AS ROLE_NAZEV
                FROM UZIVATEL u
                LEFT JOIN APP_ROLE r ON r.ID_ROLE = u.ID_ROLE
                WHERE u.TELEFONNICISLO = ?
                """;
        return jdbcTemplate.query(sql, (rs, i) -> Uzivatel.builder()
                        .idUzivatel(rs.getLong("ID_UZIVATEL"))
                        .jmeno(rs.getString("JMENO"))
                        .prijmeni(rs.getString("PRIJMENI"))
                        .email(rs.getString("EMAIL"))
                        .heslo(rs.getString("HESLO"))
                        .telefonniCislo(rs.getString("TELEFONNICISLO"))
                        .role(Role.builder()
                                .idRole(rs.getLong("ROLE_ID"))
                                .nazev(rs.getString("ROLE_NAZEV"))
                                .build())
                .build(),
                telefon
        ).stream().findFirst().orElse(null);
    }

    public boolean phoneUsedByOther(String phone, Long selfId) {
        String sql = """
                SELECT 1
                FROM UZIVATEL
                WHERE TELEFONNICISLO = ?
                  AND ID_UZIVATEL <> ?
                  AND ROWNUM = 1
                """;
        return !jdbcTemplate.query(sql, (rs, i) -> 1, phone, selfId == null ? -1L : selfId).isEmpty();
    }

    public List<Uzivatel> findByRoleNazevIgnoreCase(String roleName) {
        String sql = """
                SELECT u.ID_UZIVATEL, u.JMENO, u.PRIJMENI, u.EMAIL, u.HESLO, u.TELEFONNICISLO,
                       r.ID_ROLE AS ROLE_ID, r.NAZEV AS ROLE_NAZEV
                FROM UZIVATEL u
                JOIN APP_ROLE r ON r.ID_ROLE = u.ID_ROLE
                WHERE LOWER(r.NAZEV) = LOWER(?)
                """;
        return jdbcTemplate.query(sql, (rs, i) -> Uzivatel.builder()
                .idUzivatel(rs.getLong("ID_UZIVATEL"))
                .jmeno(rs.getString("JMENO"))
                .prijmeni(rs.getString("PRIJMENI"))
                .email(rs.getString("EMAIL"))
                .heslo(rs.getString("HESLO"))
                .telefonniCislo(rs.getString("TELEFONNICISLO"))
                .role(Role.builder()
                        .idRole(rs.getLong("ROLE_ID"))
                        .nazev(rs.getString("ROLE_NAZEV"))
                        .build())
                .build());
    }

    public void updateCore(Uzivatel user) {
        jdbcTemplate.update("""
                UPDATE UZIVATEL
                SET JMENO = ?, PRIJMENI = ?, EMAIL = ?, HESLO = ?, TELEFONNICISLO = ?, ID_ROLE = ?
                WHERE ID_UZIVATEL = ?
                """,
                user.getJmeno(),
                user.getPrijmeni(),
                user.getEmail(),
                user.getHeslo(),
                user.getTelefonniCislo(),
                user.getRole() != null ? user.getRole().getIdRole() : null,
                user.getIdUzivatel()
        );
    }
}

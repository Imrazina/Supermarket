package dreamteam.com.supermarket.repository;

import lombok.RequiredArgsConstructor;
import oracle.jdbc.OracleTypes;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class UserProcedureDao {

    private final JdbcTemplate jdbcTemplate;

    public List<UserRow> getByEmail(String email) {
        return jdbcTemplate.execute(
                call("{ call pkg_user.get_by_email(?, ?) }", cs -> {
                    cs.setString(1, email);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractCursor(2)
        );
    }

    public List<UserRow> getById(Long id) {
        return jdbcTemplate.execute(
                call("{ call pkg_user.get_by_id(?, ?) }", cs -> {
                    cs.setLong(1, id);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractCursor(2)
        );
    }

    public List<UserRow> listAll() {
        return jdbcTemplate.execute(
                call("{ call pkg_user.list_all(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                extractCursor(1)
        );
    }

    public List<UserRow> getByPhone(String phone) {
        return jdbcTemplate.execute(
                call("{ call pkg_user.get_by_phone(?, ?) }", cs -> {
                    cs.setString(1, phone);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractCursor(2)
        );
    }

    public List<UserRow> getByRole(String roleName) {
        return jdbcTemplate.execute(
                call("{ call pkg_user.get_by_role(?, ?) }", cs -> {
                    cs.setString(1, roleName);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractCursor(2)
        );
    }

    public boolean emailUsed(String email, Long selfId) {
        Integer used = jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_user.email_used(?, ?, ?) }");
            cs.setString(1, email);
            if (selfId != null) {
                cs.setLong(2, selfId);
            } else {
                cs.setNull(2, Types.NUMERIC);
            }
            cs.registerOutParameter(3, Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<Integer>) cs -> {
            cs.execute();
            return cs.getInt(3);
        });
        return used != null && used > 0;
    }

    public boolean phoneUsed(String phone, Long selfId) {
        Integer used = jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_user.phone_used(?, ?, ?) }");
            cs.setString(1, phone);
            if (selfId != null) {
                cs.setLong(2, selfId);
            } else {
                cs.setNull(2, Types.NUMERIC);
            }
            cs.registerOutParameter(3, Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<Integer>) cs -> {
            cs.execute();
            return cs.getInt(3);
        });
        return used != null && used > 0;
    }

    public void updateCore(UserRow user) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_user.update_core(?, ?, ?, ?, ?, ?, ?) }");
            cs.setLong(1, user.id());
            cs.setString(2, user.jmeno());
            cs.setString(3, user.prijmeni());
            cs.setString(4, user.email());
            cs.setString(5, user.heslo());
            cs.setString(6, user.phone());
            if (user.roleId() != null) {
                cs.setLong(7, user.roleId());
            } else {
                cs.setNull(7, Types.NUMERIC);
            }
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public Long createUser(String jmeno,
                           String prijmeni,
                           String email,
                           String heslo,
                           String phone,
                           Long roleId) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_user.create_user(?, ?, ?, ?, ?, ?, ?) }");
            cs.setString(1, jmeno);
            cs.setString(2, prijmeni);
            cs.setString(3, email);
            cs.setString(4, heslo);
            cs.setString(5, phone);
            if (roleId != null) {
                cs.setLong(6, roleId);
            } else {
                cs.setNull(6, Types.NUMERIC);
            }
            cs.registerOutParameter(7, Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<Long>) cs -> {
            cs.execute();
            return cs.getLong(7);
        });
    }

    public void deleteUser(Long id) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_user.delete_user(?) }");
            cs.setLong(1, id);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    private CallableStatementCreator call(String sql, SqlConfigurer configurer) {
        return (Connection con) -> {
            CallableStatement cs = con.prepareCall(sql);
            configurer.accept(cs);
            return cs;
        };
    }

    private CallableStatementCallback<List<UserRow>> extractCursor(int outIndex) {
        return (CallableStatementCallback<List<UserRow>>) cs -> {
            cs.execute();
            List<UserRow> result = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                while (rs.next()) {
                    result.add(new UserRow(
                            rs.getLong("id"),
                            rs.getString("jmeno"),
                            rs.getString("prijmeni"),
                            rs.getString("email"),
                            rs.getString("heslo"),
                            rs.getString("phone"),
                            rs.getObject("role_id") != null ? rs.getLong("role_id") : null,
                            rs.getString("role_name"),
                            rs.getObject("addr_id") != null ? rs.getLong("addr_id") : null,
                            rs.getString("ulice"),
                            rs.getString("cpop"),
                            rs.getString("corient"),
                            rs.getString("psc"),
                            rs.getString("mesto"),
                            rs.getString("kraj")
                    ));
                }
            }
            return result;
        };
    }

    @FunctionalInterface
    private interface SqlConfigurer {
        void accept(CallableStatement cs) throws SQLException;
    }

    public record UserRow(Long id, String jmeno, String prijmeni, String email, String heslo,
                          String phone, Long roleId, String roleName,
                          Long addrId, String ulice, String cpop, String corient,
                          String psc, String mesto, String kraj) {}
}

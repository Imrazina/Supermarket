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
public class RoleProcedureDao {

    private final JdbcTemplate jdbcTemplate;

    public List<RoleRow> list() {
        return jdbcTemplate.execute(
                call("{ call pkg_role.list_roles(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                extractRoles(1)
        );
    }

    public RoleRow getById(Long id) {
        return jdbcTemplate.execute(
                call("{ call pkg_role.get_by_id(?, ?) }", cs -> {
                    cs.setLong(1, id);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractRoles(2)
        ).stream().findFirst().orElse(null);
    }

    public RoleRow getByName(String name) {
        return jdbcTemplate.execute(
                call("{ call pkg_role.get_by_name(?, ?) }", cs -> {
                    cs.setString(1, name);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractRoles(2)
        ).stream().findFirst().orElse(null);
    }

    public Long saveRole(Long id, String name) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_role.save_role(?, ?, ?) }");
            if (id != null) {
                cs.setLong(1, id);
            } else {
                cs.setNull(1, Types.NUMERIC);
            }
            cs.setString(2, name);
            cs.registerOutParameter(3, Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<Long>) cs -> {
            cs.execute();
            return cs.getLong(3);
        });
    }

    public void deleteRole(Long id) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_role.delete_role(?) }");
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

    private CallableStatementCallback<List<RoleRow>> extractRoles(int outIndex) {
        return (CallableStatementCallback<List<RoleRow>>) cs -> {
            cs.execute();
            List<RoleRow> list = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                while (rs.next()) {
                    list.add(new RoleRow(
                            rs.getLong("id"),
                            rs.getString("name")
                    ));
                }
            }
            return list;
        };
    }

    @FunctionalInterface
    private interface SqlConfigurer {
        void accept(CallableStatement cs) throws SQLException;
    }

    public record RoleRow(Long id, String name) {}
}

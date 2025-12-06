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
import java.util.Map;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class PermissionProcedureDao {

    private final JdbcTemplate jdbcTemplate;

    public List<Permission> listPermissions() {
        return jdbcTemplate.execute(
                call("{ call pkg_permission.list_permissions(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                extractCursor(1, rs -> new Permission(
                        rs.getLong("id"),
                        rs.getString("code"),
                        rs.getString("name"),
                        rs.getString("descr")
                ))
        );
    }

    public Long savePermission(Long id, String name, String code, String descr) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_permission.save_permission(?, ?, ?, ?, ?) }");
            if (id != null) {
                cs.setLong(1, id);
            } else {
                cs.setNull(1, Types.NUMERIC);
            }
            cs.setString(2, name);
            cs.setString(3, code);
            cs.setString(4, descr);
            cs.registerOutParameter(5, Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<Long>) cs -> {
            cs.execute();
            return cs.getLong(5);
        });
    }

    public void deletePermission(Long id) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_permission.delete_permission(?) }");
            cs.setLong(1, id);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public List<RolePermissionRow> listRolePermissions() {
        return jdbcTemplate.execute(
                call("{ call pkg_permission.list_role_permissions(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                extractCursor(1, rs -> new RolePermissionRow(
                        rs.getLong("role_id"),
                        rs.getString("role_name"),
                        rs.getString("permission_code")
                ))
        );
    }

    public void updateRolePermissions(Long roleId, List<String> codes) {
        String joined = (codes == null || codes.isEmpty()) ? null
                : codes.stream().map(String::trim).filter(c -> !c.isEmpty()).collect(Collectors.joining(","));
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_permission.update_role_permissions(?, ?) }");
            cs.setLong(1, roleId);
            if (joined != null && !joined.isBlank()) {
                cs.setString(2, joined);
            } else {
                cs.setNull(2, Types.VARCHAR);
            }
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public boolean userHasPermission(String email, String code) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_permission.user_has_permission(?, ?, ?) }");
            cs.setString(1, email);
            cs.setString(2, code);
            cs.registerOutParameter(3, Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<Boolean>) cs -> {
            cs.execute();
            return cs.getInt(3) > 0;
        });
    }

    private CallableStatementCreator call(String sql, SqlConfigurer configurer) {
        return (Connection con) -> {
            CallableStatement cs = con.prepareCall(sql);
            configurer.accept(cs);
            return cs;
        };
    }

    private <T> CallableStatementCallback<List<T>> extractCursor(int outIndex, RowMapper<T> mapper) {
        return (CallableStatementCallback<List<T>>) cs -> {
            cs.execute();
            List<T> result = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                while (rs.next()) {
                    result.add(mapper.map(rs));
                }
            }
            return result;
        };
    }

    @FunctionalInterface
    private interface SqlConfigurer {
        void accept(CallableStatement cs) throws SQLException;
    }

    @FunctionalInterface
    private interface RowMapper<T> {
        T map(ResultSet rs) throws SQLException;
    }

    public record Permission(Long id, String code, String name, String descr) {}

    public record RolePermissionRow(Long roleId, String roleName, String permissionCode) {}
}

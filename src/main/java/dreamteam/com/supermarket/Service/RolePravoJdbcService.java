package dreamteam.com.supermarket.Service;

import lombok.RequiredArgsConstructor;
import oracle.jdbc.OracleTypes;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;

/**
 * JDBC helper to read permissions (PRAVO) assigned to a role – používá balík pkg_role_pravo.
 */
@Service
@RequiredArgsConstructor
public class RolePravoJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<String> findCodesByRoleId(Long roleId) {
        if (roleId == null) {
            return List.of();
        }
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_role_pravo.list_kody_by_role(?, ?) }");
            cs.setLong(1, roleId);
            cs.registerOutParameter(2, OracleTypes.CURSOR);
            return cs;
        }, (CallableStatementCallback<List<String>>) cs -> {
            cs.execute();
            try (var rs = (java.sql.ResultSet) cs.getObject(2)) {
                List<String> list = new ArrayList<>();
                while (rs.next()) {
                    list.add(rs.getString("KOD"));
                }
                return list;
            }
        });
    }

    public void deleteByRoleId(Long roleId) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_role_pravo.delete_by_role(?) }");
            cs.setLong(1, roleId);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public void deleteByPravoId(Long pravoId) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_role_pravo.delete_by_pravo(?) }");
            cs.setLong(1, pravoId);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public void insertMapping(Long pravoId, Long roleId) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_role_pravo.insert_mapping(?, ?) }");
            cs.setLong(1, pravoId);
            cs.setLong(2, roleId);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }
}

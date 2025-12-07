package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Notifikace;
import lombok.RequiredArgsConstructor;
import oracle.jdbc.OracleTypes;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotifikaceJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public Notifikace findByAdresat(String adresat) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_notifikace.get_by_adresat(?, ?) }");
            cs.setString(1, adresat);
            cs.registerOutParameter(2, OracleTypes.CURSOR);
            return cs;
        }, (CallableStatementCallback<Notifikace>) cs -> {
            cs.execute();
            try (var rs = (java.sql.ResultSet) cs.getObject(2)) {
                if (rs.next()) {
                    return map(rs);
                }
            }
            return null;
        });
    }

    public List<Notifikace> findAll() {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_notifikace.list_notifikace(?) }");
            cs.registerOutParameter(1, OracleTypes.CURSOR);
            return cs;
        }, (CallableStatementCallback<List<Notifikace>>) cs -> {
            cs.execute();
            try (var rs = (java.sql.ResultSet) cs.getObject(1)) {
                List<Notifikace> list = new ArrayList<>();
                while (rs.next()) {
                    list.add(map(rs));
                }
                return list;
            }
        });
    }

    public Notifikace save(Notifikace n) {
        Long id = n.getIdNotifikace();
        Long newId = jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_notifikace.save_notifikace(?, ?, ?, ?, ?, ?) }");
            cs.registerOutParameter(1, java.sql.Types.NUMERIC); // IN OUT p_id
            if (id != null) {
                cs.setLong(1, id);
            } else {
                cs.setNull(1, java.sql.Types.NUMERIC);
            }
            if (n.getZpravaId() != null) cs.setLong(2, n.getZpravaId()); else cs.setNull(2, java.sql.Types.NUMERIC);
            cs.setString(3, n.getAuthToken());
            cs.setString(4, n.getEndPoint());
            cs.setString(5, n.getP256dh());
            cs.setString(6, n.getAdresat());
            return cs;
        }, (CallableStatementCallback<Long>) cs -> {
            cs.execute();
            return cs.getLong(1);
        });
        n.setIdNotifikace(newId);
        return n;
    }

    public void deleteByAdresat(String adresat) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_notifikace.delete_by_adresat(?) }");
            cs.setString(1, adresat);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    private Notifikace map(java.sql.ResultSet rs) throws java.sql.SQLException {
        Notifikace n = new Notifikace();
        n.setIdNotifikace(rs.getLong("ID_NOTIFIKACE"));
        n.setZpravaId(rs.getLong("ID_ZPRAVA"));
        n.setAuthToken(rs.getString("AUTHTOKEN"));
        n.setEndPoint(rs.getString("ENDPOINT"));
        n.setP256dh(rs.getString("P256DH"));
        n.setAdresat(rs.getString("ADRESAT"));
        return n;
    }
}

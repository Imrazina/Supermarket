package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Pravo;
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
public class PravoJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<Pravo> findAll() {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_pravo.list_prava(?) }");
            cs.registerOutParameter(1, OracleTypes.CURSOR);
            return cs;
        }, (CallableStatementCallback<List<Pravo>>) cs -> {
            cs.execute();
            try (var rs = (java.sql.ResultSet) cs.getObject(1)) {
                List<Pravo> list = new ArrayList<>();
                while (rs.next()) {
                    list.add(map(rs));
                }
                return list;
            }
        });
    }

    public Pravo findById(Long id) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_pravo.get_pravo(?, ?) }");
            cs.setLong(1, id);
            cs.registerOutParameter(2, OracleTypes.CURSOR);
            return cs;
        }, (CallableStatementCallback<Pravo>) cs -> {
            cs.execute();
            try (var rs = (java.sql.ResultSet) cs.getObject(2)) {
                if (rs.next()) {
                    return map(rs);
                }
            }
            return null;
        });
    }

    public Pravo findByKod(String kod) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_pravo.get_pravo_by_kod(?, ?) }");
            cs.setString(1, kod);
            cs.registerOutParameter(2, OracleTypes.CURSOR);
            return cs;
        }, (CallableStatementCallback<Pravo>) cs -> {
            cs.execute();
            try (var rs = (java.sql.ResultSet) cs.getObject(2)) {
                if (rs.next()) {
                    return map(rs);
                }
            }
            return null;
        });
    }

    public boolean existsById(Long id) {
        return findById(id) != null;
    }

    public void deleteById(Long id) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_pravo.delete_pravo(?) }");
            cs.setLong(1, id);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public Pravo save(Pravo pravo) {
        Long newId = jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_pravo.save_pravo(?, ?, ?, ?, ?) }");
            if (pravo.getIdPravo() != null) cs.setLong(1, pravo.getIdPravo()); else cs.setNull(1, java.sql.Types.NUMERIC);
            cs.setString(2, pravo.getNazev());
            cs.setString(3, pravo.getKod());
            cs.setString(4, pravo.getPopis());
            cs.registerOutParameter(5, java.sql.Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<Long>) cs -> {
            cs.execute();
            return cs.getLong(5);
        });
        pravo.setIdPravo(newId);
        return pravo;
    }

    private Pravo map(java.sql.ResultSet rs) throws java.sql.SQLException {
        Pravo p = new Pravo();
        p.setIdPravo(rs.getLong("ID_PRAVO"));
        p.setNazev(rs.getString("NAZEV"));
        p.setKod(rs.getString("KOD"));
        p.setPopis(rs.getString("POPIS"));
        return p;
    }
}

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
public class LocationProcedureDao {

    private final JdbcTemplate jdbcTemplate;

    public List<MestoRow> listMesta() {
        return jdbcTemplate.execute(
                call("{ call pkg_location.mesto_list(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                extractMesto(1)
        );
    }

    public MestoRow getMesto(String psc) {
        return jdbcTemplate.execute(
                call("{ call pkg_location.mesto_get(?, ?) }", cs -> {
                    cs.setString(1, psc);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractMesto(2)
        ).stream().findFirst().orElse(null);
    }

    public AdresaRow getAdresa(Long id) {
        return jdbcTemplate.execute(
                call("{ call pkg_location.adresa_get(?, ?) }", cs -> {
                    cs.setLong(1, id);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractAdresa(2)
        ).stream().findFirst().orElse(null);
    }

    public Long saveAdresa(AdresaRow adresa) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_location.adresa_save(?, ?, ?, ?, ?, ?) }");
            if (adresa.id() != null) {
                cs.setLong(1, adresa.id());
            } else {
                cs.setNull(1, Types.NUMERIC);
            }
            cs.setString(2, adresa.ulice());
            cs.setString(3, adresa.cpop());
            cs.setString(4, adresa.corient());
            cs.setString(5, adresa.psc());
            cs.registerOutParameter(6, Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<Long>) cs -> {
            cs.execute();
            return cs.getLong(6);
        });
    }

    public void deleteAdresa(Long id) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_location.adresa_delete(?) }");
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

    private CallableStatementCallback<List<MestoRow>> extractMesto(int outIndex) {
        return (CallableStatementCallback<List<MestoRow>>) cs -> {
            cs.execute();
            List<MestoRow> rows = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                while (rs.next()) {
                    rows.add(new MestoRow(
                            rs.getString("PSC"),
                            rs.getString("NAZEV"),
                            rs.getString("KRAJ")
                    ));
                }
            }
            return rows;
        };
    }

    private CallableStatementCallback<List<AdresaRow>> extractAdresa(int outIndex) {
        return (CallableStatementCallback<List<AdresaRow>>) cs -> {
            cs.execute();
            List<AdresaRow> rows = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                while (rs.next()) {
                    rows.add(new AdresaRow(
                            rs.getLong("ID_ADRESA"),
                            rs.getString("ULICE"),
                            rs.getString("CISLOPOPISNE"),
                            rs.getString("CISLOORIENTACNI"),
                            rs.getString("PSC")
                    ));
                }
            }
            return rows;
        };
    }

    @FunctionalInterface
    private interface SqlConfigurer {
        void accept(CallableStatement cs) throws SQLException;
    }

    public record MestoRow(String psc, String nazev, String kraj) {}

    public record AdresaRow(Long id, String ulice, String cpop, String corient, String psc) {}
}

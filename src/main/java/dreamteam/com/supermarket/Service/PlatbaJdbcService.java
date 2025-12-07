package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.payment.Platba;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import oracle.jdbc.OracleTypes;
import org.springframework.jdbc.core.CallableStatementCallback;

import java.sql.Connection;
import java.sql.Timestamp;
import java.sql.CallableStatement;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlatbaJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<PlatbaTypRow> listTypy() {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_platba.list_typy(?) }");
            cs.registerOutParameter(1, OracleTypes.CURSOR);
            return cs;
        }, (CallableStatementCallback<List<PlatbaTypRow>>) cs -> {
            cs.execute();
            try (var rs = (java.sql.ResultSet) cs.getObject(1)) {
                List<PlatbaTypRow> list = new java.util.ArrayList<>();
                while (rs.next()) {
                    list.add(new PlatbaTypRow(rs.getString("kód"), rs.getString("popis")));
                }
                return list;
            }
        });
    }

    // Výpis plateb dle typu (H/K/U), NULL = všechny. Data bereme z balíku pkg_platba.list_platby.
    public List<PlatbaDetail> findByTyp(String typ) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_platba.list_platby(?, ?) }");
            if (typ != null && !typ.isBlank()) {
                cs.setString(1, typ);
            } else {
                cs.setNull(1, java.sql.Types.VARCHAR);
            }
            cs.registerOutParameter(2, OracleTypes.CURSOR);
            return cs;
        }, (CallableStatementCallback<List<PlatbaDetail>>) cs -> {
            cs.execute();
            try (var rs = (java.sql.ResultSet) cs.getObject(2)) {
                List<PlatbaDetail> list = new java.util.ArrayList<>();
                while (rs.next()) {
                    Timestamp ts = rs.getTimestamp("datum");
                    LocalDateTime dt = ts != null ? ts.toLocalDateTime() : null;
                    list.add(new PlatbaDetail(
                            rs.getLong("id"),
                            rs.getBigDecimal("castka"),
                            dt,
                            rs.getLong("objednavka_id"),
                            rs.getString("platba_typ"),
                            rs.getLong("pohyb_id"),
                            rs.getBigDecimal("hotovost_prijato"),
                            rs.getBigDecimal("hotovost_vraceno"),
                            rs.getString("cislo_karty")
                    ));
                }
                return list;
            }
        });
    }

    public List<PlatbaRow> findByOrderIds(List<Long> orderIds) {
        if (orderIds == null || orderIds.isEmpty()) {
            return Collections.emptyList();
        }
        // využijeme proceduru list_platby a dofiltrujeme na klientu, abychom se drželi pouze procedur
        return findByTyp(null).stream()
                .filter(p -> orderIds.contains(p.objednavkaId()))
                .map(p -> new PlatbaRow(p.id(), p.castka(), p.datum(), p.objednavkaId(), p.platbaTyp()))
                .toList();
    }

    public record PlatbaRow(Long id, java.math.BigDecimal castka, LocalDateTime datum, Long objednavkaId, String platbaTyp) {}

    public record PlatbaDetail(Long id, java.math.BigDecimal castka, LocalDateTime datum, Long objednavkaId,
                               String platbaTyp, Long pohybId, java.math.BigDecimal prijato,
                               java.math.BigDecimal vraceno, String cisloKarty) {}

    public record PlatbaTypRow(String kod, String popis) {}
}

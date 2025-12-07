package dreamteam.com.supermarket.Service;

import lombok.RequiredArgsConstructor;
import oracle.jdbc.OracleTypes;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WalletJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public Long ensureAccountForUser(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User id is required");
        }
        Long existing = jdbcTemplate.query(
                "select ID_UCET from UCET where ID_UZIVATEL = ?",
                ps -> ps.setLong(1, userId),
                rs -> rs.next() ? rs.getLong(1) : null
        );
        if (existing != null) {
            return existing;
        }
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_ucet.create_account(?, ?) }");
            cs.setLong(1, userId);
            cs.registerOutParameter(2, Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<Long>) cs -> {
            cs.execute();
            return cs.getLong(2);
        });
    }

    public TopUpResult topUp(Long ucetId, BigDecimal castka, String metoda, String cisloKarty, String poznamka) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_ucet.topup_account(?, ?, ?, ?, ?, ?) }");
            cs.setLong(1, ucetId);
            if (castka != null) cs.setBigDecimal(2, castka); else cs.setNull(2, Types.NUMERIC);
            cs.setString(3, metoda);
            if (cisloKarty != null && !cisloKarty.isBlank()) {
                cs.setString(4, cisloKarty);
            } else {
                cs.setNull(4, Types.VARCHAR);
            }
            if (poznamka != null && !poznamka.isBlank()) {
                cs.setString(5, poznamka);
            } else {
                cs.setNull(5, Types.VARCHAR);
            }
            cs.registerOutParameter(6, Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<TopUpResult>) cs -> {
            cs.execute();
            return new TopUpResult(cs.getLong(6));
        });
    }

    public PayResult payOrder(Long ucetId, Long objednavkaId, BigDecimal castka) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_ucet.pay_order_from_account(?, ?, ?, ?, ?) }");
            cs.setLong(1, ucetId);
            cs.setLong(2, objednavkaId);
            cs.setBigDecimal(3, castka);
            cs.registerOutParameter(4, Types.NUMERIC); // pohyb
            cs.registerOutParameter(5, Types.NUMERIC); // platba
            return cs;
        }, (CallableStatementCallback<PayResult>) cs -> {
            cs.execute();
            return new PayResult(cs.getLong(4), cs.getLong(5));
        });
    }

    public RefundResult refundOrder(Long ucetId, Long objednavkaId, BigDecimal castka) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_ucet.refund_order_to_account(?, ?, ?, ?) }");
            cs.setLong(1, ucetId);
            cs.setLong(2, objednavkaId);
            cs.setBigDecimal(3, castka);
            cs.registerOutParameter(4, Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<RefundResult>) cs -> {
            cs.execute();
            return new RefundResult(cs.getLong(4));
        });
    }

    public BigDecimal findBalance(Long ucetId) {
        if (ucetId == null) return null;
        return jdbcTemplate.query(
                "select ZUSTATEK from UCET where ID_UCET = ?",
                ps -> ps.setLong(1, ucetId),
                rs -> rs.next() ? rs.getBigDecimal(1) : null
        );
    }

    public List<PohybRow> history(Long ucetId) {
        return jdbcTemplate.execute(
                (Connection con) -> {
                    CallableStatement cs = con.prepareCall("{ call pkg_ucet.account_history(?, ?) }");
                    cs.setLong(1, ucetId);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                    return cs;
                },
                (CallableStatementCallback<List<PohybRow>>) cs -> {
                    cs.execute();
                    List<PohybRow> list = new ArrayList<>();
                    try (ResultSet rs = (ResultSet) cs.getObject(2)) {
                        while (rs.next()) {
                            var ts = rs.getTimestamp("DATUM_VYTVORENI");
                            list.add(new PohybRow(
                                    rs.getLong("ID_POHYB"),
                                    rs.getString("SMER"),
                                    rs.getString("METODA"),
                                    rs.getBigDecimal("CASTKA"),
                                    rs.getString("POZNAMKA"),
                                    ts != null ? ts.toLocalDateTime() : null,
                                    rs.getObject("ID_OBJEDNAVKA") != null ? rs.getLong("ID_OBJEDNAVKA") : null,
                                    rs.getString("CISLOKARTY")
                            ));
                        }
                    }
                    return list;
                }
        );
    }

    public record TopUpResult(Long pohybId) {}

    public record PayResult(Long pohybId, Long platbaId) {}

    public record RefundResult(Long pohybId) {}

    public record PohybRow(Long id, String smer, String metoda, BigDecimal castka,
                           String poznamka, LocalDateTime datum,
                           Long objednavkaId, String cisloKarty) {}
}

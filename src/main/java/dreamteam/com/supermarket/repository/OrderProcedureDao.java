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
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class OrderProcedureDao {

    private final JdbcTemplate jdbcTemplate;

    public List<OrderRow> listAll() {
        return jdbcTemplate.execute(
                call("{ call pkg_objednavka.list_objednavky(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                extractOrders(1)
        );
    }

    public List<OrderRow> listByUser(Long userId) {
        return jdbcTemplate.execute(
                call("{ call pkg_objednavka.list_by_user(?, ?) }", cs -> {
                    cs.setLong(1, userId);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractOrders(2)
        );
    }

    public OrderRow getOrder(Long id) {
        if (id == null) return null;
        return jdbcTemplate.execute(
                call("{ call pkg_objednavka.get_objednavka(?, ?) }", cs -> {
                    cs.setLong(1, id);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractSingleOrder(2)
        );
    }

    public List<OrderItemRow> listItems(Long orderId) {
        if (orderId == null) return List.of();
        return jdbcTemplate.execute(
                call("{ call pkg_objednavka_zbozi.list_by_objednavka(?, ?) }", cs -> {
                    cs.setLong(1, orderId);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                (CallableStatementCallback<List<OrderItemRow>>) cs -> {
                    cs.execute();
                    List<OrderItemRow> list = new ArrayList<>();
                    try (ResultSet rs = (ResultSet) cs.getObject(2)) {
                        while (rs.next()) {
                            list.add(new OrderItemRow(
                                    rs.getLong("objednavka_id"),
                                    rs.getLong("zbozi_id"),
                                    rs.getString("zbozi_nazev"),
                                    rs.getInt("pocet")
                            ));
                        }
                    }
                    return list;
                }
        );
    }

    public void addItem(Long orderId, Long zboziId, int qty) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_objednavka_zbozi.add_item(?, ?, ?) }");
            cs.setLong(1, orderId);
            cs.setLong(2, zboziId);
            cs.setInt(3, qty);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public void updateItem(Long orderId, Long zboziId, int qty) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_objednavka_zbozi.update_item(?, ?, ?) }");
            cs.setLong(1, orderId);
            cs.setLong(2, zboziId);
            cs.setInt(3, qty);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public void deleteItem(Long orderId, Long zboziId) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_objednavka_zbozi.delete_item(?, ?) }");
            cs.setLong(1, orderId);
            cs.setLong(2, zboziId);
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

    private CallableStatementCallback<List<OrderRow>> extractOrders(int outIndex) {
        return (CallableStatementCallback<List<OrderRow>>) cs -> {
            cs.execute();
            List<OrderRow> list = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                while (rs.next()) {
                    list.add(mapOrder(rs));
                }
            }
            return list;
        };
    }

    private CallableStatementCallback<OrderRow> extractSingleOrder(int outIndex) {
        return (CallableStatementCallback<OrderRow>) cs -> {
            cs.execute();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                if (rs.next()) {
                    return mapOrder(rs);
                }
            }
            return null;
        };
    }

    private OrderRow mapOrder(ResultSet rs) throws java.sql.SQLException {
        Timestamp ts = rs.getTimestamp("datum");
        LocalDateTime dt = ts != null ? ts.toLocalDateTime() : null;
        return new OrderRow(
                rs.getLong("id"),
                dt,
                rs.getLong("status_id"),
                rs.getString("status_nazev"),
                rs.getLong("uzivatel_id"),
                rs.getString("uzivatel_email"),
                rs.getString("uzivatel_jmeno"),
                rs.getString("uzivatel_prijmeni"),
                rs.getLong("supermarket_id"),
                rs.getString("supermarket_nazev"),
                rs.getString("poznamka"),
                rs.getString("typ_objednavka")
        );
    }

    @FunctionalInterface
    private interface SqlConfigurer {
        void accept(CallableStatement cs) throws java.sql.SQLException;
    }

    public record OrderRow(
            Long id,
            LocalDateTime datum,
            Long statusId,
            String statusNazev,
            Long uzivatelId,
            String uzivatelEmail,
            String uzivatelJmeno,
            String uzivatelPrijmeni,
            Long supermarketId,
            String supermarketNazev,
            String poznamka,
            String typObjednavka
    ) {}

    public record OrderItemRow(Long objednavkaId, Long zboziId, String zboziNazev, Integer pocet) {}
}

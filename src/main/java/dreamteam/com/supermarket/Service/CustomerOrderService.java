package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.CustomerOrderResponse;
import lombok.RequiredArgsConstructor;
import oracle.jdbc.OracleTypes;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CustomerOrderService {

    private final JdbcTemplate jdbcTemplate;
    private final UserJdbcService userJdbcService;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
            .withLocale(Locale.forLanguageTag("cs-CZ"))
            .withZone(ZoneId.systemDefault());

    public Long resolveUserId(String email) {
        var u = userJdbcService.findByEmail(email);
        return u != null ? u.getIdUzivatel() : null;
    }

    public List<CustomerOrderResponse> listAllForStaff() {
        List<OrderRow> orders = jdbcTemplate.execute(
                (Connection con) -> {
                    CallableStatement cs = con.prepareCall("{ call pkg_objednavka.list_client_orders(?) }");
                    cs.registerOutParameter(1, OracleTypes.CURSOR);
                    return cs;
                },
                (CallableStatementCallback<List<OrderRow>>) cs -> {
                    cs.execute();
                    try (ResultSet rs = (ResultSet) cs.getObject(1)) {
                        return mapOrders(rs);
                    }
                }
        );
        return enrichWithItems(orders);
    }

    public List<CustomerOrderResponse> listByCustomer(Long userId) {
        List<OrderRow> orders = jdbcTemplate.execute(
                (Connection con) -> {
                    CallableStatement cs = con.prepareCall("{ call pkg_objednavka.list_customer_history(?, ?) }");
                    cs.setLong(1, userId);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                    return cs;
                },
                (CallableStatementCallback<List<OrderRow>>) cs -> {
                    cs.execute();
                    try (ResultSet rs = (ResultSet) cs.getObject(2)) {
                        return mapOrders(rs);
                    }
                }
        );
        return enrichWithItems(orders);
    }

    public int changeStatus(Long orderId, Long userId, Integer newStatus) {
        return jdbcTemplate.execute(
                (org.springframework.jdbc.core.CallableStatementCreator) con -> {
                    var cs = con.prepareCall("{ call pkg_objednavka.set_customer_status(?, ?, ?, ?, ?) }");
                    cs.setLong(1, orderId);
                    if (userId != null) cs.setLong(2, userId); else cs.setNull(2, java.sql.Types.NUMERIC);
                    cs.setInt(3, newStatus);
                    cs.registerOutParameter(4, java.sql.Types.NUMERIC); // code
                    cs.registerOutParameter(5, java.sql.Types.NUMERIC); // current status
                    return cs;
                },
                (org.springframework.jdbc.core.CallableStatementCallback<Integer>) cs -> {
                    cs.execute();
                    return cs.getInt(4);
                }
        );
    }

    private List<OrderRow> mapOrders(ResultSet rs) throws SQLException {
        RowMapper<OrderRow> mapper = new OrderRowMapper();
        java.util.ArrayList<OrderRow> list = new java.util.ArrayList<>();
        int rowNum = 0;
        while (rs.next()) {
            OrderRow row = mapper.mapRow(rs, rowNum++);
            if (row != null && row.id != null) {
                list.add(row);
            }
        }
        return list;
    }

    private List<CustomerOrderResponse> enrichWithItems(List<OrderRow> orders) {
        if (orders.isEmpty()) return List.of();
        var map = orders.stream().collect(java.util.stream.Collectors.toMap(o -> o.id, o -> o));
        String sql = """
                SELECT oz.ID_Objednavka, oz.ID_Zbozi, oz.POCET,
                       z.NAZEV, z.CENA
                  FROM OBJEDNAVKA_ZBOZI oz
                  JOIN ZBOZI z ON z.ID_Zbozi = oz.ID_Zbozi
                 WHERE oz.ID_Objednavka IN (%s)
                """;
        String ids = map.keySet().stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
        jdbcTemplate.query(String.format(sql, ids), (rs) -> {
            Long orderId = rs.getLong("ID_Objednavka");
            OrderRow row = map.get(orderId);
            if (row != null) {
                row.items.add(new CustomerOrderResponse.Item(
                        rs.getLong("ID_Zbozi"),
                        rs.getString("NAZEV"),
                        rs.getInt("POCET"),
                        rs.getBigDecimal("CENA")
                ));
            }
        });
        return orders.stream()
                .map(row -> new CustomerOrderResponse(
                        row.id,
                        row.statusName,
                        row.statusId,
                        row.superName,
                        row.superId,
                        row.ownerEmail,
                        row.handlerEmail,
                        row.createdAt,
                        row.note,
                        row.items,
                        computeTotal(row.items)
                ))
                .toList();
    }

    private BigDecimal computeTotal(List<CustomerOrderResponse.Item> items) {
        return items.stream()
                .map(it -> it.price().multiply(BigDecimal.valueOf(it.qty())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static class OrderRow {
        Long id;
        Integer statusId;
        String statusName;
        Long superId;
        String superName;
        String ownerEmail;
        String handlerEmail;
        String createdAt;
        String note;
        List<CustomerOrderResponse.Item> items = new java.util.ArrayList<>();
    }

    private class OrderRowMapper implements RowMapper<OrderRow> {
        @Override
        public OrderRow mapRow(ResultSet rs, int rowNum) throws SQLException {
            OrderRow row = new OrderRow();
            row.id = getLong(rs, "ID_OBJEDNAVKA", "ID", "OBJEDNAVKA_ID");
            row.statusId = getInt(rs, "ID_STATUS", "STATUS_ID");
            row.statusName = getString(rs, "STATUS_NAZEV", "STATUS", "STATUS_LABEL");
            row.superId = getLong(rs, "ID_SUPERMARKET", "SUPERMARKET_ID");
            row.superName = getString(rs, "SUPER_NAZEV", "SUPERMARKET", "SUPERMARKET_NAZEV");
            row.ownerEmail = getString(rs, "OWNER_EMAIL", "UZIVATEL_EMAIL", "CUSTOMER_EMAIL", "EMAIL");
            row.handlerEmail = getString(rs, "HANDLER_EMAIL", "OPERATOR_EMAIL", "ZAMESTNANEC_EMAIL");
            Timestamp ts = getTimestamp(rs, "DATUM", "CREATED_AT", "CREATED");
            row.createdAt = ts != null ? FORMATTER.format(ts.toInstant()) : "";
            row.note = getString(rs, "POZNAMKA", "NOTE");
            return row;
        }

        private String getString(ResultSet rs, String... names) throws SQLException {
            for (String name : names) {
                try {
                    String value = rs.getString(name);
                    if (value != null) return value;
                } catch (SQLException ignored) {
                    // try next
                }
            }
            return null;
        }

        private Long getLong(ResultSet rs, String... names) throws SQLException {
            for (String name : names) {
                try {
                    long value = rs.getLong(name);
                    if (!rs.wasNull()) return value;
                } catch (SQLException ignored) {
                    // try next
                }
            }
            return null;
        }

        private Integer getInt(ResultSet rs, String... names) throws SQLException {
            for (String name : names) {
                try {
                    int value = rs.getInt(name);
                    if (!rs.wasNull()) return value;
                } catch (SQLException ignored) {
                    // try next
                }
            }
            return null;
        }

        private Timestamp getTimestamp(ResultSet rs, String... names) throws SQLException {
            for (String name : names) {
                try {
                    Timestamp ts = rs.getTimestamp(name);
                    if (ts != null) return ts;
                } catch (SQLException ignored) {
                    // try next
                }
            }
            return null;
        }
    }
}

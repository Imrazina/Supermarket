package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.CustomerOrderResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
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
    private final WalletJdbcService walletJdbcService;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
            .withLocale(Locale.forLanguageTag("cs-CZ"))
            .withZone(ZoneId.systemDefault());
    private static final String REFUND_MARK = "[REFUND_PENDING]";
    private static final String REFUND_DENIED_MARK = "[REFUND_DENIED]";
    private static final int SQL_CURSOR = oracle.jdbc.OracleTypes.CURSOR;

    public Long resolveUserId(String email) {
        var u = userJdbcService.findByEmail(email);
        return u != null ? u.getIdUzivatel() : null;
    }

    public List<CustomerOrderResponse> listAllForStaff() {
        List<OrderRow> orders = fetchOrdersFromCursor(
                "{ call pkg_objednavka.list_client_orders(?) }",
                cs -> cs.registerOutParameter(1, SQL_CURSOR),
                1
        );
        return enrichWithItems(orders);
    }

    public List<CustomerOrderResponse> listByCustomer(Long userId) {
        List<OrderRow> orders = fetchOrdersFromCursor(
                "{ call pkg_objednavka.list_customer_history(?, ?) }",
                cs -> {
                    if (userId != null) {
                        cs.setLong(1, userId);
                    } else {
                        cs.setNull(1, java.sql.Types.NUMERIC);
                    }
                    cs.registerOutParameter(2, SQL_CURSOR);
                },
                2
        );
        return enrichWithItems(orders);
    }

    public int changeStatus(Long orderId, Long userId, Integer newStatus) {
        int[] result = jdbcTemplate.execute(
                (org.springframework.jdbc.core.CallableStatementCreator) con -> {
                    var cs = con.prepareCall("{ call proc_customer_set_status(?, ?, ?, ?, ?) }");
                    cs.setLong(1, orderId);
                    if (userId != null) cs.setLong(2, userId); else cs.setNull(2, java.sql.Types.NUMERIC);
                    cs.setInt(3, newStatus);
                    cs.registerOutParameter(4, java.sql.Types.NUMERIC); // code
                    cs.registerOutParameter(5, java.sql.Types.NUMERIC); // previous status
                    return cs;
                },
                (org.springframework.jdbc.core.CallableStatementCallback<int[]>) cs -> {
                    cs.execute();
                    return new int[]{cs.getInt(4), cs.getInt(5)};
                }
        );
        int code = result != null ? result[0] : -99;
        int prevStatus = result != null ? result[1] : -99;
        if (code == 0 && newStatus != null && newStatus == 6 && prevStatus > 0 && prevStatus <= 4) {
            restockItems(orderId);
        }
        if (code == 0 && newStatus != null && newStatus == 6) {
            autoRefundIfNeeded(orderId);
        }
        return code;
    }

    public List<CustomerOrderResponse> listPendingRefunds(Long handlerId) {
        if (handlerId == null) {
            return List.of();
        }
        List<OrderRow> orders = fetchOrdersFromCursor(
                "{ call pkg_customer_refund.list_pending(?, ?) }",
                cs -> {
                    cs.setLong(1, handlerId);
                    cs.registerOutParameter(2, SQL_CURSOR);
                },
                2
        );
        return enrichWithItems(orders);
    }

    /**
     * Zákazník požádá o refund – jen označí objednávku, bez vrácení peněz.
     * @return 0 ok, -1 už čeká, -2 už refundováno, -3 nenalezeno/nepatří, -4 stav nedovoluje
     */
    public int requestRefund(Long orderId, String email, BigDecimal amount) {
        if (orderId == null || email == null) return -3;
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return -4;
        if (walletJdbcService.hasRefundForOrder(orderId)) return -2;
        return jdbcTemplate.execute(
                call("{ call pkg_customer_refund.request_refund(?, ?, ?) }", cs -> {
                    cs.setLong(1, orderId);
                    cs.setString(2, email);
                    cs.registerOutParameter(3, java.sql.Types.NUMERIC);
                }),
                (CallableStatementCallback<Integer>) cs -> {
                    cs.execute();
                    return cs.getInt(3);
                }
        );
    }

    /**
     * Manažer schválí refund – provede refund a odstraní příznak.
     * @return 0 ok, -1 nic k refundu, -2 už vráceno, -3 nenalezeno, -5 chybí platba
     */
    public int approveRefund(Long orderId) {
        if (orderId == null) return -3;
        if (walletJdbcService.hasRefundForOrder(orderId)) return -2;
        return jdbcTemplate.execute(
                call("{ call pkg_customer_refund.approve_refund(?, ?) }", cs -> {
                    cs.setLong(1, orderId);
                    cs.registerOutParameter(2, java.sql.Types.NUMERIC);
                }),
                (CallableStatementCallback<Integer>) cs -> {
                    cs.execute();
                    return cs.getInt(2);
                }
        );
    }

    public int rejectRefund(Long orderId) {
        if (orderId == null) return -3;
        return jdbcTemplate.execute(
                call("{ call pkg_customer_refund.reject_refund(?, ?) }", cs -> {
                    cs.setLong(1, orderId);
                    cs.registerOutParameter(2, java.sql.Types.NUMERIC);
                }),
                (CallableStatementCallback<Integer>) cs -> {
                    cs.execute();
                    return cs.getInt(2);
                }
        );
    }

    private void restockItems(Long orderId) {
        if (orderId == null) {
            return;
        }
        jdbcTemplate.execute(
                call("{ call proc_restock_customer_items(?) }", cs -> cs.setLong(1, orderId)),
                (CallableStatementCallback<Void>) cs -> {
                    cs.execute();
                    return null;
                }
        );
    }

    private boolean isPendingRefund(String note) {
        return note != null && note.contains(REFUND_MARK);
    }

    private boolean isRefundRejected(String note) {
        return note != null && note.contains(REFUND_DENIED_MARK);
    }

    private String stripRefundMark(String note) {
        if (note == null) return null;
        String cleaned = note
                .replace(REFUND_MARK, "")
                .replace(REFUND_DENIED_MARK, "")
                .replaceAll("\\s{2,}", " ")
                .trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private void clearRefundMark(Long orderId, String note) {
        String cleaned = stripRefundMark(note);
        jdbcTemplate.update("UPDATE OBJEDNAVKA SET POZNAMKA = ? WHERE ID_Objednavka = ?", cleaned, orderId);
    }

    private void autoRefundIfNeeded(Long orderId) {
        try {
            if (orderId == null) return;
            if (walletJdbcService.hasRefundForOrder(orderId)) return;
            PaymentInfo payment = fetchPayment(orderId);
            if (payment == null || payment.amount() == null || payment.ucetId() == null) return;
            if (payment.amount().compareTo(BigDecimal.ZERO) <= 0) return;
            walletJdbcService.refundOrder(payment.ucetId(), orderId, payment.amount());
        } catch (Exception ignored) {
            // Nechceme blokovat hlavní flow; případný refund lze řešit ručně.
        }
    }

    private PaymentInfo fetchPayment(Long orderId) {
        return jdbcTemplate.query(
                """
                SELECT p.ID_Platba AS id, p.CASTKA AS amount, uo.ID_Ucet AS ucet_id
                  FROM PLATBA p
                  JOIN OBJEDNAVKA o ON o.ID_Objednavka = p.ID_Objednavka
                  JOIN UCET uo ON uo.ID_Uzivatel = o.ID_Uzivatel
                 WHERE p.ID_Objednavka = ?
                """,
                ps -> ps.setLong(1, orderId),
                rs -> rs.next() ? new PaymentInfo(rs.getLong("id"), rs.getBigDecimal("amount"), rs.getLong("ucet_id")) : null
        );
    }

    private record PaymentInfo(Long id, BigDecimal amount, Long ucetId) {}

    private List<OrderRow> fetchOrdersFromCursor(String sql, SqlConsumer configurer, int outIndex) {
        return jdbcTemplate.execute(
                call(sql, configurer),
                (CallableStatementCallback<List<OrderRow>>) cs -> {
                    cs.execute();
                    List<OrderRow> list = new java.util.ArrayList<>();
                    try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                        int rowNum = 0;
                        RowMapper<OrderRow> mapper = new OrderRowMapper();
                        while (rs.next()) {
                            OrderRow row = mapper.mapRow(rs, rowNum++);
                            if (row != null && row.id != null) {
                                list.add(row);
                            }
                        }
                    }
                    return list;
                }
        );
    }

    private CallableStatementCreator call(String sql, SqlConsumer configurer) {
        return (Connection con) -> {
            CallableStatement cs = con.prepareCall(sql);
            try {
                configurer.accept(cs);
            } catch (SQLException e) {
                throw new RuntimeException(e);
            }
            return cs;
        };
    }

    @FunctionalInterface
    private interface SqlConsumer {
        void accept(CallableStatement cs) throws SQLException;
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
                        row.handlerName,
                        row.createdAt,
                        row.note,
                        row.items,
                        computeTotal(row.items),
                        normalizeCislo(row),
                        row.refunded,
                        row.pendingRefund,
                        row.refundRejected
                ))
                .toList();
    }

    private BigDecimal computeTotal(List<CustomerOrderResponse.Item> items) {
        return items.stream()
                .map(it -> it.price().multiply(BigDecimal.valueOf(it.qty())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private String normalizeCislo(OrderRow row) {
        if (row == null || row.cislo == null) {
            return null;
        }
        return row.cislo.isBlank() ? null : row.cislo;
    }

    private static class OrderRow {
        Long id;
        Integer statusId;
        String statusName;
        Long superId;
        String superName;
        String ownerEmail;
        String handlerEmail;
        String handlerName;
        String createdAt;
        String note;
        String cislo;
        boolean refunded;
        boolean pendingRefund;
        boolean refundRejected;
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
            row.handlerEmail = getString(rs, "HANDLER_EMAIL", "OPERATOR_EMAIL", "ZAMESTNANEC_EMAIL", "OBSLUHA_EMAIL");
            String handlerFirst = getString(rs, "HANDLER_FIRSTNAME", "HANDLER_JMENO", "OBSLUHA_JMENO");
            String handlerLast = getString(rs, "HANDLER_LASTNAME", "HANDLER_PRIJMENI", "OBSLUHA_PRIJMENI");
            row.handlerName = buildName(handlerFirst, handlerLast);
            Timestamp ts = getTimestamp(rs, "DATUM", "CREATED_AT", "CREATED");
            row.createdAt = ts != null ? FORMATTER.format(ts.toInstant()) : "";
            row.cislo = getString(rs, "CISLO");
            String rawNote = getString(rs, "POZNAMKA", "NOTE");
            row.pendingRefund = isPendingRefund(rawNote);
            row.refundRejected = isRefundRejected(rawNote);
            row.note = stripRefundMark(rawNote);
            row.refunded = walletJdbcService.hasRefundForOrder(row.id);
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

    private String buildName(String first, String last) {
        String f = first != null ? first.trim() : "";
        String l = last != null ? last.trim() : "";
        String joined = (f + " " + l).trim();
        return joined.isEmpty() ? null : joined;
    }
}

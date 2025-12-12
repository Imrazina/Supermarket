package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.SupplierOrderResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SupplierOrderService {

    private final JdbcTemplate jdbcTemplate;
    private final UserJdbcService userJdbcService;
    private final WalletJdbcService walletJdbcService;
    private static final BigDecimal SUPPLIER_SHARE = BigDecimal.valueOf(0.7);

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
            .withLocale(Locale.forLanguageTag("cs-CZ"))
            .withZone(ZoneId.systemDefault());

    public Long resolveUserId(String email) {
        var u = userJdbcService.findByEmail(email);
        return u != null ? u.getIdUzivatel() : null;
    }

    public List<SupplierOrderResponse> listFreeOrders() {
        String sql = """
                SELECT o.ID_Objednavka, o.CISLO, o.ID_Status, s.NAZEV AS status_nazev,
                       o.ID_Supermarket, sp.NAZEV AS super_nazev,
                       o.ID_Uzivatel AS owner_id, u.EMAIL AS owner_email,
                       o.DATUM, o.POZNAMKA
                  FROM OBJEDNAVKA o
                  JOIN STATUS s ON s.ID_STATUS = o.ID_STATUS
                  JOIN SUPERMARKET sp ON sp.ID_Supermarket = o.ID_Supermarket
                  JOIN UZIVATEL u ON u.ID_Uzivatel = o.ID_Uzivatel
                  JOIN APP_ROLE r ON r.ID_Role = u.ID_Role
                 WHERE o.TYP_OBJEDNAVKA = 'DODAVATEL'
                   AND o.ID_Status IN (1,2,3,4)
                   AND UPPER(r.NAZEV) = 'ADMIN'
                 ORDER BY o.DATUM DESC, o.ID_Objednavka DESC
                """;
        List<OrderRow> orders = jdbcTemplate.query(sql, new OrderRowMapper());
        return enrichWithItems(orders);
    }

    public List<SupplierOrderResponse> listOrdersByOwner(Long userId) {
        String sql = """
                SELECT o.ID_Objednavka, o.CISLO, o.ID_Status, s.NAZEV AS status_nazev,
                       o.ID_Supermarket, sp.NAZEV AS super_nazev,
                       o.ID_Uzivatel AS owner_id, u.EMAIL AS owner_email,
                       o.DATUM, o.POZNAMKA
                  FROM OBJEDNAVKA o
                  JOIN STATUS s ON s.ID_STATUS = o.ID_STATUS
                  JOIN SUPERMARKET sp ON sp.ID_Supermarket = o.ID_Supermarket
                  LEFT JOIN UZIVATEL u ON u.ID_Uzivatel = o.ID_Uzivatel
                 WHERE o.TYP_OBJEDNAVKA = 'DODAVATEL'
                   AND o.ID_Status IN (1,2,3,4,5,6)
                   AND o.ID_Uzivatel = ?
                 ORDER BY o.DATUM DESC, o.ID_Objednavka DESC
                """;
        List<OrderRow> orders = jdbcTemplate.query(sql, new OrderRowMapper(), userId);
        return enrichWithItems(orders);
    }

    public int claimOrder(Long orderId, Long userId) {
        return jdbcTemplate.execute(
                (org.springframework.jdbc.core.CallableStatementCreator) con -> {
                    var cs = con.prepareCall("{ call proc_claim_supplier_order(?, ?, ?) }");
                    cs.setLong(1, orderId);
                    cs.setLong(2, userId);
                    cs.registerOutParameter(3, java.sql.Types.NUMERIC);
                    return cs;
                },
                (org.springframework.jdbc.core.CallableStatementCallback<Integer>) cs -> {
                    cs.execute();
                    return cs.getInt(3);
                }
        );
    }

    public StatusChangeResult changeStatus(Long orderId, Long userId, Integer newStatus) {
        if (newStatus != null && newStatus == 5) {
            walletJdbcService.ensureAccountForUser(userId);
        }
        return jdbcTemplate.execute(
                (org.springframework.jdbc.core.CallableStatementCreator) con -> {
                    var cs = con.prepareCall("{ call proc_supplier_set_status(?, ?, ?, ?, ?, ?) }");
                    cs.setLong(1, orderId);
                    cs.setLong(2, userId);
                    cs.setInt(3, newStatus);
                    cs.registerOutParameter(4, java.sql.Types.NUMERIC); // code
                    cs.registerOutParameter(5, java.sql.Types.NUMERIC); // reward
                    cs.registerOutParameter(6, java.sql.Types.NUMERIC); // balance
                    return cs;
                },
                (org.springframework.jdbc.core.CallableStatementCallback<StatusChangeResult>) cs -> {
                    cs.execute();
                    int code = cs.getInt(4);
                    BigDecimal reward = cs.getBigDecimal(5);
                    BigDecimal balance = cs.getBigDecimal(6);
                    return new StatusChangeResult(code, reward, balance);
                }
        );
    }

    public record StatusChangeResult(int code, BigDecimal reward, BigDecimal balance) {}

    private List<SupplierOrderResponse> enrichWithItems(List<OrderRow> orders) {
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
                row.items.add(new SupplierOrderResponse.Item(
                        rs.getLong("ID_Zbozi"),
                        rs.getString("NAZEV"),
                        rs.getInt("POCET"),
                        rs.getBigDecimal("CENA")
                ));
            }
        });
        return orders.stream()
                .map(row -> new SupplierOrderResponse(
                        row.id,
                        normalizeCislo(row.cislo),
                        row.statusName,
                        row.statusId,
                        row.superName,
                        row.superId,
                        row.ownerEmail,
                        row.createdAt,
                        row.note,
                        row.items,
                        estimateReward(row.items)
                ))
                .toList();
    }

    private BigDecimal estimateReward(List<SupplierOrderResponse.Item> items) {
        BigDecimal total = items.stream()
                .map(it -> it.price().multiply(BigDecimal.valueOf(it.qty())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.multiply(SUPPLIER_SHARE);
    }

    private String normalizeCislo(String cislo) {
        if (cislo == null) {
            return null;
        }
        return cislo.isBlank() ? null : cislo;
    }

    private static class OrderRow {
        Long id;
        String cislo;
        Integer statusId;
        String statusName;
        Long superId;
        String superName;
        String ownerEmail;
        String createdAt;
        String note;
        List<SupplierOrderResponse.Item> items = new java.util.ArrayList<>();
    }

    private class OrderRowMapper implements RowMapper<OrderRow> {
        @Override
        public OrderRow mapRow(ResultSet rs, int rowNum) throws SQLException {
            OrderRow row = new OrderRow();
            row.id = rs.getLong("ID_Objednavka");
            row.cislo = rs.getString("CISLO");
            row.statusId = rs.getInt("ID_Status");
            row.statusName = rs.getString("status_nazev");
            row.superId = rs.getLong("ID_Supermarket");
            row.superName = rs.getString("super_nazev");
            row.ownerEmail = rs.getString("owner_email");
            Timestamp ts = rs.getTimestamp("DATUM");
            row.createdAt = ts != null ? FORMATTER.format(ts.toInstant()) : "";
            row.note = rs.getString("POZNAMKA");
            return row;
        }
    }
}

package dreamteam.com.supermarket.repository;

import lombok.RequiredArgsConstructor;
import oracle.jdbc.OracleTypes;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
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

    public Long saveOrder(Long id,
                          LocalDateTime datum,
                          Long statusId,
                          Long userId,
                          Long supermarketId,
                          String note,
                          String typ) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_objednavka.save_objednavka(?, ?, ?, ?, ?, ?, ?, ?) }");
            if (id != null) {
                cs.setLong(1, id);
            } else {
                cs.setNull(1, Types.NUMERIC);
            }
            cs.setTimestamp(2, Timestamp.valueOf(datum != null ? datum : LocalDateTime.now()));
            if (statusId != null) {
                cs.setLong(3, statusId);
            } else {
                cs.setNull(3, Types.NUMERIC);
            }
            if (userId != null) {
                cs.setLong(4, userId);
            } else {
                cs.setNull(4, Types.NUMERIC);
            }
            if (supermarketId != null) {
                cs.setLong(5, supermarketId);
            } else {
                cs.setNull(5, Types.NUMERIC);
            }
            if (note != null && !note.isBlank()) {
                cs.setString(6, note);
            } else {
                cs.setNull(6, Types.CLOB);
            }
            cs.setString(7, typ != null && !typ.isBlank() ? typ : "INTERNI");
            cs.registerOutParameter(8, Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<Long>) cs -> {
            cs.execute();
            return cs.getLong(8);
        });
    }

    public void deleteOrder(Long id) {
        if (id == null) {
            return;
        }
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_objednavka.delete_objednavka(?) }");
            cs.setLong(1, id);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    @Transactional
    public void deleteOrderCascade(Long id) {
        if (id == null) {
            return;
        }
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_objednavka.delete_objednavka_cascade(?) }");
            cs.setLong(1, id);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    /**
     * Updates only status for an existing order using the same stored procedure.
     * Other fields are preserved from current DB state.
     */
    public boolean updateStatus(Long orderId, Long statusId) {
        if (orderId == null || statusId == null) {
            return false;
        }
        OrderRow existing = getOrder(orderId);
        if (existing == null) {
            return false;
        }
        Long newId = saveOrder(
                existing.id(),
                existing.datum(),
                statusId,
                existing.uzivatelId(),
                existing.supermarketId(),
                existing.poznamka(),
                existing.typObjednavka()
        );
        return newId != null;
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
        String cislo = null;
        try {
            cislo = rs.getString("cislo");
        } catch (SQLException ignored) {
            // older package version without CISLO in cursor
        }
        Long obsluhaId = null;
        String obsluhaEmail = null;
        String obsluhaJmeno = null;
        String obsluhaPrijmeni = null;
        try {
            long rawId = rs.getLong("obsluha_id");
            if (!rs.wasNull()) {
                obsluhaId = rawId;
            }
            obsluhaEmail = rs.getString("obsluha_email");
            obsluhaJmeno = rs.getString("obsluha_jmeno");
            obsluhaPrijmeni = rs.getString("obsluha_prijmeni");
        } catch (SQLException ignored) {
            // starší balíček nemá informace o obsluze
        }
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
                rs.getString("typ_objednavka"),
                cislo,
                obsluhaId,
                obsluhaEmail,
                obsluhaJmeno,
                obsluhaPrijmeni
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
            String typObjednavka,
            String cislo,
            Long obsluhaId,
            String obsluhaEmail,
            String obsluhaJmeno,
            String obsluhaPrijmeni
    ) {}

    public record OrderItemRow(Long objednavkaId, Long zboziId, String zboziNazev, Integer pocet) {}

    public OrderDeleteInfo getDeleteInfo(Long id) {
        if (id == null) return null;
        return jdbcTemplate.execute(
                call("{ call pkg_objednavka.get_delete_info(?, ?) }", cs -> {
                    cs.setLong(1, id);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                (CallableStatementCallback<OrderDeleteInfo>) cs -> {
                    cs.execute();
                    try (ResultSet rs = (ResultSet) cs.getObject(2)) {
                        if (rs.next()) {
                            return new OrderDeleteInfo(
                                    rs.getLong("id"),
                                    rs.getString("cislo"),
                                    rs.getString("store"),
                                    rs.getLong("item_count"),
                                    rs.getLong("platba_count"),
                                    rs.getLong("hotovost_count"),
                                    rs.getLong("karta_count"),
                                    rs.getLong("pohyb_count")
                            );
                        }
                        return null;
                    }
                }
        );
    }

    public record OrderDeleteInfo(
            Long id,
            String cislo,
            String store,
            Long itemCount,
            Long platbaCount,
            Long hotovostCount,
            Long kartaCount,
            Long pohybCount
    ) {}
}

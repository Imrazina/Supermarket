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
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

@Repository
@RequiredArgsConstructor
public class MarketProcedureDao {

    private final JdbcTemplate jdbcTemplate;

    // --- SKLAD ---
    public List<SkladRow> listSklady() {
        return jdbcTemplate.execute(
                call("{ call pkg_sklad.list_sklady(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                extractSklady(1)
        );
    }

    public SkladRow getSklad(Long id) {
        if (id == null) return null;
        return jdbcTemplate.execute(
                call("{ call pkg_sklad.get_sklad(?, ?) }", cs -> {
                    cs.setLong(1, id);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractSingleSklad(2)
        );
    }

    public Long saveSklad(Long id, String nazev, Integer kapacita, String telefon, Long supermarketId) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_sklad.save_sklad(?, ?, ?, ?, ?, ?) }");
            if (id == null) {
                cs.setNull(1, Types.NUMERIC);
            } else {
                cs.setLong(1, id);
            }
            cs.setString(2, nazev);
            setNullableInteger(cs, 3, kapacita);
            cs.setString(4, telefon);
            setNullableLong(cs, 5, supermarketId);
            cs.registerOutParameter(6, Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<Long>) cs -> {
            cs.execute();
            long value = cs.getLong(6);
            return cs.wasNull() ? null : value;
        });
    }

    public void deleteSklad(Long id) {
        if (id == null) return;
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_sklad.delete_sklad(?) }");
            cs.setLong(1, id);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public SupermarketDeleteInfo getSupermarketDeleteInfo(Long id) {
        if (id == null) return null;
        return jdbcTemplate.execute(
                call("{ call pkg_supermarket.delete_info(?, ?) }", cs -> {
                    cs.setLong(1, id);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                (CallableStatementCallback<SupermarketDeleteInfo>) cs -> {
                    cs.execute();
                    try (ResultSet rs = (ResultSet) cs.getObject(2)) {
                        if (rs.next()) {
                            return new SupermarketDeleteInfo(
                                    rs.getString("nazev"),
                                    getNullableLong(rs, "sklad_cnt"),
                                    getNullableLong(rs, "zbozi_cnt"),
                                    getNullableLong(rs, "dodavatel_cnt")
                            );
                        }
                    }
                    return null;
                }
        );
    }

    public SkladDeleteInfo getSkladDeleteInfo(Long id) {
        if (id == null) return null;
        return jdbcTemplate.execute(
                call("{ call pkg_sklad.delete_info(?, ?) }", cs -> {
                    cs.setLong(1, id);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                (CallableStatementCallback<SkladDeleteInfo>) cs -> {
                    cs.execute();
                    try (ResultSet rs = (ResultSet) cs.getObject(2)) {
                        if (rs.next()) {
                            return new SkladDeleteInfo(
                                    rs.getString("nazev"),
                                    getNullableLong(rs, "zbozi_cnt"),
                                    getNullableLong(rs, "dodavatel_cnt")
                            );
                        }
                    }
                    return null;
                }
        );
    }

    // --- SUPERMARKET ---
    public List<SupermarketRow> listSupermarket() {
        return jdbcTemplate.execute(
                call("{ call pkg_supermarket.list_supermarket(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                extractSupermarkets(1)
        );
    }

    public SupermarketRow getSupermarket(Long id) {
        if (id == null) return null;
        return jdbcTemplate.execute(
                call("{ call pkg_supermarket.get_supermarket(?, ?) }", cs -> {
                    cs.setLong(1, id);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractSingleSupermarket(2)
        );
    }

    public Long saveSupermarket(
            Long id,
            String nazev,
            String telefon,
            String email,
            Long adresaId,
            String ulice,
            String cisloPopisne,
            String cisloOrientacni,
            String psc
    ) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_supermarket.save_supermarket(?, ?, ?, ?, ?, ?, ?, ?, ?, ?) }");
            if (id == null) {
                cs.setNull(1, Types.NUMERIC);
            } else {
                cs.setLong(1, id);
            }
            cs.setString(2, nazev);
            cs.setString(3, telefon);
            cs.setString(4, email);
            setNullableLong(cs, 5, adresaId);
            cs.setString(6, ulice);
            cs.setString(7, cisloPopisne);
            cs.setString(8, cisloOrientacni);
            cs.setString(9, psc);
            cs.registerOutParameter(10, Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<Long>) cs -> {
            cs.execute();
            long value = cs.getLong(10);
            return cs.wasNull() ? null : value;
        });
    }

    public void deleteSupermarket(Long id) {
        if (id == null) return;
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_supermarket.delete_supermarket(?) }");
            cs.setLong(1, id);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    // --- KATEGORIE ---
    public List<KategorieRow> listKategorie() {
        return jdbcTemplate.execute(
                call("{ call pkg_kategorie.list_kategorie(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                extractKategorie(1)
        );
    }

    public KategorieRow getKategorie(Long id) {
        if (id == null) return null;
        return jdbcTemplate.execute(
                call("{ call pkg_kategorie.get_kategorie(?, ?) }", cs -> {
                    cs.setLong(1, id);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractSingleKategorie(2)
        );
    }

    // --- STATUS ---
    public List<StatusRow> listStatus() {
        return jdbcTemplate.execute(
                call("{ call pkg_status.list_status(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                extractStatus(1)
        );
    }

    public StatusRow getStatus(Long id) {
        if (id == null) return null;
        return jdbcTemplate.execute(
                call("{ call pkg_status.get_status(?, ?) }", cs -> {
                    cs.setLong(1, id);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractSingleStatus(2)
        );
    }

    // --- ZBOZI ---
    public List<ZboziRow> listZbozi() {
        return jdbcTemplate.execute(
                call("{ call pkg_zbozi.list_zbozi(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                extractZbozi(1)
        );
    }

    public ZboziRow getZbozi(Long id) {
        if (id == null) return null;
        return jdbcTemplate.execute(
                call("{ call pkg_zbozi.get_zbozi(?, ?) }", cs -> {
                    cs.setLong(1, id);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractSingleZbozi(2)
        );
    }

    public Long saveZbozi(
            Long id,
            String nazev,
            String popis,
            BigDecimal cena,
            Integer mnozstvi,
            Integer minMnozstvi,
            Long kategorieId,
            Long skladId
    ) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_zbozi.save_zbozi(?, ?, ?, ?, ?, ?, ?, ?, ?) }");
            if (id == null) {
                cs.setNull(1, Types.NUMERIC);
            } else {
                cs.setLong(1, id);
            }
            cs.setString(2, nazev);
            cs.setString(3, popis);
            if (cena == null) {
                cs.setNull(4, Types.NUMERIC);
            } else {
                cs.setBigDecimal(4, cena);
            }
            setNullableInteger(cs, 5, mnozstvi);
            setNullableInteger(cs, 6, minMnozstvi);
            setNullableLong(cs, 7, kategorieId);
            setNullableLong(cs, 8, skladId);
            cs.registerOutParameter(9, Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<Long>) cs -> {
            cs.execute();
            long value = cs.getLong(9);
            return cs.wasNull() ? null : value;
        });
    }

    public void deleteZbozi(Long id) {
        if (id == null) return;
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_zbozi.delete_zbozi(?) }");
            cs.setLong(1, id);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    // --- CUSTOMER CATALOG ---
    public List<CustomerCatalogRow> listZboziBySupermarket(Long supermarketId, String q, Long categoryId) {
        if (supermarketId == null) {
            return List.of();
        }
        return jdbcTemplate.execute(
                call("{ call list_zbozi_by_supermarket(?, ?, ?, ?) }", cs -> {
                    cs.setLong(1, supermarketId);
                    if (q == null || q.isBlank()) {
                        cs.setNull(2, Types.VARCHAR);
                    } else {
                        cs.setString(2, q);
                    }
                    if (categoryId == null) {
                        cs.setNull(3, Types.NUMERIC);
                    } else {
                        cs.setLong(3, categoryId);
                    }
                    cs.registerOutParameter(4, OracleTypes.CURSOR);
                }),
                (CallableStatementCallback<List<CustomerCatalogRow>>) cs -> {
                    cs.execute();
                    List<CustomerCatalogRow> list = new ArrayList<>();
                    try (ResultSet rs = (ResultSet) cs.getObject(4)) {
                        while (rs.next()) {
                            list.add(mapCustomerCatalog(rs));
                        }
                    }
                    return list;
                }
        );
    }

    // --- ZBOZI_DODAVATEL ---
    public List<ZboziDodRow> listDodByZbozi(Long zboziId) {
        if (zboziId == null) {
            return List.of();
        }
        return jdbcTemplate.execute(
                call("{ call pkg_zbozi_dodavatel.list_by_zbozi(?, ?) }", cs -> {
                    cs.setLong(1, zboziId);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                (CallableStatementCallback<List<ZboziDodRow>>) cs -> {
                    cs.execute();
                    List<ZboziDodRow> list = new ArrayList<>();
                    try (ResultSet rs = (ResultSet) cs.getObject(2)) {
                        while (rs.next()) {
                            list.add(new ZboziDodRow(
                                    rs.getLong("zbozi_id"),
                                    rs.getLong("dodavatel_id"),
                                    rs.getString("dodavatel_firma")
                            ));
                        }
                    }
                    return list;
                }
        );
    }

    public List<ZboziDodRow> listZboziByDodavatel(Long dodId) {
        return jdbcTemplate.execute(
                call("{ call pkg_zbozi_dodavatel.list_by_dodavatel(?, ?) }", cs -> {
                    cs.setLong(1, dodId);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                (CallableStatementCallback<List<ZboziDodRow>>) cs -> {
                    cs.execute();
                    List<ZboziDodRow> list = new ArrayList<>();
                    try (ResultSet rs = (ResultSet) cs.getObject(2)) {
                        while (rs.next()) {
                            list.add(new ZboziDodRow(
                                    rs.getLong("zbozi_id"),
                                    rs.getLong("dodavatel_id"),
                                    null
                            ));
                        }
                    }
                    return list;
                }
        );
    }

    public void addDodavatelToZbozi(Long zboziId, Long dodId) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_zbozi_dodavatel.add_rel(?, ?) }");
            cs.setLong(1, zboziId);
            cs.setLong(2, dodId);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public void deleteDodavatelFromZbozi(Long zboziId, Long dodId) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_zbozi_dodavatel.delete_rel(?, ?) }");
            cs.setLong(1, zboziId);
            cs.setLong(2, dodId);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    // --- VIEW: V_SUPERMARKET_HEALTH ---
    public List<SupermarketHealthRow> listSupermarketHealth() {
        final String sql = """
                SELECT ID_SUPERMARKET,
                       SUPERMARKET_NAZEV,
                       MESTO,
                       ACTIVE_ORDERS,
                       AVG_CLOSE_HOURS,
                       CRITICAL_SKU,
                       TYDENNI_OBRAT
                  FROM V_SUPERMARKET_HEALTH
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new SupermarketHealthRow(
                getNullableLong(rs, "ID_SUPERMARKET"),
                rs.getString("SUPERMARKET_NAZEV"),
                rs.getString("MESTO"),
                getNullableLong(rs, "ACTIVE_ORDERS"),
                rs.getObject("AVG_CLOSE_HOURS") != null ? rs.getDouble("AVG_CLOSE_HOURS") : null,
                getNullableLong(rs, "CRITICAL_SKU"),
                rs.getObject("TYDENNI_OBRAT") != null ? rs.getDouble("TYDENNI_OBRAT") : null
        ));
    }

    // --- VIEW: V_WEEKLY_DEMAND (orders by day, last 7 days, all supermarkets) ---
    public List<WeeklyDemandRow> listWeeklyDemand() {
        final String sql = """
                SELECT DEN_LABEL,
                       DEN_ORDER,
                       POCET
                  FROM V_WEEKLY_DEMAND
                ORDER BY DEN_ORDER
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new WeeklyDemandRow(
                rs.getString("DEN_LABEL"),
                rs.getObject("POCET") != null ? rs.getLong("POCET") : 0L
        ));
    }

    // --- VIEW: V_WEEKLY_DEMAND_STORE (orders by day per supermarket, last 7 days) ---
    public List<WeeklyDemandStoreRow> listWeeklyDemandByStore() {
        final String sql = """
                SELECT ID_SUPERMARKET,
                       SUPERMARKET_NAZEV,
                       DEN_LABEL,
                       DEN_ORDER,
                       POCET
                  FROM V_WEEKLY_DEMAND_STORE
                ORDER BY ID_SUPERMARKET, DEN_ORDER
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new WeeklyDemandStoreRow(
                getNullableLong(rs, "ID_SUPERMARKET"),
                rs.getString("SUPERMARKET_NAZEV"),
                rs.getString("DEN_LABEL"),
                rs.getObject("POCET") != null ? rs.getLong("POCET") : 0L
        ));
    }

    // --- VIEW: V_WAREHOUSE_LOAD (capacity/usage per warehouse) ---
    public List<WarehouseLoadRow> listWarehouseLoad() {
        final String sql = """
                SELECT ID_SKLAD,
                       SKLAD_NAZEV,
                       KAPACITA,
                       OBSAZENO,
                       PROCENTO,
                       SUPERMARKET_ID,
                       SUPERMARKET_NAZEV
                  FROM V_WAREHOUSE_LOAD
                ORDER BY ID_SKLAD
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new WarehouseLoadRow(
                rs.getLong("ID_SKLAD"),
                rs.getString("SKLAD_NAZEV"),
                getNullableInt(rs, "KAPACITA"),
                getNullableLong(rs, "OBSAZENO"),
                rs.getObject("PROCENTO") != null ? rs.getDouble("PROCENTO") : null,
                getNullableLong(rs, "SUPERMARKET_ID"),
                rs.getString("SUPERMARKET_NAZEV")
        ));
    }

    // --- VIEW: V_RISK_STOCK (low stock items) ---
    public List<RiskStockRow> listRiskStock() {
        final String sql = """
                SELECT NAZEV,
                       MNOZSTVI,
                       MINMNOZSTVI,
                       SKLAD_NAZEV,
                       SUPERMARKET_NAZEV
                  FROM V_RISK_STOCK
                ORDER BY MNOZSTVI
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new RiskStockRow(
                rs.getString("NAZEV"),
                getNullableLong(rs, "MNOZSTVI"),
                getNullableLong(rs, "MINMNOZSTVI"),
                rs.getString("SKLAD_NAZEV"),
                rs.getString("SUPERMARKET_NAZEV")
        ));
    }

    // --- extractors ---
    private CallableStatementCreator call(String sql, SqlConfigurer configurer) {
        return (Connection con) -> {
            CallableStatement cs = con.prepareCall(sql);
            configurer.accept(cs);
            return cs;
        };
    }

    private CallableStatementCallback<List<SkladRow>> extractSklady(int outIndex) {
        return (CallableStatementCallback<List<SkladRow>>) cs -> {
            cs.execute();
            List<SkladRow> list = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                while (rs.next()) {
                    list.add(mapSklad(rs));
                }
            }
            return list;
        };
    }

    private CallableStatementCallback<SkladRow> extractSingleSklad(int outIndex) {
        return (CallableStatementCallback<SkladRow>) cs -> {
            cs.execute();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                if (rs.next()) {
                    return mapSklad(rs);
                }
            }
            return null;
        };
    }

    private SkladRow mapSklad(ResultSet rs) throws java.sql.SQLException {
        Integer kapacita = rs.getObject("kapacita") != null ? rs.getInt("kapacita") : null;
        Long supermarketId = rs.getObject("supermarket_id") != null ? rs.getLong("supermarket_id") : null;
        return new SkladRow(
                rs.getLong("id"),
                rs.getString("nazev"),
                kapacita,
                rs.getString("telefon"),
                supermarketId,
                rs.getString("supermarket_nazev")
        );
    }

    private CallableStatementCallback<List<SupermarketRow>> extractSupermarkets(int outIndex) {
        return (CallableStatementCallback<List<SupermarketRow>>) cs -> {
            cs.execute();
            List<SupermarketRow> list = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                while (rs.next()) {
                    list.add(mapSupermarket(rs));
                }
            }
            return list;
        };
    }

    private CallableStatementCallback<SupermarketRow> extractSingleSupermarket(int outIndex) {
        return (CallableStatementCallback<SupermarketRow>) cs -> {
            cs.execute();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                if (rs.next()) {
                    return mapSupermarket(rs);
                }
            }
            return null;
        };
    }

    private SupermarketRow mapSupermarket(ResultSet rs) throws java.sql.SQLException {
        Long adresaId = rs.getObject("adresa_id") != null ? rs.getLong("adresa_id") : null;
        String adresaText = hasColumn(rs, "adresa_text") ? rs.getString("adresa_text") : null;
        String adresaUlice = hasColumn(rs, "adresa_ulice") ? rs.getString("adresa_ulice") : null;
        String adresaCpop = hasColumn(rs, "adresa_cpop") ? rs.getString("adresa_cpop") : null;
        String adresaCorient = hasColumn(rs, "adresa_corient") ? rs.getString("adresa_corient") : null;
        String adresaPsc = hasColumn(rs, "adresa_psc") ? rs.getString("adresa_psc") : null;
        String adresaMesto = hasColumn(rs, "adresa_mesto") ? rs.getString("adresa_mesto") : null;
        return new SupermarketRow(
                rs.getLong("id"),
                rs.getString("nazev"),
                rs.getString("telefon"),
                rs.getString("email"),
                adresaId,
                adresaText,
                adresaUlice,
                adresaCpop,
                adresaCorient,
                adresaPsc,
                adresaMesto
        );
    }

    private CallableStatementCallback<List<KategorieRow>> extractKategorie(int outIndex) {
        return (CallableStatementCallback<List<KategorieRow>>) cs -> {
            cs.execute();
            List<KategorieRow> list = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                while (rs.next()) {
                    list.add(new KategorieRow(
                            rs.getLong("id"),
                            rs.getString("nazev"),
                            rs.getString("popis")
                    ));
                }
            }
            return list;
        };
    }

    private CallableStatementCallback<KategorieRow> extractSingleKategorie(int outIndex) {
        return (CallableStatementCallback<KategorieRow>) cs -> {
            cs.execute();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                if (rs.next()) {
                    return new KategorieRow(
                            rs.getLong("id"),
                            rs.getString("nazev"),
                            rs.getString("popis")
                    );
                }
            }
            return null;
        };
    }

    private CallableStatementCallback<List<ZboziRow>> extractZbozi(int outIndex) {
        return (CallableStatementCallback<List<ZboziRow>>) cs -> {
            cs.execute();
            List<ZboziRow> list = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                while (rs.next()) {
                    list.add(mapZbozi(rs));
                }
            }
            return list;
        };
    }

    private CallableStatementCallback<ZboziRow> extractSingleZbozi(int outIndex) {
        return (CallableStatementCallback<ZboziRow>) cs -> {
            cs.execute();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                if (rs.next()) {
                    return mapZbozi(rs);
                }
            }
            return null;
        };
    }

    private ZboziRow mapZbozi(ResultSet rs) throws java.sql.SQLException {
        BigDecimal cena = rs.getBigDecimal("cena");
        return new ZboziRow(
                rs.getLong("id"),
                rs.getString("nazev"),
                rs.getString("popis"),
                cena != null ? cena : BigDecimal.ZERO,
                rs.getInt("mnozstvi"),
                rs.getInt("min_mnozstvi"),
                rs.getLong("kategorie_id"),
                rs.getString("kategorie_nazev"),
                rs.getLong("sklad_id"),
                rs.getString("sklad_nazev"),
                rs.getLong("supermarket_id"),
                rs.getString("supermarket_nazev"),
                rs.getInt("dodavatel_cnt"),
                rs.getString("dodavatel_nazvy")
        );
    }

    private CallableStatementCallback<List<StatusRow>> extractStatus(int outIndex) {
        return (CallableStatementCallback<List<StatusRow>>) cs -> {
            cs.execute();
            List<StatusRow> list = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                while (rs.next()) {
                    list.add(new StatusRow(
                            rs.getLong("id"),
                            rs.getString("nazev")
                    ));
                }
            }
            return list;
        };
    }

    private CallableStatementCallback<StatusRow> extractSingleStatus(int outIndex) {
        return (CallableStatementCallback<StatusRow>) cs -> {
            cs.execute();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                if (rs.next()) {
                    return new StatusRow(
                            rs.getLong("id"),
                            rs.getString("nazev")
                    );
                }
            }
            return null;
        };
    }

    @FunctionalInterface
    private interface SqlConfigurer {
        void accept(CallableStatement cs) throws java.sql.SQLException;
    }

    private void setNullableLong(CallableStatement cs, int index, Long value) throws java.sql.SQLException {
        if (value == null) {
            cs.setNull(index, Types.NUMERIC);
        } else {
            cs.setLong(index, value);
        }
    }

    private void setNullableInteger(CallableStatement cs, int index, Integer value) throws java.sql.SQLException {
        if (value == null) {
            cs.setNull(index, Types.NUMERIC);
        } else {
            cs.setInt(index, value);
        }
    }

    private Long getNullableLong(ResultSet rs, String columnLabel) throws java.sql.SQLException {
        Object obj = rs.getObject(columnLabel);
        return obj == null ? null : ((Number) obj).longValue();
    }

    private boolean hasColumn(ResultSet rs, String columnLabel) throws java.sql.SQLException {
        var meta = rs.getMetaData();
        int columnCount = meta.getColumnCount();
        for (int i = 1; i <= columnCount; i++) {
            if (columnLabel.equalsIgnoreCase(meta.getColumnLabel(i))) {
                return true;
            }
        }
        return false;
    }

    public record SkladRow(Long id, String nazev, Integer kapacita, String telefon, Long supermarketId, String supermarketNazev) {}
    public record SupermarketRow(
            Long id,
            String nazev,
            String telefon,
            String email,
            Long adresaId,
            String adresaText,
            String adresaUlice,
            String adresaCpop,
            String adresaCorient,
            String adresaPsc,
            String adresaMesto
    ) {}
    public record KategorieRow(Long id, String nazev, String popis) {}
    public record ZboziRow(
            Long id,
            String nazev,
            String popis,
            BigDecimal cena,
            Integer mnozstvi,
            Integer minMnozstvi,
            Long kategorieId,
            String kategorieNazev,
            Long skladId,
            String skladNazev,
            Long supermarketId,
            String supermarketNazev,
            Integer dodavatelCnt,
            String dodavatelNazvy
    ) {}
    public record StatusRow(Long id, String nazev) {}
    public record ZboziDodRow(Long zboziId, Long dodavatelId, String dodavatelFirma) {}
    public record SupermarketDeleteInfo(String nazev, Long skladCount, Long zboziCount, Long dodavatelCount) {}
    public record SkladDeleteInfo(String nazev, Long zboziCount, Long dodavatelCount) {}
    public record WarehouseLoadRow(
            Long id,
            String skladNazev,
            Integer kapacita,
            Long obsazeno,
            Double procento,
            Long supermarketId,
            String supermarketNazev
    ) {}
    public record RiskStockRow(
            String nazev,
            Long mnozstvi,
            Long minMnozstvi,
            String skladNazev,
            String supermarketNazev
    ) {}

    public record CustomerCatalogRow(
            Long id,
            String nazev,
            String popis,
            BigDecimal cena,
            Integer mnozstvi,
            Integer minMnozstvi,
            Long kategorieId,
            String kategorieNazev,
            Long skladId,
            String skladNazev,
            Long supermarketId,
            String supermarketNazev
    ) {}

    public record SupermarketHealthRow(
            Long id,
            String nazev,
            String mesto,
            Long activeOrders,
            Double avgCloseHours,
            Long criticalSku,
            Double tydenniObrat
    ) {}

    public record WeeklyDemandRow(
            String label,
            Long value
    ) {}

    public record WeeklyDemandStoreRow(
            Long storeId,
            String storeName,
            String label,
            Long value
    ) {}

    private CustomerCatalogRow mapCustomerCatalog(ResultSet rs) throws java.sql.SQLException {
        String priceCol = findColumn(rs, "cena", "price");
        BigDecimal cena = priceCol != null ? rs.getBigDecimal(priceCol) : BigDecimal.ZERO;
        return new CustomerCatalogRow(
                getNullableLong(rs, findColumn(rs, "id", "zbozi_id", "id_zbozi")),
                getNullableString(rs, findColumn(rs, "nazev", "name")),
                getNullableString(rs, findColumn(rs, "popis", "description")),
                cena != null ? cena : BigDecimal.ZERO,
                getNullableInt(rs, findColumn(rs, "mnozstvi", "qty_available")),
                getNullableInt(rs, findColumn(rs, "min_mnozstvi", "qty_min")),
                getNullableLong(rs, findColumn(rs, "kategorie_id", "category_id")),
                getNullableString(rs, findColumn(rs, "kategorie_nazev", "category")),
                getNullableLong(rs, findColumn(rs, "sklad_id", "skladid", "warehouse_id")),
                getNullableString(rs, findColumn(rs, "sklad_nazev", "skladname", "warehouse_name")),
                getNullableLong(rs, findColumn(rs, "supermarket_id", "store_id")),
                getNullableString(rs, findColumn(rs, "supermarket_nazev", "store_name"))
        );
    }

    private String findColumn(ResultSet rs, String... candidates) throws java.sql.SQLException {
        for (String c : candidates) {
            if (c != null && hasColumn(rs, c)) {
                return c;
            }
        }
        return null;
    }

    private Integer getNullableInt(ResultSet rs, String columnLabel) throws java.sql.SQLException {
        if (columnLabel == null) {
            return null;
        }
        Object obj = rs.getObject(columnLabel);
        return obj == null ? null : ((Number) obj).intValue();
    }

    private String getNullableString(ResultSet rs, String columnLabel) throws java.sql.SQLException {
        if (columnLabel == null) {
            return null;
        }
        return rs.getString(columnLabel);
    }
}

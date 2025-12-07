package dreamteam.com.supermarket.repository;

import lombok.RequiredArgsConstructor;
import oracle.jdbc.OracleTypes;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;

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
        return new SkladRow(
                rs.getLong("id"),
                rs.getString("nazev"),
                rs.getInt("kapacita"),
                rs.getString("telefon"),
                rs.getLong("supermarket_id")
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
        return new SupermarketRow(
                rs.getLong("id"),
                rs.getString("nazev"),
                rs.getString("telefon"),
                rs.getString("email"),
                rs.getLong("adresa_id")
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

    public record SkladRow(Long id, String nazev, Integer kapacita, String telefon, Long supermarketId) {}
    public record SupermarketRow(Long id, String nazev, String telefon, String email, Long adresaId) {}
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
}

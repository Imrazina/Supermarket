package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.CheckoutRequest;
import dreamteam.com.supermarket.controller.dto.CheckoutResponse;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.repository.MarketProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Checkout flow реализован только через собственные SQL/PL/SQL процедуры.
 * Никаких save()/persist() из JPA не используется.
 *
 * Použité balíky v BDD (Oracle):
 *  - pkg_objednavka.save_objednavka
 *  - pkg_objednavka_zbozi.add_item
 *  - pkg_zbozi.update_mnozstvi
 *  - pkg_platba.create_platba
 */
@Service
@RequiredArgsConstructor
public class CheckoutService {

    private final JdbcTemplate jdbcTemplate;
    private final MarketProcedureDao marketDao;
    private final ZakaznikJdbcService zakaznikJdbcService;
    private final WalletJdbcService walletJdbcService;

    @Transactional
    public CheckoutResponse createOrderWithPayment(Uzivatel user, CheckoutRequest request) {
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Kosik je prazdny.");
        }

        StatusRow status = fetchDefaultStatus();
        if (status == null) {
            throw new IllegalStateException("Chybi status objednavky.");
        }

        SupermarketRow supermarket = fetchDefaultSupermarket();
        if (supermarket == null) {
            throw new IllegalStateException("Chybi supermarket pro objednavku.");
        }

        boolean isCustomer = existsZakaznik(user.getIdUzivatel());
        // Checkout z „zakaznicke zony“ má vytvářet zákaznickou objednávku,
        // i když záznam v ZAKAZNIK zatím neexistuje (nechceme ztratit typ).
        String typObjednavka = "ZAKAZNIK";

        Long objednavkaId = createObjednavka(status.id(), user.getIdUzivatel(), supermarket.id(), request.note(), typObjednavka);

        BigDecimal total = BigDecimal.ZERO;
        List<CheckoutResponse.Line> responseLines = new ArrayList<>();

        for (CheckoutRequest.Item item : request.items()) {
            Long zboziId = parseSku(item.sku());
            ZboziRow zbozi = findZbozi(zboziId);
            if (zbozi == null) {
                throw new IllegalArgumentException("Zbozi " + item.sku() + " nenalezeno.");
            }

            int available = Optional.ofNullable(zbozi.mnozstvi()).orElse(0);
            if (item.qty() > available) {
                throw new IllegalArgumentException("Nedostatek zasob pro " + zbozi.nazev() + " (k dispozici " + available + ")");
            }

            updateZboziQty(zboziId, -item.qty());
            addObjednavkaZbozi(objednavkaId, zboziId, item.qty());

            BigDecimal linePrice = Optional.ofNullable(zbozi.cena()).orElse(BigDecimal.ZERO)
                    .multiply(BigDecimal.valueOf(item.qty()));
            total = total.add(linePrice);

            responseLines.add(new CheckoutResponse.Line(
                    item.sku(),
                    zbozi.nazev(),
                    item.qty(),
                    linePrice
            ));
        }

        String paymentType = resolvePaymentType(request.paymentType()); // H / K / U
        String cardNumber = "K".equalsIgnoreCase(paymentType)
                ? Optional.ofNullable(request.cardNumber()).orElse(null)
                : null;
        BigDecimal prijato = null;
        BigDecimal vraceno = null;
        if ("H".equalsIgnoreCase(paymentType)) {
            prijato = Optional.ofNullable(request.cashGiven()).orElse(total);
            vraceno = prijato.subtract(total).max(BigDecimal.ZERO);
        }

        Long platbaId;
        if ("U".equalsIgnoreCase(paymentType)) {
            Long ucetId = walletJdbcService.ensureAccountForUser(user.getIdUzivatel());
            WalletJdbcService.PayResult pay = walletJdbcService.payOrder(ucetId, objednavkaId, total);
            platbaId = pay.platbaId();
        } else {
            platbaId = createPlatba(objednavkaId, total, paymentType, cardNumber, prijato, vraceno);
        }

        CashbackResult cashback = null;
        if (isCustomer) {
            cashback = tryCashback(user.getIdUzivatel());
        }

        return new CheckoutResponse(
                objednavkaId,
                platbaId,
                total,
                prijato,
                vraceno,
                paymentType,
                responseLines,
                cashback != null ? cashback.cashback() : null,
                cashback != null ? cashback.turnover() : null,
                cashback != null ? cashback.balance() : null,
                cashback != null ? cashback.code() : null
        );
    }

    private StatusRow fetchDefaultStatus() {
        List<MarketProcedureDao.StatusRow> list = marketDao.listStatus();
        return list.isEmpty() ? null : new StatusRow(list.get(0).id(), list.get(0).nazev());
    }

    private SupermarketRow fetchDefaultSupermarket() {
        List<MarketProcedureDao.SupermarketRow> list = marketDao.listSupermarket();
        return list.isEmpty() ? null : new SupermarketRow(list.get(0).id(), list.get(0).nazev());
    }

    private boolean existsZakaznik(Long userId) {
        return zakaznikJdbcService.findById(userId) != null;
    }

    private ZboziRow findZbozi(Long id) {
        MarketProcedureDao.ZboziRow row = marketDao.getZbozi(id);
        if (row == null) return null;
        return new ZboziRow(
                row.id(),
                row.nazev(),
                row.cena(),
                row.mnozstvi(),
                row.minMnozstvi(),
                row.popis(),
                row.skladId(),
                row.kategorieId()
        );
    }

    private void updateZboziQty(Long zboziId, int delta) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_zbozi.update_mnozstvi(?, ?) }");
            cs.setLong(1, zboziId);
            cs.setInt(2, delta);
            cs.execute();
            return null;
        });
    }

    private void addObjednavkaZbozi(Long objednavkaId, Long zboziId, int qty) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_objednavka_zbozi.add_item(?, ?, ?) }");
            cs.setLong(1, objednavkaId);
            cs.setLong(2, zboziId);
            cs.setInt(3, qty);
            cs.execute();
            return null;
        });
    }

    private Long createObjednavka(Long statusId,
                                  Long userId,
                                  Long supermarketId,
                                  String note,
                                  String typObjednavka) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_objednavka.save_objednavka(?, ?, ?, ?, ?, ?, ?, ?) }");
            cs.setNull(1, java.sql.Types.NUMERIC); // p_id IN (nový záznam)
            cs.setTimestamp(2, new java.sql.Timestamp(System.currentTimeMillis())); // p_datum
            cs.setLong(3, statusId);
            cs.setLong(4, userId);
            cs.setLong(5, supermarketId);
            if (note != null && !note.isBlank()) {
                cs.setString(6, note);
            } else {
                cs.setNull(6, java.sql.Types.CLOB);
            }
            cs.setString(7, typObjednavka);
            cs.registerOutParameter(8, java.sql.Types.NUMERIC);
            cs.execute();
            return cs.getLong(8);
        });
    }

    private Long createPlatba(Long objednavkaId,
                              BigDecimal castka,
                              String paymentType,
                              String cisloKarty,
                              BigDecimal prijato,
                              BigDecimal vraceno) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_platba.create_platba(?, ?, ?, ?, ?, ?, ?, ?, ?) }");
            if (objednavkaId != null) cs.setLong(1, objednavkaId); else cs.setNull(1, java.sql.Types.NUMERIC);
            if (castka != null) cs.setBigDecimal(2, castka); else cs.setNull(2, java.sql.Types.NUMERIC);
            cs.setString(3, paymentType);
            cs.setNull(4, java.sql.Types.NUMERIC); // účet zatím nepoužíváme
            if (cisloKarty != null) cs.setString(5, cisloKarty); else cs.setNull(5, java.sql.Types.VARCHAR);
            if (prijato != null) cs.setBigDecimal(6, prijato); else cs.setNull(6, java.sql.Types.NUMERIC);
            if (vraceno != null) cs.setBigDecimal(7, vraceno); else cs.setNull(7, java.sql.Types.NUMERIC);
            cs.registerOutParameter(8, java.sql.Types.NUMERIC); // pohyb
            cs.registerOutParameter(9, java.sql.Types.NUMERIC); // platba
            cs.execute();
            return cs.getLong(9);
        });
    }

    private Long parseSku(String sku) {
        String normalized = sku.trim().toUpperCase(Locale.ROOT);
        if (normalized.startsWith("SKU-")) {
            normalized = normalized.substring(4);
        }
        return Long.parseLong(normalized);
    }

    private String resolvePaymentType(String type) {
        if (type == null) return "H";
        return switch (type.trim().toUpperCase(Locale.ROOT)) {
            case "CASH", "H", "HOTOVOST" -> "H";
            case "CARD", "K", "KARTA" -> "K";
            case "WALLET", "W", "U", "UCET" -> "U";
            default -> "H";
        };
    }

    private record ZboziRow(Long id, String nazev, BigDecimal cena, Integer mnozstvi,
                            Integer minMnozstvi, String popis, Long skladId, Long kategorieId) {}

    private record StatusRow(Long id, String nazev) {}

    private record SupermarketRow(Long id, String nazev) {}

    private record CashbackResult(int code, BigDecimal turnover, BigDecimal cashback, BigDecimal balance) {}

    private CashbackResult tryCashback(Long userId) {
        try {
            Long ucetId = walletJdbcService.ensureAccountForUser(userId);
            return jdbcTemplate.execute(
                    (org.springframework.jdbc.core.CallableStatementCreator) (Connection con) -> {
                        CallableStatement cs = con.prepareCall("{ ? = call fn_cashback_5orders(?, ?, ?, ?, ?, ?) }");
                        cs.registerOutParameter(1, java.sql.Types.NUMERIC); // return code
                        cs.setLong(2, userId);
                        cs.setInt(3, 5); // min orders
                        cs.setInt(4, 7); // cooldown days
                        cs.registerOutParameter(5, java.sql.Types.NUMERIC); // turnover
                        cs.registerOutParameter(6, java.sql.Types.NUMERIC); // cashback
                        cs.registerOutParameter(7, java.sql.Types.NUMERIC); // balance
                        return cs;
                    },
                    (org.springframework.jdbc.core.CallableStatementCallback<CashbackResult>) cs -> {
                        cs.execute();
                        int code = cs.getInt(1);
                        BigDecimal turnover = cs.getBigDecimal(5);
                        BigDecimal cashback = cs.getBigDecimal(6);
                        BigDecimal balance = cs.getBigDecimal(7);
                        return new CashbackResult(code, turnover, cashback, balance);
                    }
            );
        } catch (Exception ex) {
            // neblokuj checkout kvůli cashbacku
            return new CashbackResult(-99, null, null, null);
        }
    }
}

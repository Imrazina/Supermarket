package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.CheckoutRequest;
import dreamteam.com.supermarket.controller.dto.CheckoutResponse;
import dreamteam.com.supermarket.model.market.Objednavka;
import dreamteam.com.supermarket.model.market.ObjednavkaStatus;
import dreamteam.com.supermarket.model.market.Supermarket;
import dreamteam.com.supermarket.model.market.Zbozi;
import dreamteam.com.supermarket.model.payment.Platba;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.repository.MarketProcedureDao;
import dreamteam.com.supermarket.repository.OrderProcedureDao;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckoutService {

    private final OrderProcedureDao orderDao;
    private final MarketProcedureDao marketDao;
    private final JdbcTemplate jdbcTemplate;
    private final WalletJdbcService walletJdbcService;

    @Transactional
    public CheckoutResponse createOrderWithPayment(Uzivatel user, CheckoutRequest request) {
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Kosik je prazdny.");
        }

        CheckoutRequest.Item firstItem = request.items().get(0);
        Long firstZboziId = parseSku(firstItem.sku());
        var firstZboziRow = marketDao.getZbozi(firstZboziId);
        if (firstZboziRow == null) {
            throw new IllegalArgumentException("Zbozi " + firstItem.sku() + " nenalezeno.");
        }

        ObjednavkaStatus status = marketDao.listStatus().stream()
                .findFirst()
                .map(row -> new ObjednavkaStatus(row.id(), row.nazev()))
                .orElseThrow(() -> new IllegalStateException("Chybi status objednavky."));

        List<MarketProcedureDao.SupermarketRow> storeRows = marketDao.listSupermarket();
        Map<Long, MarketProcedureDao.SupermarketRow> storesById = storeRows.stream()
                .filter(r -> r.id() != null)
                .collect(Collectors.toMap(MarketProcedureDao.SupermarketRow::id, r -> r, (a, b) -> a));

        Supermarket supermarket = Optional.ofNullable(firstZboziRow.supermarketId())
                .map(storesById::get)
                .map(this::toSupermarket)
                .or(() -> storeRows.stream().findFirst().map(this::toSupermarket))
                .orElseThrow(() -> new IllegalStateException("Chybi supermarket pro objednavku."));

        boolean isCustomer = isCustomer(user.getIdUzivatel());
        String typObjednavka = isCustomer ? "ZAKAZNIK" : "INTERNI";

        Objednavka objednavka = Objednavka.builder()
                .datum(LocalDateTime.now())
                .status(status)
                .uzivatel(user)
                .supermarket(supermarket)
                .poznamka(request.note())
                .typObjednavka(typObjednavka)
                .build();
        Long objednavkaId = orderDao.saveOrder(
                null,
                objednavka.getDatum(),
                status.getIdStatus(),
                user.getIdUzivatel(),
                supermarket.getIdSupermarket(),
                request.note(),
                typObjednavka
        );
        objednavka.setIdObjednavka(objednavkaId);

        BigDecimal total = BigDecimal.ZERO;
        List<CheckoutResponse.Line> responseLines = new ArrayList<>();

        for (CheckoutRequest.Item item : request.items()) {
            Long zboziId = parseSku(item.sku());
            var zboziRow = marketDao.getZbozi(zboziId);
            if (zboziRow == null) {
                throw new IllegalArgumentException("Zbozi " + item.sku() + " nenalezeno.");
            }
            Zbozi zbozi = toZbozi(zboziRow);

            int dostupne = Optional.ofNullable(zbozi.getMnozstvi()).orElse(0);
            if (dostupne < item.qty()) {
                throw new IllegalArgumentException("Nedostatecne mnozstvi pro " + zbozi.getNazev());
            }
            zbozi.setMnozstvi(dostupne - item.qty());
            marketDao.saveZbozi(
                    zbozi.getIdZbozi(),
                    zbozi.getNazev(),
                    zbozi.getPopis(),
                    zbozi.getCena(),
                    zbozi.getMnozstvi(),
                    zbozi.getMinMnozstvi(),
                    zboziRow.kategorieId(),
                    zboziRow.skladId()
            );

            orderDao.addItem(objednavkaId, zbozi.getIdZbozi(), item.qty());
            BigDecimal linePrice = Optional.ofNullable(zbozi.getCena()).orElse(BigDecimal.ZERO)
                    .multiply(BigDecimal.valueOf(item.qty()));
            total = total.add(linePrice);
            responseLines.add(new CheckoutResponse.Line(item.sku(), zbozi.getNazev(), item.qty(), linePrice));
        }

        String paymentType = resolvePaymentType(request.paymentType()); // H / K / U
        String cardNumber = "K".equalsIgnoreCase(paymentType)
                ? Optional.ofNullable(request.cardNumber()).orElse(null)
                : null;

        BigDecimal prijato = null;
        BigDecimal vraceno = null;
        Long platbaId;

        if ("H".equalsIgnoreCase(paymentType)) {
            prijato = Optional.ofNullable(request.cashGiven()).orElse(total);
            if (prijato.compareTo(total) < 0) {
                throw new IllegalArgumentException("Prijata hotovost nesmi byt mensi nez castka k uhrade (" + total + ").");
            }
            vraceno = prijato.subtract(total).max(BigDecimal.ZERO);
            Platba platba = createPayment(objednavkaId, total, paymentType, cardNumber, prijato, vraceno);
            platbaId = platba.getIdPlatba();
        } else if ("K".equalsIgnoreCase(paymentType)) {
            Platba platba = createPayment(objednavkaId, total, paymentType, cardNumber, null, null);
            platbaId = platba.getIdPlatba();
        } else if ("U".equalsIgnoreCase(paymentType)) {
            Long ucetId = walletJdbcService.ensureAccountForUser(user.getIdUzivatel());
            WalletJdbcService.PayResult pay = walletJdbcService.payOrder(ucetId, objednavkaId, total);
            platbaId = pay.platbaId();
        } else {
            throw new IllegalArgumentException("Neznama platebni metoda.");
        }

        BigDecimal cashbackAmount = BigDecimal.ZERO;
        BigDecimal cashbackTurnover = BigDecimal.ZERO;
        BigDecimal walletBalance = BigDecimal.ZERO;
        Integer cashbackCode = null;

        try {
            Long ucetId = walletJdbcService.ensureAccountForUser(user.getIdUzivatel());
            walletBalance = Optional.ofNullable(walletJdbcService.findBalance(ucetId)).orElse(BigDecimal.ZERO);
            WalletJdbcService.CashbackResult cashback = walletJdbcService.applyCashback(user.getIdUzivatel());
            if (cashback != null) {
                cashbackCode = cashback.code();
                cashbackAmount = Optional.ofNullable(cashback.cashbackAmount()).orElse(BigDecimal.ZERO);
                cashbackTurnover = Optional.ofNullable(cashback.turnover()).orElse(BigDecimal.ZERO);
                if (cashback.balance() != null) {
                    walletBalance = cashback.balance();
                } else if (cashbackAmount.compareTo(BigDecimal.ZERO) > 0) {
                    walletBalance = walletBalance.add(cashbackAmount);
                }
                log.info("Cashback result user {}: code={}, amount={}, turnover={}, balance={}",
                        user.getIdUzivatel(), cashbackCode, cashbackAmount, cashbackTurnover, walletBalance);
            }
        } catch (Exception ex) {
            log.warn("Cashback calculation failed for user {}", user.getIdUzivatel(), ex);
            cashbackCode = -99;
        }

        BigDecimal prijatoForResponse = prijato;
        BigDecimal changeForResponse = vraceno;

        return new CheckoutResponse(
                objednavka.getIdObjednavka(),
                platbaId,
                total,
                prijatoForResponse,
                changeForResponse,
                paymentType,
                responseLines,
                cashbackAmount,
                cashbackTurnover,
                walletBalance,
                cashbackCode
        );
    }

    private Long parseSku(String sku) {
        if (sku == null) {
            throw new IllegalArgumentException("SKU je povinne.");
        }
        String normalized = sku.trim().toUpperCase(Locale.ROOT);
        if (normalized.startsWith("SKU-")) {
            normalized = normalized.substring(4);
        }
        try {
            return Long.parseLong(normalized);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Neplatne SKU: " + sku);
        }
    }

    private String resolvePaymentType(String type) {
        if (type == null) return "H";
        return switch (type.trim().toUpperCase(Locale.ROOT)) {
            case "CASH", "H", "HOTOVOST" -> "H"; // hotovost
            case "CARD", "K", "KARTA" -> "K";
            case "WALLET", "W", "U", "UCET" -> "U";
            default -> "H";
        };
    }

    private boolean isCustomer(Long userId) {
        if (userId == null) {
            return false;
        }
        Integer count = jdbcTemplate.query(
                "select count(*) from zakaznik where id_uzivatelu = ?",
                ps -> ps.setLong(1, userId),
                rs -> rs.next() ? rs.getInt(1) : 0
        );
        return count != null && count > 0;
    }

    private Zbozi toZbozi(MarketProcedureDao.ZboziRow row) {
        return Zbozi.builder()
                .idZbozi(row.id())
                .nazev(row.nazev())
                .popis(row.popis())
                .cena(row.cena())
                .mnozstvi(row.mnozstvi())
                .minMnozstvi(row.minMnozstvi())
                .build();
    }

    private Supermarket toSupermarket(MarketProcedureDao.SupermarketRow row) {
        Supermarket supermarket = new Supermarket();
        supermarket.setIdSupermarket(row.id());
        supermarket.setNazev(row.nazev());
        supermarket.setTelefon(row.telefon());
        supermarket.setEmail(row.email());
        return supermarket;
    }

    private Platba createPayment(Long objednavkaId,
                                 BigDecimal total,
                                 String paymentType,
                                 String cardNumber,
                                 BigDecimal prijato,
                                 BigDecimal vraceno) {
        return jdbcTemplate.execute((java.sql.Connection con) -> {
                    CallableStatement cs = con.prepareCall("{ call pkg_platba.create_platba(?, ?, ?, ?, ?, ?, ?, ?, ?) }");
                    cs.setLong(1, objednavkaId);
                    cs.setBigDecimal(2, total);
                    cs.setString(3, paymentType);
                    cs.setNull(4, Types.NUMERIC); // account payment not used here
                    if ("K".equalsIgnoreCase(paymentType)) {
                        if (cardNumber != null && !cardNumber.isBlank()) {
                            cs.setString(5, cardNumber);
                        } else {
                            cs.setNull(5, Types.VARCHAR);
                        }
                        cs.setNull(6, Types.NUMERIC);
                        cs.setNull(7, Types.NUMERIC);
                    } else {
                        cs.setNull(5, Types.VARCHAR);
                        BigDecimal prijataCastka = prijato != null ? prijato : total;
                        cs.setBigDecimal(6, prijataCastka);
                        cs.setBigDecimal(7, vraceno != null ? vraceno : prijataCastka.subtract(total).max(BigDecimal.ZERO));
                    }
                    cs.registerOutParameter(8, Types.NUMERIC);
                    cs.registerOutParameter(9, Types.NUMERIC);
                    return cs;
                },
                (CallableStatementCallback<Platba>) cs -> {
                    cs.execute();
                    Long platbaId = cs.getLong(9);
                    if (cs.wasNull()) {
                        platbaId = null;
                    }
                    Platba platba = new Platba();
                    platba.setIdPlatba(platbaId);
                    platba.setObjednavka(objednavkaId != null ? Objednavka.builder().idObjednavka(objednavkaId).build() : null);
                    platba.setCastka(total);
                    platba.setDatum(LocalDateTime.now());
                    platba.setPlatbaTyp(paymentType);
                    return platba;
                });
    }
}

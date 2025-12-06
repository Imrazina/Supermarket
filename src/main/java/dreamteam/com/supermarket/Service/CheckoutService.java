package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.CheckoutRequest;
import dreamteam.com.supermarket.controller.dto.CheckoutResponse;
import dreamteam.com.supermarket.model.user.Uzivatel;
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
 * Требуемые процедуры в БД (Oracle):
 *  - PROC_OBJEDNAVKA_CREATE(p_status_id, p_user_id, p_supermarket_id, p_poznamka, p_typ_objednavka, p_id OUT)
 *  - PROC_OBJEDNAVKA_ZBOZI_ADD(p_objednavka_id, p_zbozi_id, p_qty)
 *  - PROC_ZBOZI_UPDATE_QTY(p_id, p_delta)
 *  - PROC_PLATBA_CREATE(p_objednavka_id, p_castka, p_platbatyp, p_id OUT)
 *  - PROC_HOTOVOST_UPDATE(p_platba_id, p_prijato, p_vraceno)
 *  - PROC_KARTA_UPDATE(p_platba_id, p_cislo_karty)
 */
@Service
@RequiredArgsConstructor
public class CheckoutService {

    private final JdbcTemplate jdbcTemplate;

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
        String typObjednavka = isCustomer ? "ZAKAZNIK" : "INTERNI";

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

        String paymentType = resolvePaymentType(request.paymentType()); // "H" или "K"

        Long platbaId = createPlatba(objednavkaId, total, paymentType);
        BigDecimal prijatoForResponse = null;
        BigDecimal changeForResponse = null;

        if ("K".equalsIgnoreCase(paymentType)) {
            String cardNumber = Optional.ofNullable(request.cardNumber()).orElse("neznama");
            updateKarta(platbaId, cardNumber);
        } else {
            BigDecimal prijato = Optional.ofNullable(request.cashGiven()).orElse(total);
            BigDecimal vraceno = prijato.subtract(total).max(BigDecimal.ZERO);
            updateHotovost(platbaId, prijato, vraceno);
            prijatoForResponse = prijato;
            changeForResponse = vraceno;
        }

        return new CheckoutResponse(
                objednavkaId,
                platbaId,
                total,
                prijatoForResponse,
                changeForResponse,
                paymentType,
                responseLines
        );
    }

    private StatusRow fetchDefaultStatus() {
        String sql = """
                SELECT ID_STATUS, NAZEV
                FROM (
                    SELECT ID_STATUS, NAZEV FROM STATUS ORDER BY ID_STATUS
                )
                WHERE ROWNUM = 1
                """;
        List<StatusRow> list = jdbcTemplate.query(sql, (rs, i) -> new StatusRow(
                rs.getLong("ID_STATUS"),
                rs.getString("NAZEV")
        ));
        return list.isEmpty() ? null : list.get(0);
    }

    private SupermarketRow fetchDefaultSupermarket() {
        String sql = """
                SELECT ID_SUPERMARKET, NAZEV
                FROM (
                    SELECT ID_SUPERMARKET, NAZEV FROM SUPERMARKET ORDER BY ID_SUPERMARKET
                )
                WHERE ROWNUM = 1
                """;
        List<SupermarketRow> list = jdbcTemplate.query(sql, (rs, i) -> new SupermarketRow(
                rs.getLong("ID_SUPERMARKET"),
                rs.getString("NAZEV")
        ));
        return list.isEmpty() ? null : list.get(0);
    }

    private boolean existsZakaznik(Long userId) {
        String sql = """
                SELECT 1
                FROM ZAKAZNIK
                WHERE ID_UZIVATELU = ?
                  AND ROWNUM = 1
                """;
        List<Integer> res = jdbcTemplate.query(sql, (rs, i) -> rs.getInt(1), userId);
        return !res.isEmpty();
    }

    private ZboziRow findZbozi(Long id) {
        String sql = """
                SELECT ID_ZBOZI, NAZEV, CENA, MNOZSTVI, MINMNOZSTVI, POPIS, SKLAD_ID_SKLAD, ID_KATEGORIE
                FROM ZBOZI
                WHERE ID_ZBOZI = ?
                """;
        List<ZboziRow> list = jdbcTemplate.query(sql, (rs, i) -> new ZboziRow(
                rs.getLong("ID_ZBOZI"),
                rs.getString("NAZEV"),
                rs.getBigDecimal("CENA"),
                rs.getInt("MNOZSTVI"),
                rs.getInt("MINMNOZSTVI"),
                rs.getString("POPIS"),
                rs.getLong("SKLAD_ID_SKLAD"),
                rs.getLong("ID_KATEGORIE")
        ), id);
        return list.isEmpty() ? null : list.get(0);
    }

    private void updateZboziQty(Long zboziId, int delta) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call PROC_ZBOZI_UPDATE_QTY(?, ?) }");
            cs.setLong(1, zboziId);
            cs.setInt(2, delta);
            return cs;
        });
    }

    private void addObjednavkaZbozi(Long objednavkaId, Long zboziId, int qty) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call PROC_OBJEDNAVKA_ZBOZI_ADD(?, ?, ?) }");
            cs.setLong(1, objednavkaId);
            cs.setLong(2, zboziId);
            cs.setInt(3, qty);
            return cs;
        });
    }

    private Long createObjednavka(Long statusId,
                                  Long userId,
                                  Long supermarketId,
                                  String note,
                                  String typObjednavka) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call PROC_OBJEDNAVKA_CREATE(?, ?, ?, ?, ?, ?) }");
            cs.setLong(1, statusId);
            cs.setLong(2, userId);
            cs.setLong(3, supermarketId);
            if (note != null && !note.isBlank()) {
                cs.setString(4, note);
            } else {
                cs.setNull(4, java.sql.Types.CLOB);
            }
            cs.setString(5, typObjednavka);
            cs.registerOutParameter(6, java.sql.Types.NUMERIC);
            cs.execute();
            return cs.getLong(6);
        });
    }

    private Long createPlatba(Long objednavkaId, BigDecimal castka, String paymentType) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call PROC_PLATBA_CREATE(?, ?, ?, ?) }");
            cs.setLong(1, objednavkaId);
            cs.setBigDecimal(2, castka);
            cs.setString(3, paymentType);
            cs.registerOutParameter(4, java.sql.Types.NUMERIC);
            cs.execute();
            return cs.getLong(4);
        });
    }

    private void updateHotovost(Long platbaId, BigDecimal prijato, BigDecimal vraceno) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call PROC_HOTOVOST_UPDATE(?, ?, ?) }");
            cs.setLong(1, platbaId);
            cs.setBigDecimal(2, prijato);
            cs.setBigDecimal(3, vraceno);
            return cs;
        });
    }

    private void updateKarta(Long platbaId, String cisloKarty) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call PROC_KARTA_UPDATE(?, ?) }");
            cs.setLong(1, platbaId);
            cs.setString(2, cisloKarty);
            return cs;
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
            default -> "H";
        };
    }

    private record ZboziRow(Long id, String nazev, BigDecimal cena, Integer mnozstvi,
                            Integer minMnozstvi, String popis, Long skladId, Long kategorieId) {}

    private record StatusRow(Long id, String nazev) {}

    private record SupermarketRow(Long id, String nazev) {}
}

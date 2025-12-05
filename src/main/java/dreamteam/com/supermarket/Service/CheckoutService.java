package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.CheckoutRequest;
import dreamteam.com.supermarket.controller.dto.CheckoutResponse;
import dreamteam.com.supermarket.model.market.*;
import dreamteam.com.supermarket.model.payment.*;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CheckoutService {

    private final ObjednavkaRepository objednavkaRepository;
    private final ObjednavkaStatusRepository objednavkaStatusRepository;
    private final ObjednavkaZboziRepository objednavkaZboziRepository;
    private final ZboziRepository zboziRepository;
    private final SupermarketRepository supermarketRepository;
    private final PlatbaRepository platbaRepository;
    private final HotovostRepository hotovostRepository;
    private final KartaRepository kartaRepository;
    private final ZakaznikRepository zakaznikRepository;

    @Transactional
    public CheckoutResponse createOrderWithPayment(Uzivatel user, CheckoutRequest request) {

        // --- 1) Проверка корзины ---
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Košík je prázdný.");
        }

        // --- 2) Получение обязательных данных ---
        ObjednavkaStatus status = objednavkaStatusRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Chybí status objednávky."));

        Supermarket supermarket = supermarketRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Chybí supermarket pro objednávku."));

        boolean isCustomer = zakaznikRepository.existsById(user.getIdUzivatel());
        String typObjednavka = isCustomer ? "ZAKAZNIK" : "INTERNI";

        // --- 3) Создаём заказ ---
        Objednavka objednavka = Objednavka.builder()
                .datum(LocalDateTime.now())
                .status(status)
                .uzivatel(user)
                .supermarket(supermarket)
                .poznamka(request.note())
                .typObjednavka(typObjednavka)
                .build();
        objednavka = objednavkaRepository.save(objednavka);

        // --- 4) Посчёт суммы и строк заказа ---
        BigDecimal total = BigDecimal.ZERO;
        List<CheckoutResponse.Line> responseLines = new ArrayList<>();

        for (CheckoutRequest.Item item : request.items()) {
            Long zboziId = parseSku(item.sku());
            Zbozi zbozi = zboziRepository.findById(zboziId)
                    .orElseThrow(() -> new IllegalArgumentException("Zbozi " + item.sku() + " nenalezeno."));

            int available = Optional.ofNullable(zbozi.getMnozstvi()).orElse(0);
            if (item.qty() > available) {
                throw new IllegalArgumentException("Nedostatek zasob pro " + zbozi.getNazev() + " (k dispozici " + available + ")");
            }
            zbozi.setMnozstvi(available - item.qty());
            zboziRepository.save(zbozi);

            ObjednavkaZbozi link = ObjednavkaZbozi.builder()
                    .id(new ObjednavkaZboziId(objednavka.getIdObjednavka(), zbozi.getIdZbozi()))
                    .objednavka(objednavka)
                    .zbozi(zbozi)
                    .pocet(item.qty())
                    .build();
            objednavkaZboziRepository.save(link);

            BigDecimal linePrice = Optional.ofNullable(zbozi.getCena()).orElse(BigDecimal.ZERO)
                    .multiply(BigDecimal.valueOf(item.qty()));
            total = total.add(linePrice);

            responseLines.add(new CheckoutResponse.Line(
                    item.sku(),
                    zbozi.getNazev(),
                    item.qty(),
                    linePrice
            ));
        }

        // --- 5) Определяем тип оплаты ---
        String paymentType = resolvePaymentType(request.paymentType()); // "H" или "K"

        // --- 6) Создаём PLATBA ---
        Platba platba = Platba.builder()
                .objednavka(objednavka)
                .castka(total)
                .datum(LocalDateTime.now())
                .platbaTyp(paymentType)
                .build();

        // КРИТИЧНО: отправить INSERT в БД сразу, чтобы отработали триггеры Oracle
        platba = platbaRepository.saveAndFlush(platba);

        Long platbaId = platba.getIdPlatba();

        // --- 7) Обработка типа оплаты ---
        if ("K".equalsIgnoreCase(paymentType)) {

            // Триггер уже создал запись в KARTA
            Karta karta = kartaRepository.findById(platbaId)
                    .orElseThrow(() -> new IllegalStateException(
                            "Očekává se záznam v KARTA pro PLATBA=" + platbaId));

            karta.setPlatba(platba);
            karta.setCisloKarty(
                    Optional.ofNullable(request.cardNumber()).orElse("neznama")
            );

            kartaRepository.save(karta);  // UPDATE

        } else {
            // НАЛИЧНЫЕ

            BigDecimal prijato = Optional.ofNullable(request.cashGiven()).orElse(total);
            BigDecimal vraceno = prijato.subtract(total).max(BigDecimal.ZERO);

            // Ищем запись, которую создал триггер
            Hotovost hotovost = hotovostRepository.findById(platbaId)
                    .orElseThrow(() -> new IllegalStateException(
                            "Očekává se záznam v HOTOVOST pro PLATBA=" + platbaId));

            hotovost.setPlatba(platba);
            hotovost.setPrijato(prijato);
            hotovost.setVraceno(vraceno);

            hotovostRepository.save(hotovost); // UPDATE
        }

        // --- 8) Формирование ответа ---
        BigDecimal prijatoForResponse =
                paymentType.equals("H") ? Optional.ofNullable(request.cashGiven()).orElse(total) : null;

        BigDecimal changeForResponse =
                prijatoForResponse == null ? null : prijatoForResponse.subtract(total).max(BigDecimal.ZERO);

        return new CheckoutResponse(
                objednavka.getIdObjednavka(),
                platba.getIdPlatba(),
                total,
                prijatoForResponse,
                changeForResponse,
                paymentType,
                responseLines
        );
    }

    // --- Вспомогательные методы ---

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
}

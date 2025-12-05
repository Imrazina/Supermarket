package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.CheckoutRequest;
import dreamteam.com.supermarket.controller.dto.CheckoutResponse;
import dreamteam.com.supermarket.model.market.Objednavka;
import dreamteam.com.supermarket.model.market.ObjednavkaStatus;
import dreamteam.com.supermarket.model.market.ObjednavkaZbozi;
import dreamteam.com.supermarket.model.market.ObjednavkaZboziId;
import dreamteam.com.supermarket.model.market.Supermarket;
import dreamteam.com.supermarket.model.market.Zbozi;
import dreamteam.com.supermarket.model.payment.Hotovost;
import dreamteam.com.supermarket.model.payment.Karta;
import dreamteam.com.supermarket.model.payment.Platba;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

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
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Košík je prázdný.");
        }

        ObjednavkaStatus status = objednavkaStatusRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Chybí status objednávky."));

        Supermarket supermarket = supermarketRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Chybí supermarket pro objednávku."));

        boolean isCustomer = zakaznikRepository.existsById(user.getIdUzivatel());
        String typObjednavka = isCustomer ? "ZAKAZNIK" : "INTERNI";

        Objednavka objednavka = Objednavka.builder()
                .datum(LocalDateTime.now())
                .status(status)
                .uzivatel(user)
                .supermarket(supermarket)
                .poznamka(request.note())
                .typObjednavka(typObjednavka)
                .build();
        objednavka = objednavkaRepository.save(objednavka);

        BigDecimal total = BigDecimal.ZERO;
        List<CheckoutResponse.Line> responseLines = new ArrayList<>();

        for (CheckoutRequest.Item item : request.items()) {
            Long zboziId = parseSku(item.sku());
            Zbozi zbozi = zboziRepository.findById(zboziId)
                    .orElseThrow(() -> new IllegalArgumentException("Zbozi " + item.sku() + " nenalezeno."));
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
            responseLines.add(new CheckoutResponse.Line(item.sku(), zbozi.getNazev(), item.qty(), linePrice));
        }

        Platba platba = Platba.builder()
                .objednavka(objednavka)
                .castka(total)
                .datum(LocalDateTime.now())
                .platbaTyp(resolvePaymentType(request.paymentType()))
                .build();
        platba = platbaRepository.save(platba);

        if ("K".equalsIgnoreCase(platba.getPlatbaTyp())) {

            String cislo = Optional.ofNullable(request.cardNumber()).orElse("neznama");

            Karta karta = kartaRepository.findById(platba.getIdPlatba())
                    .orElseGet(() -> Karta.builder().platba(platba).build());

            karta.setCisloKarty(cislo);
            karta.setPlatba(platba);

            kartaRepository.save(karta);
        }

        else {

            BigDecimal prijato = Optional.ofNullable(request.cashGiven()).orElse(total);
            BigDecimal vraceno = prijato.subtract(total);

            Hotovost hotovost = hotovostRepository.findById(platba.getIdPlatba())
                    .orElseGet(() -> Hotovost.builder().platba(platba).build());

            hotovost.setPrijato(prijato);
            hotovost.setVraceno(vraceno.max(BigDecimal.ZERO));
            hotovost.setPlatba(platba);

            hotovostRepository.save(hotovost);
        }


        return new CheckoutResponse(
                objednavka.getIdObjednavka(),
                platba.getIdPlatba(),
                total,
                request.cashGiven(),
                request.cashGiven() != null ? request.cashGiven().subtract(total) : null,
                platba.getPlatbaTyp(),
                responseLines
        );
    }

    private Long parseSku(String sku) {
        if (sku == null) {
            throw new IllegalArgumentException("SKU je povinné.");
        }
        String normalized = sku.trim().toUpperCase(Locale.ROOT);
        if (normalized.startsWith("SKU-")) {
            normalized = normalized.substring(4);
        }
        try {
            return Long.parseLong(normalized);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Neplatné SKU: " + sku);
        }
    }

    private String resolvePaymentType(String type) {
        if (type == null) return "H";
        return switch (type.trim().toUpperCase(Locale.ROOT)) {
            case "CASH", "H", "HOTOVOST" -> "H"; // hotovost
            case "CARD", "K", "KARTA" -> "K";
            default -> "H";
        };
    }
}

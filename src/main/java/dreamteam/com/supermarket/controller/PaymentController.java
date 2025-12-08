package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.Service.PlatbaJdbcService;
import dreamteam.com.supermarket.Service.UserJdbcService;
import dreamteam.com.supermarket.controller.dto.DashboardResponse;
import dreamteam.com.supermarket.model.user.Uzivatel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/platby")
@CrossOrigin(origins = "http://localhost:8000", allowCredentials = "true")
public class PaymentController {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final PlatbaJdbcService platbaJdbcService;
    private final UserJdbcService userJdbcService;

    public PaymentController(PlatbaJdbcService platbaJdbcService, UserJdbcService userJdbcService) {
        this.platbaJdbcService = platbaJdbcService;
        this.userJdbcService = userJdbcService;
    }

    @GetMapping
    public ResponseEntity<List<DashboardResponse.PaymentInfo>> listPayments(
            @RequestParam(value = "typ", required = false) String typ,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Uzivatel currentUser = userJdbcService.findByEmail(authentication.getName());
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String normalizedType = normalizeType(typ);
        List<DashboardResponse.PaymentInfo> payments = platbaJdbcService.findByTyp(normalizedType).stream()
                .sorted(Comparator.comparing(PlatbaJdbcService.PlatbaDetail::datum,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::mapPayment)
                .toList();

        return ResponseEntity.ok(payments);
    }

    private DashboardResponse.PaymentInfo mapPayment(PlatbaJdbcService.PlatbaDetail payment) {
        String typ = payment.platbaTyp() != null ? payment.platbaTyp().trim().toUpperCase() : "";
        boolean hasReceipt = payment.pohybId() != null;
        return new DashboardResponse.PaymentInfo(
                "PMT-" + payment.id(),
                "PO-" + payment.objednavkaId(),
                typ,
                resolveMethod(typ, payment),
                payment.castka() != null ? payment.castka().doubleValue() : 0d,
                payment.datum() != null ? payment.datum().format(DATE_FORMAT) : "",
                "Zpracováno",
                hasReceipt
        );
    }

    private String normalizeType(String typ) {
        if (typ == null) {
            return null;
        }
        String upper = typ.trim().toUpperCase();
        return switch (upper) {
            case "H", "K", "U" -> upper;
            default -> null;
        };
    }

    private String resolveMethod(String typ, PlatbaJdbcService.PlatbaDetail platba) {
        if ("K".equalsIgnoreCase(typ)) {
            String number = platba.cisloKarty();
            if (number != null && number.length() > 4) {
                return "Karta **** " + number.substring(number.length() - 4);
            }
            return "Platební karta";
        }
        if ("H".equalsIgnoreCase(typ)) {
            return "Hotově";
        }
        if ("U".equalsIgnoreCase(typ)) {
            return "Účet";
        }
        return "Pokladna #" + platba.id();
    }
}

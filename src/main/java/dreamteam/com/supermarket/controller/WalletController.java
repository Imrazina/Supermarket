package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.Service.UserJdbcService;
import dreamteam.com.supermarket.Service.WalletJdbcService;
import dreamteam.com.supermarket.controller.dto.WalletBalanceResponse;
import dreamteam.com.supermarket.controller.dto.WalletMovementResponse;
import dreamteam.com.supermarket.controller.dto.WalletTopUpRequest;
import dreamteam.com.supermarket.controller.dto.WalletTopUpResponse;
import dreamteam.com.supermarket.controller.dto.WalletRefundRequest;
import dreamteam.com.supermarket.controller.dto.WalletRefundResponse;
import dreamteam.com.supermarket.model.user.Uzivatel;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/wallet")
@CrossOrigin(origins = "http://localhost:8000", allowCredentials = "true")
@RequiredArgsConstructor
public class WalletController {

    private final WalletJdbcService walletService;
    private final UserJdbcService userJdbcService;

    @GetMapping
    public ResponseEntity<WalletBalanceResponse> balance(Authentication authentication) {
        Uzivatel user = resolveUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long ucetId = walletService.ensureAccountForUser(user.getIdUzivatel());
        BigDecimal zustatek = walletService.findBalance(ucetId);
        return ResponseEntity.ok(new WalletBalanceResponse(ucetId, zustatek));
    }

    @PostMapping("/topup")
    public ResponseEntity<?> topUp(@RequestBody WalletTopUpRequest request, Authentication authentication) {
        Uzivatel user = resolveUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (request == null || request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body("Castka musi byt vetsi nez 0.");
        }
        String metoda = normalizeMethod(request.method());
        if (metoda == null) {
            return ResponseEntity.badRequest().body("Metoda musi byt KARTA nebo HOTOVOST.");
        }
        Long ucetId = walletService.ensureAccountForUser(user.getIdUzivatel());
        WalletJdbcService.TopUpResult res = walletService.topUp(
                ucetId,
                request.amount(),
                metoda,
                request.cardNumber(),
                request.note()
        );
        BigDecimal zustatek = walletService.findBalance(ucetId);
        return ResponseEntity.ok(new WalletTopUpResponse(res.pohybId(), ucetId, zustatek));
    }

    @PostMapping("/refund")
    public ResponseEntity<?> refund(@RequestBody WalletRefundRequest request, Authentication authentication) {
        Uzivatel user = resolveUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (request == null || request.orderId() == null) {
            return ResponseEntity.badRequest().body("Chybi ID objednavky.");
        }
        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body("Castka musi byt vetsi nez 0.");
        }
        Long orderId = parseOrderId(request.orderId());
        if (orderId == null) {
            return ResponseEntity.badRequest().body("Neplatne ID objednavky.");
        }
        Long ucetId = walletService.ensureAccountForUser(user.getIdUzivatel());
        WalletJdbcService.RefundResult res = walletService.refundOrder(ucetId, orderId, request.amount());
        BigDecimal zustatek = walletService.findBalance(ucetId);
        return ResponseEntity.ok(new WalletRefundResponse(res.pohybId(), ucetId, zustatek));
    }

    @GetMapping("/history")
    public ResponseEntity<List<WalletMovementResponse>> history(Authentication authentication) {
        Uzivatel user = resolveUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long ucetId = walletService.ensureAccountForUser(user.getIdUzivatel());
        List<WalletMovementResponse> list = walletService.history(ucetId).stream()
                .map(p -> new WalletMovementResponse(
                        p.id(),
                        p.smer(),
                        p.metoda(),
                        p.castka(),
                        p.poznamka(),
                        p.datum(),
                        p.objednavkaId(),
                        p.cisloKarty()
                ))
                .toList();
        return ResponseEntity.ok(list);
    }

    private Uzivatel resolveUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userJdbcService.findByEmail(authentication.getName());
    }

    private String normalizeMethod(String method) {
        if (method == null) return null;
        return switch (method.trim().toUpperCase(Locale.ROOT)) {
            case "KARTA", "K", "CARD" -> "KARTA";
            case "HOTOVOST", "H", "CASH" -> "HOTOVOST";
            default -> null;
        };
    }

    private Long parseOrderId(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String digits = raw.replaceAll("\\D+", "");
        if (digits.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(digits);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}

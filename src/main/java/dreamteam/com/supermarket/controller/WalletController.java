package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.Service.UserJdbcService;
import dreamteam.com.supermarket.Service.WalletJdbcService;
import dreamteam.com.supermarket.Service.ObjednavkaStatusJdbcService;
import dreamteam.com.supermarket.Service.PermissionService;
import dreamteam.com.supermarket.controller.dto.WalletBalanceResponse;
import dreamteam.com.supermarket.controller.dto.WalletMovementResponse;
import dreamteam.com.supermarket.controller.dto.WalletTopUpRequest;
import dreamteam.com.supermarket.controller.dto.WalletTopUpResponse;
import dreamteam.com.supermarket.controller.dto.WalletRefundRequest;
import dreamteam.com.supermarket.controller.dto.WalletRefundResponse;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.repository.OrderProcedureDao;
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
    private final OrderProcedureDao orderProcedureDao;
    private final ObjednavkaStatusJdbcService statusService;
    private final dreamteam.com.supermarket.Service.CustomerOrderService customerOrderService;
    private final PermissionService permissionService;

    private static final String PERMISSION_MANAGE = "CLIENT_ORDER_MANAGE";

    @PostMapping("/reports")
    public ResponseEntity<?> generateReports(
            @RequestParam(value = "year", required = false) Integer year,
            @RequestParam(value = "month", required = false) Integer month,
            Authentication authentication
    ) {
        if (!hasPermission(authentication, PERMISSION_MANAGE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Nedostatek prav.");
        }
        walletService.generateAccountReports(year, month);
        return ResponseEntity.ok("Reporty vygenerovány.");
    }

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
        if (!hasPermission(authentication, PERMISSION_MANAGE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Refund může provést jen manažer.");
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
        if (walletService.hasRefundForOrder(orderId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Objednavka jiz byla vracena.");
        }
        Long ucetId = walletService.ensureAccountForUser(user.getIdUzivatel());
        WalletJdbcService.RefundResult res = walletService.refundOrder(ucetId, orderId, request.amount());
        Long targetStatusId = resolveTargetCancelStatus(orderId);
        if (targetStatusId != null) {
            orderProcedureDao.updateStatus(orderId, targetStatusId);
        }
        BigDecimal zustatek = walletService.findBalance(ucetId);
        return ResponseEntity.ok(new WalletRefundResponse(res.pohybId(), ucetId, zustatek));
    }

    @PostMapping("/refund-request")
    public ResponseEntity<?> refundRequest(@RequestBody WalletRefundRequest request, Authentication authentication) {
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
        int code = customerOrderService.requestRefund(orderId, user.getEmail(), request.amount());
        return switch (code) {
            case 0 -> ResponseEntity.accepted().body("Žádost o refund byla odeslána manažerovi.");
            case -1 -> ResponseEntity.status(HttpStatus.CONFLICT).body("Refund už čeká na schválení.");
            case -2 -> ResponseEntity.status(HttpStatus.CONFLICT).body("Objednávka už byla vrácena.");
            case -4 -> ResponseEntity.badRequest().body("Refund lze požádat jen pro dokončené objednávky.");
            default -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("Objednávka nebyla nalezena.");
        };
    }

    @GetMapping("/history")
    public ResponseEntity<List<WalletMovementResponse>> history(
            @RequestParam(value = "from", required = false) String fromStr,
            @RequestParam(value = "to", required = false) String toStr,
            Authentication authentication) {
        Uzivatel user = resolveUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long ucetId = walletService.ensureAccountForUser(user.getIdUzivatel());
        java.time.LocalDate from = parseDate(fromStr);
        java.time.LocalDate to = parseDate(toStr);
        List<WalletMovementResponse> list = walletService.history(ucetId, from, to).stream()
                .map(p -> new WalletMovementResponse(
                        p.id(),
                        p.smer(),
                        p.metoda(),
                        p.castka(),
                        sanitizeNote(p.poznamka()),
                        p.datum(),
                        p.objednavkaId(),
                        p.cisloKarty()
                ))
                .toList();
        return ResponseEntity.ok(list);
    }

    private String sanitizeNote(String note) {
        if (note == null) return null;
        String cleaned = note.replaceAll("(?i)\\bobjednavk[ay]\\s*\\d+\\b", "objednavky").trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private java.time.LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return java.time.LocalDate.parse(value);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean hasPermission(Authentication authentication, String code) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return permissionService.userHasPermission(authentication.getName(), code);
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

    private Long resolveCancelStatusId() {
        var status = statusService.findByName("Zruseno");
        if (status == null) {
            status = statusService.findByName("Zrušeno");
        }
        return status != null ? status.getIdStatus() : null;
    }

    private Long resolveTargetCancelStatus(Long orderId) {
        Long cancelIdByName = resolveCancelStatusId();
        var order = orderProcedureDao.getOrder(orderId);
        if (order != null && order.statusId() != null && order.statusId() == 1L) {
            // Specifikace: pokud byl status 1, po refundu nastav na 6.
            return 6L;
        }
        return cancelIdByName;
    }
}

package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.Service.CustomerOrderService;
import dreamteam.com.supermarket.Service.PermissionService;
import dreamteam.com.supermarket.controller.dto.CustomerOrderPublicResponse;
import dreamteam.com.supermarket.controller.dto.CustomerOrderResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/client/orders")
@CrossOrigin(origins = "http://localhost:8000", allowCredentials = "true")
@RequiredArgsConstructor
public class ClientOrderController {

    private final CustomerOrderService customerOrderService;
    private final PermissionService permissionService;

    private static final String PERMISSION_MANAGE = "CLIENT_ORDER_MANAGE";
    private static final String PERMISSION_HISTORY = "CUSTOMER_HISTORY";

    public record StatusChangeRequest(Integer statusId) {}
    public record RefundDecisionRequest(Boolean approve) {}

    @GetMapping
    public ResponseEntity<List<CustomerOrderResponse>> list(Authentication authentication) {
        if (!hasPermission(authentication, PERMISSION_MANAGE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(customerOrderService.listAllForStaff());
    }

    @PostMapping("/{id}/status")
    public ResponseEntity<?> changeStatus(@PathVariable Long id,
                                          @RequestBody StatusChangeRequest request,
                                          Authentication authentication) {
        if (!hasPermission(authentication, PERMISSION_MANAGE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (request == null || request.statusId == null) {
            return ResponseEntity.badRequest().body("Chybi statusId");
        }
        Long userId = customerOrderService.resolveUserId(authentication.getName());
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        int code = customerOrderService.changeStatus(id, userId, request.statusId);
        return switch (code) {
            case 0 -> ResponseEntity.noContent().build();
            case -1 -> ResponseEntity.badRequest().body("Neplatny prechod stavu");
            case -2 -> ResponseEntity.badRequest().body("Objednavka neni typu ZAKAZNIK");
            case -3 -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("Objednavka nenalezena");
            default -> ResponseEntity.badRequest().body("Nelze zmenit stav objednavky (code=" + code + ")");
        };
    }

    @GetMapping("/history")
    public ResponseEntity<List<CustomerOrderPublicResponse>> history(Authentication authentication) {
        Long userId = customerOrderService.resolveUserId(authentication.getName());
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        List<CustomerOrderPublicResponse> result = customerOrderService.listByCustomer(userId).stream()
                .map(o -> new CustomerOrderPublicResponse(
                        o.status(),
                        o.statusId(),
                        o.supermarket(),
                        o.supermarketId(),
                        o.customerEmail(),
                        o.handlerEmail(),
                        o.handlerName(),
                        o.createdAt(),
                        o.note(),
                        o.items(),
                        o.total(),
                        o.cislo(),
                        o.refunded(),
                        o.pendingRefund(),
                        o.refundRejected()
                ))
                .toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/refunds")
    public ResponseEntity<List<CustomerOrderResponse>> refunds(Authentication authentication) {
        if (!hasPermission(authentication, PERMISSION_MANAGE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Long userId = customerOrderService.resolveUserId(authentication.getName());
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(customerOrderService.listPendingRefunds(userId));
    }

    @PostMapping("/{id}/refund/approve")
    public ResponseEntity<?> approveRefund(@PathVariable Long id, Authentication authentication) {
        if (!hasPermission(authentication, PERMISSION_MANAGE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        int code = customerOrderService.approveRefund(id);
        return switch (code) {
            case 0 -> ResponseEntity.noContent().build();
            case -1 -> ResponseEntity.badRequest().body("Žádost již není aktivní.");
            case -2 -> ResponseEntity.status(HttpStatus.CONFLICT).body("Objednávka už byla vrácena.");
            case -5 -> ResponseEntity.badRequest().body("Nenalezena platba k vrácení.");
            default -> ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        };
    }

    @PostMapping("/{id}/refund/reject")
    public ResponseEntity<?> rejectRefund(@PathVariable Long id, Authentication authentication) {
        if (!hasPermission(authentication, PERMISSION_MANAGE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        int code = customerOrderService.rejectRefund(id);
        return switch (code) {
            case 0 -> ResponseEntity.noContent().build();
            case -1 -> ResponseEntity.badRequest().body("Žádost již není aktivní.");
            default -> ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        };
    }

    private boolean hasPermission(Authentication authentication, String code) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return permissionService.userHasPermission(authentication.getName(), code);
    }
}

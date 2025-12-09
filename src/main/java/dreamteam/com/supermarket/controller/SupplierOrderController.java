package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.controller.dto.SupplierOrderResponse;
import dreamteam.com.supermarket.Service.SupplierOrderService;
import dreamteam.com.supermarket.Service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/supplier/orders")
@CrossOrigin(origins = "http://localhost:8000", allowCredentials = "true")
@RequiredArgsConstructor
public class SupplierOrderController {

    private final SupplierOrderService supplierOrderService;
    private final PermissionService permissionService;
    private static final String PERMISSION_CODE = "SUPPLIER_ORDERS_ACC";

    @GetMapping("/free")
    public ResponseEntity<List<SupplierOrderResponse>> listFree(Authentication authentication) {
        if (!permissionService.hasPermission(authentication, PERMISSION_CODE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(supplierOrderService.listFreeOrders());
    }

    @GetMapping("/mine")
    public ResponseEntity<List<SupplierOrderResponse>> listMine(Authentication authentication) {
        if (!permissionService.hasPermission(authentication, PERMISSION_CODE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Long userId = supplierOrderService.resolveUserId(authentication.getName());
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(supplierOrderService.listOrdersByOwner(userId));
    }

    @PostMapping("/{id}/claim")
    public ResponseEntity<?> claim(@PathVariable Long id, Authentication authentication) {
        if (!permissionService.hasPermission(authentication, PERMISSION_CODE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Long userId = supplierOrderService.resolveUserId(authentication.getName());
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        int code = supplierOrderService.claimOrder(id, userId);
        return switch (code) {
            case 0 -> ResponseEntity.noContent().build();
            case -1 -> ResponseEntity.badRequest().body("Objednavka neni typu DODAVATEL");
            case -2 -> ResponseEntity.badRequest().body("Objednavka neni ve stavu Vytvorena");
            case -3 -> ResponseEntity.badRequest().body("Objednavka neni volna");
            default -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("Objednavka nenalezena");
        };
    }

    public record StatusChangeRequest(Integer statusId) {}

    @PostMapping("/{id}/status")
    public ResponseEntity<?> changeStatus(@PathVariable Long id,
                                          @RequestBody StatusChangeRequest request,
                                          Authentication authentication) {
        if (!permissionService.hasPermission(authentication, PERMISSION_CODE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (request == null || request.statusId == null) {
            return ResponseEntity.badRequest().body("Chybi statusId");
        }
        Long userId = supplierOrderService.resolveUserId(authentication.getName());
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        var result = supplierOrderService.changeStatus(id, userId, request.statusId);
        return switch (result.code()) {
            case 0 -> ResponseEntity.ok(result);
            case -1 -> ResponseEntity.badRequest().body("Neplatny prechod stavu");
            case -2 -> ResponseEntity.status(HttpStatus.FORBIDDEN).body("Objednavka neni vase nebo neni typu DODAVATEL");
            case -5 -> ResponseEntity.badRequest().body("Ucet dodavatele nenalezen");
            default -> ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Nelze zmenit stav objednavky (code=" + result.code() + ")");
        };
    }

}

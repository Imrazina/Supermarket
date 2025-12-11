package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.controller.dto.CheckoutRequest;
import dreamteam.com.supermarket.controller.dto.CheckoutResponse;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.Service.CheckoutService;
import dreamteam.com.supermarket.Service.UserJdbcService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customer")
@CrossOrigin(origins = "http://localhost:8000", allowCredentials = "true")
@RequiredArgsConstructor
public class CustomerCheckoutController {

    private final CheckoutService checkoutService;
    private final UserJdbcService userJdbcService;

    private static String sanitize(String message) {
        if (message == null) {
            return "";
        }
        // Убираем CR/LF, чтобы не ломать заголовки
        return message.replaceAll("[\\r\\n]+", " ").trim();
    }

    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResponse> checkout(@RequestBody CheckoutRequest request,
                                                     Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Uzivatel currentUser = userJdbcService.findByEmail(authentication.getName());
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            CheckoutResponse response = checkoutService.createOrderWithPayment(currentUser, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .badRequest()
                    .header("X-Error", sanitize(ex.getMessage()))
                    .body(null);
        } catch (DataAccessException ex) {
            String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : "Chyba platby.";
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .header("X-Error", sanitize(message))
                    .body(null);
        }
    }
}

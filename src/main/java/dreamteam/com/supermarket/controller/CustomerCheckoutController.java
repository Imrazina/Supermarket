package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.Service.CheckoutService;
import dreamteam.com.supermarket.Service.UserJdbcService;
import dreamteam.com.supermarket.controller.dto.CheckoutRequest;
import dreamteam.com.supermarket.controller.dto.CheckoutResponse;
import dreamteam.com.supermarket.model.user.Uzivatel;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
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
    public ResponseEntity<?> checkout(@RequestBody CheckoutRequest request,
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
            log.error("Checkout rejected (validation) for user {}", currentUser.getIdUzivatel(), ex);
            return ResponseEntity
                    .badRequest()
                    .header("X-Error", sanitize(ex.getMessage()))
                    .body(ex.getMessage());
        } catch (DataAccessException ex) {
            String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : "Chyba platby.";
            log.error("Checkout DB failure for user {}", currentUser.getIdUzivatel(), ex);
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .header("X-Error", sanitize(message))
                    .body(message);
        } catch (Exception ex) {
            String message = ex.getMessage() != null ? ex.getMessage() : "Chyba platby.";
            log.error("Checkout unexpected failure for user {}", currentUser.getIdUzivatel(), ex);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .header("X-Error", sanitize(message))
                    .body(message);
        }
    }
}

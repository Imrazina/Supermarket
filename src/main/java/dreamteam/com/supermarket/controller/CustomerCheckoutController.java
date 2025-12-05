package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.controller.dto.CheckoutRequest;
import dreamteam.com.supermarket.controller.dto.CheckoutResponse;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.repository.UzivatelRepository;
import dreamteam.com.supermarket.Service.CheckoutService;
import lombok.RequiredArgsConstructor;
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
    private final UzivatelRepository uzivatelRepository;

    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResponse> checkout(@RequestBody CheckoutRequest request,
                                                     Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Uzivatel currentUser = uzivatelRepository.findByEmail(authentication.getName()).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        CheckoutResponse response = checkoutService.createOrderWithPayment(currentUser, request);
        return ResponseEntity.ok(response);
    }
}

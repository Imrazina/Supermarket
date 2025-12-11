package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.model.user.Notifikace;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.Service.NotifikaceJdbcService;
import dreamteam.com.supermarket.Service.UserJdbcService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/push")
@CrossOrigin(origins = "http://localhost:8000", allowCredentials = "true")
public class PushSubscriptionController {

    private static final String SUBSCRIPTION_MARKER = "__PUSH_SUBSCRIPTION__";

    @Autowired
    private NotifikaceJdbcService notifikaceJdbcService;

    @Autowired
    private UserJdbcService userJdbcService;

    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Object keysObj = request.get("keys");
        Map<?, ?> keys = keysObj instanceof Map<?, ?> m ? m : null;
        String endpoint = asString(request.get("endpoint"));
        if (keys == null || endpoint == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid subscription payload"));
        }
        String auth = asString(keys.get("auth"));
        String p256dh = asString(keys.get("p256dh"));
        String email = asString(request.getOrDefault("username", authentication.getName()));

        Uzivatel user = userJdbcService.findByEmail(email);
        if (user == null) {
            throw new IllegalArgumentException("User not found: " + email);
        }

        Notifikace existing = notifikaceJdbcService.findByAdresat(user.getEmail());
        Notifikace subscription = existing != null ? existing : new Notifikace();
        subscription.setZprava(null);
        subscription.setAdresat(user.getEmail());
        subscription.setEndPoint(endpoint);
        subscription.setAuthToken(auth);
        subscription.setP256dh(p256dh);

        notifikaceJdbcService.save(subscription);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/unsubscribe")
    public ResponseEntity<?> unsubscribe(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String email = authentication.getName();
        notifikaceJdbcService.deleteByAdresat(email);
        return ResponseEntity.noContent().build();
    }

    private String asString(Object value) {
        return value != null ? value.toString() : null;
    }
}

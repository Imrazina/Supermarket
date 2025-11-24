package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.model.user.Notifikace;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.model.user.Zpravy;
import dreamteam.com.supermarket.repository.MessageRepository;
import dreamteam.com.supermarket.repository.NotifikaceRepository;
import dreamteam.com.supermarket.repository.UzivatelRepository;
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
    private NotifikaceRepository notifikaceRepository;

    @Autowired
    private UzivatelRepository uzivatelRepository;

    @Autowired
    private MessageRepository messageRepository;

    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Map<String, Object> keys = (Map<String, Object>) request.get("keys");
        String endpoint = (String) request.get("endpoint");
        if (keys == null || endpoint == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid subscription payload"));
        }
        String auth = (String) keys.get("auth");
        String p256dh = (String) keys.get("p256dh");
        String email = (String) request.getOrDefault("username", authentication.getName());

        Uzivatel user = uzivatelRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        Zpravy envelope = messageRepository
                .findFirstBySenderAndReceiverAndContent(user, user, SUBSCRIPTION_MARKER)
                .orElseGet(() -> messageRepository.save(
                        Zpravy.builder()
                                .sender(user)
                                .receiver(user)
                                .content(SUBSCRIPTION_MARKER)
                                .datumZasilani(LocalDateTime.now())
                                .build()
                ));

        Notifikace subscription = notifikaceRepository.findByAdresat(user.getEmail())
                .orElseGet(() -> {
                    Notifikace notif = new Notifikace();
                    notif.setZprava(envelope);
                    return notif;
                });

        subscription.setZprava(envelope);
        subscription.setAdresat(user.getEmail());
        subscription.setEndPoint(endpoint);
        subscription.setAuthToken(auth);
        subscription.setP256dh(p256dh);

        notifikaceRepository.save(subscription);
        return ResponseEntity.ok().build();
    }
}

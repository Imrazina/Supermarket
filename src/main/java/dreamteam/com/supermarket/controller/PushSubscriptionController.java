package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.model.user.Ohlaseny;
import dreamteam.com.supermarket.model.user.OhlasenyId;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.model.user.Zpravy;
import dreamteam.com.supermarket.repository.MessageRepository;
import dreamteam.com.supermarket.repository.OhlasenyRepository;
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
    private OhlasenyRepository ohlasenyRepository;

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

        Zpravy envelope = messageRepository.findFirstByOwnerAndContent(user, SUBSCRIPTION_MARKER)
                .orElseGet(() -> messageRepository.save(
                        Zpravy.builder()
                                .sender(user)
                                .receiver(user)
                                .owner(user)
                                .content(SUBSCRIPTION_MARKER)
                                .createdAt(LocalDateTime.now())
                                .build()
                ));

        Ohlaseny subscription = ohlasenyRepository.findByZpravyOwner(user)
                .orElseGet(() -> Ohlaseny.builder()
                        .id(new OhlasenyId(user.getIdUzivatelu(), envelope.getId()))
                        .zpravy(envelope)
                        .build());

        subscription.setKonecovyBod(endpoint);
        subscription.setAuthToken(auth);
        subscription.setP256dh(p256dh);
        subscription.setArdesat(String.valueOf(request.getOrDefault("label", user.getEmail())));
        subscription.setZpravy(envelope);
        subscription.setId(new OhlasenyId(user.getIdUzivatelu(), envelope.getId()));

        ohlasenyRepository.save(subscription);
        return ResponseEntity.ok().build();
    }
}

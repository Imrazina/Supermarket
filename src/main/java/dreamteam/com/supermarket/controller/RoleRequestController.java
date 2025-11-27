package dreamteam.com.supermarket.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import dreamteam.com.supermarket.Service.PushNotificationService;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.model.user.Zpravy;
import dreamteam.com.supermarket.repository.MessageRepository;
import dreamteam.com.supermarket.repository.NotifikaceRepository;
import dreamteam.com.supermarket.repository.UzivatelRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/role-request")
@CrossOrigin(origins = "http://localhost:8000", allowCredentials = "true")
public class RoleRequestController {

    private static final Set<String> ALLOWED_ROLES = Set.of("ZAMESTNANEC", "ZAKAZNIK", "DODAVATEL");

    private final UzivatelRepository uzivatelRepository;
    private final MessageRepository messageRepository;
    private final NotifikaceRepository notifikaceRepository;
    private final PushNotificationService pushNotificationService;
    private final ObjectMapper objectMapper;
    private final SimpMessagingTemplate messagingTemplate;

    public RoleRequestController(UzivatelRepository uzivatelRepository,
                                 MessageRepository messageRepository,
                                 NotifikaceRepository notifikaceRepository,
                                 PushNotificationService pushNotificationService,
                                 ObjectMapper objectMapper,
                                 SimpMessagingTemplate messagingTemplate) {
        this.uzivatelRepository = uzivatelRepository;
        this.messageRepository = messageRepository;
        this.notifikaceRepository = notifikaceRepository;
        this.pushNotificationService = pushNotificationService;
        this.objectMapper = objectMapper;
        this.messagingTemplate = messagingTemplate;
    }

    @PostMapping
    public ResponseEntity<?> requestRole(@RequestBody Map<String, String> payload, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String requested = (payload.getOrDefault("roleCode", "")).trim().toUpperCase();
        if (!ALLOWED_ROLES.contains(requested)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Nepovolená role."));
        }
        String currentEmail = authentication.getName();
        Uzivatel sender = uzivatelRepository.findByEmail(currentEmail)
                .orElse(null);
        if (sender == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Uživatel nebyl nalezen."));
        }
        Uzivatel admin = uzivatelRepository.findByRole_NazevIgnoreCase("ADMIN").stream().findFirst().orElse(null);
        if (admin == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Nebyl nalezen žádný admin pro zpracování žádosti."));
        }
        String content = "Žádám o přidělení role \"" + requested + "\".";
        Zpravy message = new Zpravy();
        message.setSender(sender);
        message.setReceiver(admin);
        message.setContent(content);
        message.setDatumZasilani(LocalDateTime.now());
        try {
            Zpravy stored = messageRepository.save(message);
            sendPush(admin, sender, content);
            broadcastChatMessage(stored, sender, admin, content);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Žádost se nepodařilo odeslat."));
        }
        return ResponseEntity.ok(Map.of(
                "message", "Žádost odeslána adminovi.",
                "receiver", admin.getEmail()
        ));
    }

    private void broadcastChatMessage(Zpravy message, Uzivatel sender, Uzivatel receiver, String content) {
        try {
            messagingTemplate.convertAndSend("/topic/messages", Map.of(
                    "id", message.getId(),
                    "senderEmail", sender.getEmail(),
                    "receiverEmail", receiver.getEmail(),
                    "content", content,
                    "datumZasilani", message.getDatumZasilani()
            ));
        } catch (Exception ignored) {
            // nechceme blokovat kvůli websocketu
        }
    }

    private void sendPush(Uzivatel admin, Uzivatel sender, String content) {
        notifikaceRepository.findByAdresat(admin.getEmail())
                .ifPresent(subscriptionEntity -> {
                    try {
                        var subscription = new nl.martijndwars.webpush.Subscription(
                                subscriptionEntity.getEndPoint(),
                                new nl.martijndwars.webpush.Subscription.Keys(
                                        subscriptionEntity.getP256dh(),
                                        subscriptionEntity.getAuthToken()
                                )
                        );
                        String payload = objectMapper.writeValueAsString(Map.of(
                                "title", "Žádost o roli",
                                "body", (sender.getEmail() + ": " + content)
                        ));
                        pushNotificationService.sendNotification(subscription, payload);
                    } catch (JsonProcessingException e) {
                        throw new RuntimeException(e);
                    } catch (Exception e) {
                        // jen log, nechceme kvůli tomu shodit žádost
                    }
                });
    }
}

package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.model.user.Zpravy;
import dreamteam.com.supermarket.Service.UserJdbcService;
import dreamteam.com.supermarket.Service.MessageJdbcService;
import dreamteam.com.supermarket.Service.PermissionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(
        originPatterns = {
                "http://localhost:8000",
                "https://discord-0vt3.onrender.com",
                "http://localhost:8082",
                "http://127.0.0.1:*"
        },
        allowCredentials = "true"
)
public class ChatRestController {

    private static final String SUBSCRIPTION_MARKER = "__PUSH_SUBSCRIPTION__";
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("d. M. yyyy HH:mm");

    private final UserJdbcService userJdbcService;
    private final MessageJdbcService messageJdbcService;
    private final PermissionService permissionService;

    public ChatRestController(MessageJdbcService messageJdbcService,
                              UserJdbcService userJdbcService,
                              PermissionService permissionService) {
        this.messageJdbcService = messageJdbcService;
        this.userJdbcService = userJdbcService;
        this.permissionService = permissionService;
    }

    @GetMapping("/messages")
    public ResponseEntity<List<MessageResponse>> listMessages(
            @RequestParam(value = "with", required = false) String peerEmail,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        final String currentEmail = authentication.getName();
        Uzivatel currentUser = userJdbcService.findByEmail(currentEmail);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        List<Zpravy> messages;
        if (StringUtils.hasText(peerEmail)) {
            messages = messageJdbcService.findConversation(currentEmail, peerEmail.trim());
        } else {
            messages = messageJdbcService.findTop100WithParticipants().stream()
                    .filter(message -> isParticipant(currentUser, message))
                    .filter(message -> !SUBSCRIPTION_MARKER.equals(message.getContent()))
                    .toList();
        }
        return ResponseEntity.ok(
                messages.stream()
                        .map(ChatRestController::mapMessage)
                        .toList()
        );
    }

    @GetMapping("/contacts")
    public ResponseEntity<List<ContactResponse>> listContacts(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        var contacts = userJdbcService.findAll().stream()
                .map(user -> {
                    String fullName = ((user.getJmeno() != null ? user.getJmeno().trim() : "") + " " +
                            (user.getPrijmeni() != null ? user.getPrijmeni().trim() : "")).trim();
                    String role = user.getRole() != null ? user.getRole().getNazev() : "";
                    return new ContactResponse(
                            user.getEmail(),
                            fullName.isEmpty() ? user.getEmail() : fullName,
                            role,
                            user.getJmeno(),
                            user.getPrijmeni()
                    );
                })
                .filter(contact -> contact.email() != null && !contact.email().isBlank())
                .sorted((a, b) -> a.label().toLowerCase(Locale.ROOT).compareTo(b.label().toLowerCase(Locale.ROOT)))
                .toList();
        return ResponseEntity.ok(contacts);
    }

    @GetMapping("/inbox")
    public ResponseEntity<?> inbox(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Uzivatel currentUser = userJdbcService.findByEmail(authentication.getName());
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        long unread = messageJdbcService.countUnread(currentUser.getIdUzivatel(), null);
        String summary = messageJdbcService.lastMessageSummary(currentUser.getIdUzivatel());
        return ResponseEntity.ok(Map.of(
                "unreadMessages", unread,
                "lastMessageSummary", summary
        ));
    }

    @PatchMapping("/messages/{id}")
    public ResponseEntity<?> updateMessage(@PathVariable Long id,
                                           @RequestBody Map<String, String> payload,
                                           Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Uzivatel currentUser = userJdbcService.findByEmail(authentication.getName());
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Zpravy message = messageJdbcService.findById(id);
        if (message == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        boolean isOwner = message.getSender() != null && currentUser.getIdUzivatel().equals(message.getSender().getIdUzivatel());
        boolean canEditForeign = permissionService.userHasPermission(currentUser.getEmail(), "EDIT_MSGS");
        if (!isOwner && !canEditForeign) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Nemůžete upravit cizí zprávu."));
        }
        String text = payload.getOrDefault("content", "").trim();
        if (text.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Text je prázdný."));
        }
        messageJdbcService.update(id, text, message.getDatumZasilani());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/messages/{id}")
    public ResponseEntity<?> deleteMessage(@PathVariable Long id, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Uzivatel currentUser = userJdbcService.findByEmail(authentication.getName());
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Zpravy message = messageJdbcService.findById(id);
        if (message == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        boolean isOwner = message.getSender() != null && currentUser.getIdUzivatel().equals(message.getSender().getIdUzivatel());
        boolean canDeleteForeign = permissionService.userHasPermission(currentUser.getEmail(), "EDIT_MSGS");
        if (!isOwner && !canDeleteForeign) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Nemůžete smazat cizí zprávu."));
        }
        messageJdbcService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private static MessageResponse mapMessage(Zpravy message) {
        return new MessageResponse(
                message.getId(),
                message.getSender() != null ? message.getSender().getEmail() : "unknown",
                message.getReceiver() != null ? message.getReceiver().getEmail() : "unknown",
                message.getContent(),
                message.getDatumZasilani() != null ? message.getDatumZasilani().format(FORMATTER) : ""
        );
    }

    private static boolean isParticipant(Uzivatel currentUser, Zpravy message) {
        if (currentUser == null || currentUser.getIdUzivatel() == null || message == null) {
            return false;
        }
        Long id = currentUser.getIdUzivatel();
        return (message.getSender() != null && id.equals(message.getSender().getIdUzivatel()))
                || (message.getReceiver() != null && id.equals(message.getReceiver().getIdUzivatel()));
    }

    public record MessageResponse(Long id, String sender, String receiver, String content, String date) {
    }

    public record ContactResponse(String email, String label, String role, String firstName, String lastName) {
    }
}

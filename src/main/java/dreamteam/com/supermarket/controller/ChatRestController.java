package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.model.user.Zpravy;
import dreamteam.com.supermarket.repository.MessageRepository;
import dreamteam.com.supermarket.repository.UzivatelRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "http://localhost:8000", allowCredentials = "true")
public class ChatRestController {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("d. M. yyyy HH:mm");

    private final MessageRepository messageRepository;
    private final UzivatelRepository uzivatelRepository;

    public ChatRestController(MessageRepository messageRepository,
                              UzivatelRepository uzivatelRepository) {
        this.messageRepository = messageRepository;
        this.uzivatelRepository = uzivatelRepository;
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
        List<Zpravy> messages;
        if (StringUtils.hasText(peerEmail)) {
            messages = messageRepository.findConversation(currentEmail, peerEmail.trim());
        } else {
            messages = messageRepository.findTop100WithParticipants();
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
        var contacts = uzivatelRepository.findAll().stream()
                .map(user -> {
                    String fullName = ((user.getJmeno() != null ? user.getJmeno().trim() : "") + " " +
                            (user.getPrijmeni() != null ? user.getPrijmeni().trim() : "")).trim();
                    String label = fullName.isEmpty() ? user.getEmail() : fullName;
                    String role = user.getRole() != null ? user.getRole().getNazev() : "";
                    return new ContactResponse(user.getEmail(), label, role);
                })
                .filter(contact -> contact.email() != null && !contact.email().isBlank())
                .sorted((a, b) -> a.label().toLowerCase(Locale.ROOT).compareTo(b.label().toLowerCase(Locale.ROOT)))
                .toList();
        return ResponseEntity.ok(contacts);
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

    public record MessageResponse(Long id, String sender, String receiver, String content, String date) {
    }

    public record ContactResponse(String email, String label, String role) {
    }
}

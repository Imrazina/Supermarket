package dreamteam.com.supermarket.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import dreamteam.com.supermarket.Service.PushNotificationService;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.model.user.Zpravy;
import dreamteam.com.supermarket.Service.MessageJdbcService;
import dreamteam.com.supermarket.Service.NotifikaceJdbcService;
import dreamteam.com.supermarket.Service.UserJdbcService;
import nl.martijndwars.webpush.Subscription;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
public class ChatController {

    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);

    private final UserJdbcService userJdbcService;
    private final MessageJdbcService messageJdbcService;
    private final NotifikaceJdbcService notifikaceJdbcService;
    private final PushNotificationService pushNotificationService;
    private final ObjectMapper objectMapper;

    public ChatController(UserJdbcService userJdbcService,
                          MessageJdbcService messageJdbcService,
                          NotifikaceJdbcService notifikaceJdbcService,
                          PushNotificationService pushNotificationService,
                          ObjectMapper objectMapper) {
        this.userJdbcService = userJdbcService;
        this.messageJdbcService = messageJdbcService;
        this.notifikaceJdbcService = notifikaceJdbcService;
        this.pushNotificationService = pushNotificationService;
        this.objectMapper = objectMapper;
    }

    @MessageMapping("/chat")
    @SendTo("/topic/messages")
    public ChatMessageResponse sendMessage(@Payload Map<String, String> payload, Principal principal) {
        if (principal == null) {
            logger.error(" User is not authenticated!");
            throw new RuntimeException("User is not authenticated");
        }

        String email = principal.getName();
        logger.info(" Received message from user: {}", email);

        Uzivatel sender = userJdbcService.findByEmail(email);
        if (sender == null) {
            logger.error(" User not found in DB: {}", email);
            throw new RuntimeException("User not found");
        }

        String receiverEmail = payload.get("receiver");
        logger.info(" Receiver from payload: {}", receiverEmail);
        boolean hasExplicitReceiver = receiverEmail != null && !receiverEmail.isEmpty();
        Uzivatel receiver = hasExplicitReceiver
                ? userJdbcService.findByEmail(receiverEmail)
                : sender;
        if (receiver == null) {
            logger.error(" Receiver not found in DB: {}", receiverEmail);
            throw new RuntimeException("Receiver not found");
        }

        logger.info(" Receiver resolved to: {}", receiver.getEmail());

        Zpravy message = Zpravy.builder()
                .sender(sender)
                .receiver(receiver)
                .content(payload.get("content"))
                .datumZasilani(LocalDateTime.now())
                .build();
        message = messageJdbcService.save(message);
        logger.info(" Message saved to DB with id: {}, sender: {}, receiver: {}", message.getId(), sender.getEmail(), receiver.getEmail());

        if (hasExplicitReceiver) {
            final Uzivatel finalReceiver = receiver;
            final Uzivatel finalSender = sender;
            final Zpravy finalMessage = message;

            var subscriptionEntity = notifikaceJdbcService.findByAdresat(finalReceiver.getEmail());
            if (subscriptionEntity != null) {
                try {
                    logger.info(" Preparing push for message {}, receiver {}", finalMessage.getId(), finalReceiver.getEmail());
                    Subscription subscription = new Subscription(
                            subscriptionEntity.getEndPoint(),
                            new Subscription.Keys(
                                    subscriptionEntity.getP256dh(),
                                    subscriptionEntity.getAuthToken()
                            )
                    );

                    String senderLabel = buildSenderLabel(finalSender);
                    String preview = buildMessagePreview(finalMessage.getContent(), 5);
                    String jsonPayload = buildPushPayload(senderLabel, preview);
                    logger.info(" Push payload: {}", jsonPayload);
                    pushNotificationService.sendNotification(subscription, jsonPayload);
                    logger.info(" Push sent to {} (endpoint hash: {})", finalReceiver.getEmail(), maskEndpoint(subscriptionEntity.getEndPoint()));

                } catch (Exception e) {
                    logger.warn(" Push sending failed for message {}: {}", finalMessage.getId(), e.getMessage(), e);
                }
            } else {
                logger.warn(" Push skipped: no subscription for receiver {}", finalReceiver.getEmail());
            }
        }
        return new ChatMessageResponse(
                message.getId(),
                sender.getEmail(),
                receiver.getEmail(),
                message.getContent(),
                message.getDatumZasilani()
        );
    }

    private String buildSenderLabel(Uzivatel sender) {
        String firstName = sender.getJmeno() != null ? sender.getJmeno().trim() : "";
        String lastName = sender.getPrijmeni() != null ? sender.getPrijmeni().trim() : "";
        String fullName = (firstName + " " + lastName).trim();
        String label = fullName.isEmpty() ? sender.getEmail() : fullName;
        return "Сообщение от " + label;
    }

    private String buildMessagePreview(String content, int maxWords) {
        if (content == null) {
            return "Новое сообщение…";
        }
        String trimmed = content.trim();
        if (trimmed.isEmpty()) {
            return "Новое сообщение…";
        }
        String[] words = trimmed.split("\\s+");
        String preview = Arrays.stream(words)
                .limit(Math.max(1, maxWords))
                .collect(Collectors.joining(" "));
        if (words.length > maxWords) {
            preview = preview + " …";
        }
        return preview;
    }

    private String buildPushPayload(String title, String body) {
        Map<String, String> payload = Map.of(
                "title", title,
                "body", body
        );
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize push payload", e);
        }
    }

    private String maskEndpoint(String endpoint) {
        if (endpoint == null || endpoint.length() < 12) {
            return "unknown";
        }
        return endpoint.substring(0, 8) + "..." + endpoint.substring(endpoint.length() - 4);
    }

    public record ChatMessageResponse(
            Long id,
            String senderEmail,
            String receiverEmail,
            String content,
            LocalDateTime timestamp
    ) {}
}

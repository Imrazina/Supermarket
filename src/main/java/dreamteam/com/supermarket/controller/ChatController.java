package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.Service.PushNotificationService;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.model.user.Zpravy;
import dreamteam.com.supermarket.repository.MessageRepository;
import dreamteam.com.supermarket.repository.OhlasenyRepository;
import dreamteam.com.supermarket.repository.UzivatelRepository;
import nl.martijndwars.webpush.Subscription;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;

@Controller
public class ChatController {

    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);

    private final UzivatelRepository uzivatelRepository;
    private final MessageRepository messageRepository;
    private final OhlasenyRepository ohlasenyRepository;
    private final PushNotificationService pushNotificationService;

    public ChatController(UzivatelRepository uzivatelRepository,
                          MessageRepository messageRepository,
                          OhlasenyRepository ohlasenyRepository,
                          PushNotificationService pushNotificationService) {
        this.uzivatelRepository = uzivatelRepository;
        this.messageRepository = messageRepository;
        this.ohlasenyRepository = ohlasenyRepository;
        this.pushNotificationService = pushNotificationService;
    }

    @MessageMapping("/chat")
    @SendTo("/topic/messages")
    public Zpravy sendMessage(@Payload Map<String, String> payload, Principal principal) {
        if (principal == null) {
            logger.error(" User is not authenticated!");
            throw new RuntimeException("User is not authenticated");
        }

        String email = principal.getName();
        logger.info(" Received message from user: {}", email);

        Uzivatel sender = uzivatelRepository.findByEmail(email)
                .orElseThrow(() -> {
                    logger.error(" User not found in DB: {}", email);
                    return new RuntimeException("User not found");
                });

        String receiverEmail = payload.get("receiver");
        logger.info(" Receiver from payload: {}", receiverEmail);
        Uzivatel receiver = null;
        if (receiverEmail != null && !receiverEmail.isEmpty()) {
            receiver = uzivatelRepository.findByEmail(receiverEmail)
                    .orElseThrow(() -> {
                        logger.error(" Receiver not found in DB: {}", receiverEmail);
                        return new RuntimeException("Receiver not found");
                    });
            logger.info(" Receiver loaded from DB: {}", receiver.getEmail());
        }

        Zpravy message = new Zpravy();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(payload.get("content"));
        message.setCreatedAt(LocalDateTime.now());
        message.setOwner(receiver != null ? receiver : sender);

        try {
            message = messageRepository.save(message);
            logger.info(" Message saved to DB with id: {}", message.getId());
        } catch (Exception e) {
            logger.error(" Error saving message to DB!", e);
            throw e;
        }

        if (receiver != null) {
            final Uzivatel finalReceiver = receiver;
            final Uzivatel finalSender = sender;
            final Zpravy finalMessage = message;

            ohlasenyRepository.findByZpravyOwner(finalReceiver)
                    .ifPresent(subscriptionEntity -> {
                        try {
                            Subscription subscription = new Subscription(
                                    subscriptionEntity.getKonecovyBod(),
                                    new Subscription.Keys(
                                            subscriptionEntity.getP256dh(),
                                            subscriptionEntity.getAuthToken()
                                    )
                            );

                            String jsonPayload = String.format(
                                    "{\"title\":\"%s\",\"body\":\"%s\"}",
                                    finalSender.getEmail(),
                                    finalMessage.getContent()
                            );
                            logger.info(" Payload для push: {}", jsonPayload);
                            pushNotificationService.sendNotification(subscription, jsonPayload);
                            logger.info(" Push sent to {}", finalReceiver.getEmail());

                        } catch (Exception e) {
                            logger.warn(" Push sending failed: {}", e.getMessage());
                        }
                    });
        }
        return message;
    }
}

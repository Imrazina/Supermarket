package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.Service.PushNotificationService;
import dreamteam.com.supermarket.model.ChatMessage;
import dreamteam.com.supermarket.model.UserEntity;
import dreamteam.com.supermarket.repository.MessageRepository;
import dreamteam.com.supermarket.repository.PushSubscriptionRepository;
import dreamteam.com.supermarket.repository.UserRepository;
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

    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final PushNotificationService pushNotificationService;

    public ChatController(UserRepository userRepository,
                          MessageRepository messageRepository,
                          PushSubscriptionRepository pushSubscriptionRepository,
                          PushNotificationService pushNotificationService) {
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
        this.pushSubscriptionRepository = pushSubscriptionRepository;
        this.pushNotificationService = pushNotificationService;
    }

    @MessageMapping("/chat")
    @SendTo("/topic/messages")
    public ChatMessage sendMessage(@Payload Map<String, String> payload, Principal principal) {
        if (principal == null) {
            logger.error(" User is not authenticated!");
            throw new RuntimeException("User is not authenticated");
        }

        String username = principal.getName();
        logger.info(" Received message from user: {}", username);

        UserEntity sender = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    logger.error(" User not found in DB: {}", username);
                    return new RuntimeException("User not found");
                });

        String receiverUsername = payload.get("receiver");
        logger.info(" Receiver from payload: {}", receiverUsername);
        UserEntity receiver = null;
        if (receiverUsername != null && !receiverUsername.isEmpty()) {
            receiver = userRepository.findByUsername(receiverUsername)
                    .orElseThrow(() -> {
                        logger.error(" Receiver not found in DB: {}", receiverUsername);
                        return new RuntimeException("Receiver not found");
                    });
            logger.info(" Receiver loaded from DB: {}", receiver.getUsername());
        }

        ChatMessage message = new ChatMessage();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(payload.get("content"));
        message.setCreatedAt(LocalDateTime.now());

        try {
            message = messageRepository.save(message);
            logger.info(" Message saved to DB with id: {}", message.getId());
        } catch (Exception e) {
            logger.error(" Error saving message to DB!", e);
            throw e;
        }

        if (receiver != null) {
            final UserEntity finalReceiver = receiver;
            final UserEntity finalSender = sender;
            final ChatMessage finalMessage = message;

            pushSubscriptionRepository.findByUsername(finalReceiver.getUsername())
                    .ifPresent(subscriptionEntity -> {
                        try {
                            Subscription subscription = new Subscription(
                                    subscriptionEntity.getEndpoint(),
                                    new Subscription.Keys(
                                            subscriptionEntity.getP256dh(),
                                            subscriptionEntity.getAuth()
                                    )
                            );

                            String jsonPayload = String.format(
                                    "{\"title\":\"%s\",\"body\":\"%s\"}",
                                    finalSender.getUsername(),
                                    finalMessage.getContent()
                            );
                            logger.info(" Payload для push: {}", jsonPayload);
                            pushNotificationService.sendNotification(subscription, jsonPayload);
                            logger.info(" Push sent to {}", finalReceiver.getUsername());

                        } catch (Exception e) {
                            logger.warn(" Push sending failed: {}", e.getMessage());
                        }
                    });
        }
        return message;
    }
}

package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.ChatController;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
import org.apache.http.HttpResponse;
import org.slf4j.Logger;
import org.apache.http.util.EntityUtils;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.GeneralSecurityException;

@Service
public class PushNotificationService {

    private final PushService pushService;
    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);

    public PushNotificationService(
            @Value("${webpush.public-key}") String publicKey,
            @Value("${webpush.private-key}") String privateKey,
            @Value("${webpush.subject}") String subject
    ) throws GeneralSecurityException {

        pushService = new PushService();
        pushService.setPublicKey(publicKey);
        pushService.setPrivateKey(privateKey);
        pushService.setSubject(subject);
    }


    public void sendNotification(Subscription subscription, String messageJson) {
        try {
            // Валидация подписки
            if (subscription == null || subscription.endpoint == null) {
                throw new IllegalArgumentException("Invalid subscription");
            }

            // Логирование для отладки
            logger.info("Sending push to: {}", subscription.endpoint);
            logger.debug("Payload: {}", messageJson);

            // Отправка уведомления
            Notification notification = new Notification(subscription, messageJson);
            HttpResponse response = pushService.send(notification);

            // Проверка ответа
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode >= 300) {
                String responseBody = EntityUtils.toString(response.getEntity());
                logger.error("Push failed. Status: {}, Response: {}", statusCode, responseBody);
                throw new RuntimeException("Push delivery failed: " + statusCode);
            }

            logger.info("Push delivered successfully");
        } catch (Exception e) {
            logger.error("Push notification failed", e);
            throw new RuntimeException("Failed to send push", e);
        }
    }
}

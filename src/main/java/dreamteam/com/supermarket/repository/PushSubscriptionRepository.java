package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    Optional<PushSubscription> findByUsername(String username);
}

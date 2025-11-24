package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.payment.Hotovost;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HotovostRepository extends JpaRepository<Hotovost, Long> {
}

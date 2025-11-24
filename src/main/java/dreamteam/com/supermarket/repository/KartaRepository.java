package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.payment.Karta;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KartaRepository extends JpaRepository<Karta, Long> {
}

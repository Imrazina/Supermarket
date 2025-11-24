package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.market.Supermarket;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupermarketRepository extends JpaRepository<Supermarket, Long> {
}

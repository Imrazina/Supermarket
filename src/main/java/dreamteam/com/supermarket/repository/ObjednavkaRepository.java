package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.market.Objednavka;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ObjednavkaRepository extends JpaRepository<Objednavka, Long> {
}

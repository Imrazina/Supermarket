package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.market.Sklad;
import dreamteam.com.supermarket.model.market.Supermarket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SkladRepository extends JpaRepository<Sklad, Long> {
    Optional<Sklad> findBySupermarket(Supermarket supermarket);
}

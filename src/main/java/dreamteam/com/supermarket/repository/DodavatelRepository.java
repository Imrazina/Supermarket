package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.user.Dodavatel;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DodavatelRepository extends JpaRepository<Dodavatel, Long> {
}

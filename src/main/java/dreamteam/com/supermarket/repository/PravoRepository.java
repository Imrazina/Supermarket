package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.user.Pravo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PravoRepository extends JpaRepository<Pravo, Long> {
    Optional<Pravo> findByKod(String kod);
}

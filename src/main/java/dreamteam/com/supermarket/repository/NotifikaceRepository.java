package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.user.Notifikace;
import dreamteam.com.supermarket.model.user.NotifikaceId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NotifikaceRepository extends JpaRepository<Notifikace, NotifikaceId> {
    Optional<Notifikace> findByAdresat(String adresat);
    Optional<Notifikace> findByZpravaId(Long zpravaId);
}

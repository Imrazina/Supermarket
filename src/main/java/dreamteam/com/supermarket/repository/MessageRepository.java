package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.model.user.Zpravy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Zpravy, Long> {
    Optional<Zpravy> findFirstByOwnerAndContent(Uzivatel owner, String content);
}

package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.user.Ohlaseny;
import dreamteam.com.supermarket.model.user.OhlasenyId;
import dreamteam.com.supermarket.model.user.Uzivatel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OhlasenyRepository extends JpaRepository<Ohlaseny, OhlasenyId> {
    Optional<Ohlaseny> findByZpravyOwner(Uzivatel owner);
}

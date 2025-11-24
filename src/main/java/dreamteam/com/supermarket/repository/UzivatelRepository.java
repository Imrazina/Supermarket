package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.user.Uzivatel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UzivatelRepository extends JpaRepository<Uzivatel, Long> {
    Optional<Uzivatel> findByEmail(String email);
    Optional<Uzivatel> findByTelefonniCislo(String telefonniCislo);
}

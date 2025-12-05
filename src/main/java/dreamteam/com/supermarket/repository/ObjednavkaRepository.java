package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.market.Objednavka;
import dreamteam.com.supermarket.model.user.Uzivatel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ObjednavkaRepository extends JpaRepository<Objednavka, Long> {
    List<Objednavka> findByUzivatel(Uzivatel uzivatel);
}

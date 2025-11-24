package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.market.Objednavka;
import dreamteam.com.supermarket.model.market.ObjednavkaZbozi;
import dreamteam.com.supermarket.model.market.ObjednavkaZboziId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ObjednavkaZboziRepository extends JpaRepository<ObjednavkaZbozi, ObjednavkaZboziId> {
    List<ObjednavkaZbozi> findByObjednavka(Objednavka objednavka);
}

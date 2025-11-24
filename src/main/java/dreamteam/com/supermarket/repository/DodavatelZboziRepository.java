package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.market.DodavatelZbozi;
import dreamteam.com.supermarket.model.market.DodavatelZboziId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DodavatelZboziRepository extends JpaRepository<DodavatelZbozi, DodavatelZboziId> {
    List<DodavatelZbozi> findByIdZboziId(Long zboziId);
}

package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.user.Zakaznik;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ZakaznikRepository extends JpaRepository<Zakaznik, Long> {
}

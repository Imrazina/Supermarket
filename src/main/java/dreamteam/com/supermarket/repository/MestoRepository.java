package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.location.Mesto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MestoRepository extends JpaRepository<Mesto, String> {
}

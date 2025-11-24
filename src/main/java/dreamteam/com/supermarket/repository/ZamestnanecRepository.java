package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.user.Zamestnanec;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ZamestnanecRepository extends JpaRepository<Zamestnanec, Long> {
}

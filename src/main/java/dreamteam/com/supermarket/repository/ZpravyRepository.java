package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.user.Zpravy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ZpravyRepository extends JpaRepository<Zpravy, Long> {
    List<Zpravy> findTop10ByOrderByDatumZasilaniDesc();
}

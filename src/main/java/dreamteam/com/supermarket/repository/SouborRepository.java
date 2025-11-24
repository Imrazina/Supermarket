package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.Archiv;
import dreamteam.com.supermarket.model.Soubor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SouborRepository extends JpaRepository<Soubor, Long> {
    List<Soubor> findByArchivOrderByDatumModifikaceDesc(Archiv archiv);
}

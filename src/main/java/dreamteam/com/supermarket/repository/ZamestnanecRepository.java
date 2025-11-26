package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.user.Zamestnanec;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ZamestnanecRepository extends JpaRepository<Zamestnanec, Long> {
    @Query("select distinct z.pozice from Zamestnanec z where z.pozice is not null order by z.pozice")
    List<String> findDistinctPositions();
}

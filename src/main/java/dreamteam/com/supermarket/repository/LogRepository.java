package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.Log;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LogRepository extends JpaRepository<Log, Long> {
    List<Log> findTop10ByOrderByDatumZmenyDesc();
}

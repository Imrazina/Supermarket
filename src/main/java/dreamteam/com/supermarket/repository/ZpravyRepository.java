package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.user.Zpravy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ZpravyRepository extends JpaRepository<Zpravy, Long> {
    List<Zpravy> findTop10ByOrderByDatumZasilaniDesc();

    @Query(value = "SELECT unread_messages(?1) FROM dual", nativeQuery = true)
    Number findUnreadCount(Long userId);

    @Query(value = "SELECT last_message_summary(?1) FROM dual", nativeQuery = true)
    String findLastMessageSummary(Long userId);
}

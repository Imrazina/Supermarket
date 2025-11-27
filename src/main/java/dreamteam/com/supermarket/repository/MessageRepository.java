package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.model.user.Zpravy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Zpravy, Long> {
    Optional<Zpravy> findFirstBySenderAndReceiverAndContent(Uzivatel sender, Uzivatel receiver, String content);

    @Query("""
            SELECT z FROM Zpravy z
            JOIN FETCH z.sender
            JOIN FETCH z.receiver
            ORDER BY z.datumZasilani DESC
            """)
    List<Zpravy> findTop100WithParticipants();

    @Query("""
            SELECT z FROM Zpravy z
            JOIN FETCH z.sender
            JOIN FETCH z.receiver
            WHERE (LOWER(z.sender.email) = LOWER(:currentEmail) AND LOWER(z.receiver.email) = LOWER(:peerEmail))
               OR (LOWER(z.sender.email) = LOWER(:peerEmail) AND LOWER(z.receiver.email) = LOWER(:currentEmail))
            ORDER BY z.datumZasilani DESC
            """)
    List<Zpravy> findConversation(
            @Param("currentEmail") String currentEmail,
            @Param("peerEmail") String peerEmail
    );
}

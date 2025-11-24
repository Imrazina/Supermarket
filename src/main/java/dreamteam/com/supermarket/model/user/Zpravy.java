package dreamteam.com.supermarket.model.user;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entity for table ZPRAVA – internal messages between users.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "ZPRAVA")
public class Zpravy {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_zpravy")
    @SequenceGenerator(name = "seq_zpravy", sequenceName = "SEQ_ZPRAVA_ID", allocationSize = 1)
    @Column(name = "ID_ZPRAVA")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ODESILATEL_ID", nullable = false)
    private Uzivatel sender;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "PRIJIMAC_ID", nullable = false)
    private Uzivatel receiver;

    @Lob
    @Column(name = "ZPRAVA", nullable = false)
    private String content;

    @Column(name = "DATUMZASILANI", nullable = false)
    private LocalDateTime datumZasilani;

    @PrePersist
    protected void onCreate() {
        if (datumZasilani == null) {
            datumZasilani = LocalDateTime.now();
        }
    }
}

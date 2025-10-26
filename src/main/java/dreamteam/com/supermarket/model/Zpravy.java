package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entity for table ZPRAVY – internal messages between users.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "ZPRAVY")
public class Zpravy {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_zpravy")
    @SequenceGenerator(name = "seq_zpravy", sequenceName = "ZPRAVY_SEQ", allocationSize = 1)
    @Column(name = "ID_ZPRAVY")
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

    @Column(name = "DATAZASILANI", nullable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "UZIVATEL_ID_UZIVATELU", nullable = false)
    private Uzivatel owner;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (owner == null) {
            owner = sender;
        }
    }
}

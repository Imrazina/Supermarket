package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entity for table OBJEDNAVKA - represents an order created by a customer.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "OBJEDNAVKA")
public class Objednavka {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_objednavka")
    @SequenceGenerator(name = "seq_objednavka", sequenceName = "OBJEDBAVKY_SEQ", allocationSize = 1)
    @Column(name = "ID_OBJEDNAVKY")
    private Long idObjednavky;

    @Column(name = "DATUM", nullable = false)
    private LocalDateTime datum;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "OBJEDNAVKA_STATUS_ID_STATUSU")
    private ObjednavkaStatus status;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ZAKAZNIK_ID_ZAKAZNIK", nullable = false)
    private Zakaznik zakaznik;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "SUPERMARKET_ID_SUPERMARKET", nullable = false)
    private Supermarket supermarket;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "DODAVATEL_ID_DODAVATEL", nullable = false)
    private Dodavatel dodavatel;

    @Lob
    @Column(name = "POZNAMKA")
    private String poznamka;

    @Column(name = "TYP_OBJEDNAVKY", nullable = false, length = 50)
    private String typObjednavka;

    @PrePersist
    protected void onCreate() {
        if (datum == null) {
            datum = LocalDateTime.now();
        }
    }
}

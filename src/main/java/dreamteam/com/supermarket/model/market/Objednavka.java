package dreamteam.com.supermarket.model.market;

import dreamteam.com.supermarket.model.user.Uzivatel;
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
    @SequenceGenerator(name = "seq_objednavka", sequenceName = "SEQ_OBJEDNAVKA_ID", allocationSize = 1)
    @Column(name = "ID_OBJEDNAVKA")
    private Long idObjednavka;

    @Column(name = "DATUM", nullable = false)
    private LocalDateTime datum;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ID_STATUS", nullable = false)
    private ObjednavkaStatus status;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ID_UZIVATEL", nullable = false)
    private Uzivatel uzivatel;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ID_SUPERMARKET", nullable = false)
    private Supermarket supermarket;

    @Lob
    @Column(name = "POZNAMKA")
    private String poznamka;

    @Column(name = "TYP_OBJEDNAVKA", nullable = false, length = 50)
    private String typObjednavka;

    @PrePersist
    protected void onCreate() {
        if (datum == null) {
            datum = LocalDateTime.now();
        }
    }
}

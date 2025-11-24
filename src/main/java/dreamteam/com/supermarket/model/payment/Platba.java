package dreamteam.com.supermarket.model.payment;

import dreamteam.com.supermarket.model.market.Objednavka;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity for table PLATBA - represents a payment related to an order.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "PLATBA")
public class Platba {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_platba")
    @SequenceGenerator(name = "seq_platba", sequenceName = "SEQ_PLATBA_ID", allocationSize = 1)
    @Column(name = "ID_PLATBA")
    private Long idPlatba;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ID_OBJEDNAVKA", nullable = false)
    private Objednavka objednavka;

    @Column(name = "CASTKA", nullable = false, precision = 12, scale = 2)
    private BigDecimal castka;

    @Column(name = "DATUM", nullable = false)
    private LocalDateTime datum;

    @Column(name = "PLATBATYP", nullable = false, columnDefinition = "CHAR(2)")
    private String platbaTyp;

    @OneToOne(mappedBy = "platba", fetch = FetchType.LAZY)
    private Hotovost hotovost;

    @OneToOne(mappedBy = "platba", fetch = FetchType.LAZY)
    private Karta karta;

    @PrePersist
    protected void onCreate() {
        if (datum == null) {
            datum = LocalDateTime.now();
        }
    }
}

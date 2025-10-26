package dreamteam.com.supermarket.model;

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
    @SequenceGenerator(name = "seq_platba", sequenceName = "PLATBA_SEQ", allocationSize = 1)
    @Column(name = "ID_PLATBA")
    private Long idPlatba;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "OBJEDNAVKA_ID_OBJEDNAVKY", nullable = false)
    private Objednavka objednavka;

    @Column(name = "CASTKA", nullable = false, precision = 12, scale = 2)
    private BigDecimal castka;

    @Column(name = "DATUM", nullable = false)
    private LocalDateTime datum;

    @Column(name = "PLATBATYPE", nullable = false, length = 2)
    private String platbaType;

    @OneToOne(mappedBy = "platba", fetch = FetchType.LAZY)
    private Hotovost hotovost;

    @OneToOne(mappedBy = "platba", fetch = FetchType.LAZY)
    private Karta karta;

    @OneToOne(mappedBy = "platba", fetch = FetchType.LAZY)
    private Uctenka uctenka;

    @PrePersist
    protected void onCreate() {
        if (datum == null) {
            datum = LocalDateTime.now();
        }
    }
}

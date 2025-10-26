package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity for table PRODEJ - captures sales performed in a supermarket.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "PRODEJ")
public class Prodej {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_prodej")
    @SequenceGenerator(name = "seq_prodej", sequenceName = "SEQ_PRODEJ", allocationSize = 1)
    @Column(name = "ID_PRODEJ")
    private Long idProdej;

    @Column(name = "DATUM", nullable = false)
    private LocalDateTime datum;

    @Column(name = "CENACELKEM", nullable = false, precision = 12, scale = 2)
    private BigDecimal cenaCelkem;

    @Lob
    @Column(name = "POZNAMKA")
    private String poznamka;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "SUPERMARKET_ID_SUPERMARKET", nullable = false)
    private Supermarket supermarket;

    @PrePersist
    protected void onCreate() {
        if (datum == null) {
            datum = LocalDateTime.now();
        }
    }
}

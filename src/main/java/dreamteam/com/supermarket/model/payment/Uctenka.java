package dreamteam.com.supermarket.model.payment;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

/**
 * Entity for table UCTENKA - represents receipts linked to payments.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "UCTENKA")
public class Uctenka {

    @Id
    @Column(name = "PLATBA_ID_PLATBA")
    private Long platbaId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "PLATBA_ID_PLATBA")
    private Platba platba;

    @Column(name = "CASTKA", nullable = false, precision = 12, scale = 2)
    private BigDecimal castka;

    @Lob
    @Column(name = "POPIS", nullable = false)
    private String popis;
}

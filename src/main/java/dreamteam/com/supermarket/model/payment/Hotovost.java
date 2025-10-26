package dreamteam.com.supermarket.model.payment;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

/**
 * Entity for table HOTOVOST – specialization of PLATBA for cash.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "HOTOVOST")
public class Hotovost {

    @Id
    @Column(name = "ID_PLATBA")
    private Long platbaId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "ID_PLATBA")
    private Platba platba;

    @Column(name = "PRIJATO", nullable = false, precision = 12, scale = 2)
    private BigDecimal prijato;

    @Column(name = "VRACENO", nullable = false, precision = 12, scale = 2)
    private BigDecimal vraceno;
}

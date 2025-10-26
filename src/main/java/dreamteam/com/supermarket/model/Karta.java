package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table KARTA – specialization of PLATBA for card transactions.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "KARTA")
public class Karta {

    @Id
    @Column(name = "ID_PLATBA")
    private Long platbaId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "ID_PLATBA")
    private Platba platba;

    @Column(name = "CISLOKARTY", nullable = false, length = 32)
    private String cisloKarty;
}

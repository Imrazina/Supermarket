package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table OBJEDNAVKA_ZBOZI - connection between orders and products.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "OBJEDNAVKA_ZBOZI")
public class ObjednavkaZbozi {

    @EmbeddedId
    private ObjednavkaZboziId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("objednavkaId")
    @JoinColumn(name = "OBJEDNAVKA_ID_OBJEDNAVKY", nullable = false)
    private Objednavka objednavka;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("zboziId")
    @JoinColumn(name = "ZBOZI_ID_ZBOZI", nullable = false)
    private Zbozi zbozi;

    @Column(name = "POCET")
    private Integer pocet;
}

package dreamteam.com.supermarket.model.market;

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
    @JoinColumn(name = "ID_OBJEDNAVKA", nullable = false)
    private Objednavka objednavka;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("zboziId")
    @JoinColumn(name = "ID_ZBOZI", nullable = false)
    private Zbozi zbozi;

    @Column(name = "POCET", nullable = false)
    private Integer pocet;
}

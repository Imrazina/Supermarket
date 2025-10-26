package dreamteam.com.supermarket.model.market;

import dreamteam.com.supermarket.model.user.Dodavatel;
import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for Relation_15 - maps suppliers to goods they provide.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "DODAVATEL_ZBOZI")
public class DodavatelZbozi {

    @EmbeddedId
    private DodavatelZboziId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("dodavatelId")
    @JoinColumn(name = "DODAVATEL_ID_DODAVATEL", nullable = false)
    private Dodavatel dodavatel;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("zboziId")
    @JoinColumn(name = "ZBOZI_ID_ZBOZI", nullable = false)
    private Zbozi zbozi;
}

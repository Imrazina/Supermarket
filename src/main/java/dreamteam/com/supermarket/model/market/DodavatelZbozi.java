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
@Table(name = "ZBOZI_DODAVATEL")
public class DodavatelZbozi {

    @EmbeddedId
    private DodavatelZboziId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("dodavatelId")
    @JoinColumn(name = "ID_UZIVATELU", nullable = false)
    private Dodavatel dodavatel;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("zboziId")
    @JoinColumn(name = "ID_ZBOZI", nullable = false)
    private Zbozi zbozi;
}

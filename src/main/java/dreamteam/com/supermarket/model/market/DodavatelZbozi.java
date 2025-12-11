package dreamteam.com.supermarket.model.market;

import dreamteam.com.supermarket.model.user.Dodavatel;
import lombok.*;

/**
 * Entity for Relation_15 - maps suppliers to goods they provide.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DodavatelZbozi {

    private DodavatelZboziId id;

    private Dodavatel dodavatel;

    private Zbozi zbozi;
}

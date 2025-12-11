package dreamteam.com.supermarket.model.market;

import dreamteam.com.supermarket.model.location.Adresa;
import lombok.*;

/**
 * Entity for table SUPERMARKET - main branch/store entity.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Supermarket {

    private Long idSupermarket;

    private String nazev;

    private String telefon;

    private String email;

    private Adresa adresa;
}

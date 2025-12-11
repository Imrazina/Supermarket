package dreamteam.com.supermarket.model.location;

import lombok.*;

/**
 * Entity for table MESTO - represents cities used for addresses.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Mesto {

    private String psc;

    private String nazev;

    private String kraj;
}

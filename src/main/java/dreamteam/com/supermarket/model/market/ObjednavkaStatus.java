package dreamteam.com.supermarket.model.market;

import lombok.*;

/**
 * Entity for table STATUS - defines allowed order states.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ObjednavkaStatus {

    private Long idStatus;

    private String nazev;
}

package dreamteam.com.supermarket.model.payment;

import lombok.*;
import java.math.BigDecimal;

/**
 * Entity for table HOTOVOST Ú¿” specialization of PLATBA for cash.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Hotovost {

    private Long platbaId;

    private Platba platba;

    private BigDecimal prijato;

    private BigDecimal vraceno;
}

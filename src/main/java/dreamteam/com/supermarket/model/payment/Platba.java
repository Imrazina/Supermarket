package dreamteam.com.supermarket.model.payment;

import dreamteam.com.supermarket.model.market.Objednavka;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity for table PLATBA - represents a payment related to an order.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Platba {

    private Long idPlatba;

    private Objednavka objednavka;

    private BigDecimal castka;

    private LocalDateTime datum;

    private String platbaTyp;

    private Hotovost hotovost;

    private Karta karta;

    protected void onCreate() {
        if (datum == null) {
            datum = LocalDateTime.now();
        }
    }
}

package dreamteam.com.supermarket.model.market;

import dreamteam.com.supermarket.model.user.Uzivatel;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity for table OBJEDNAVKA - represents an order created by a customer.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Objednavka {

    private Long idObjednavka;

    private LocalDateTime datum;

    private String cislo;

    private ObjednavkaStatus status;

    private Uzivatel uzivatel;

    private Supermarket supermarket;

    private String poznamka;

    private String typObjednavka;

    protected void onCreate() {
        if (datum == null) {
            datum = LocalDateTime.now();
        }
    }
}

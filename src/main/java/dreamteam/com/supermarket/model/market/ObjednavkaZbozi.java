package dreamteam.com.supermarket.model.market;

import lombok.*;

/**
 * Entity for table OBJEDNAVKA_ZBOZI - connection between orders and products.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ObjednavkaZbozi {

    private ObjednavkaZboziId id;

    private Objednavka objednavka;

    private Zbozi zbozi;

    private Integer pocet;
}

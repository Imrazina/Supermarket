package dreamteam.com.supermarket.model.market;

import lombok.*;
import java.math.BigDecimal;

/**
 * Entity for table ZBOZI - represents goods/products in the system.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Zbozi {

    private Long idZbozi;

    private String nazev;

    private BigDecimal cena;

    private Integer mnozstvi;

    private Integer minMnozstvi;

    private String popis;

    private Sklad sklad;

    private KategorieZbozi kategorie;
}

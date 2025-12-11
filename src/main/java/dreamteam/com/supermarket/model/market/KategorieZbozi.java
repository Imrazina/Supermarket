package dreamteam.com.supermarket.model.market;

import lombok.*;

/**
 * Entity for table KATEGORIE_ZBOZI - represents product categories (reference table).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KategorieZbozi {

    private Long idKategorie;

    private String nazev;

    private String popis;
}

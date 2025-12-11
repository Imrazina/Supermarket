package dreamteam.com.supermarket.model.market;

import lombok.*;

/**
 * Entity for table SKLAD - represents warehouse belonging to a supermarket.
 */
@Data
@EqualsAndHashCode(exclude = "supermarket")
@ToString(exclude = "supermarket")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sklad {

    private Long idSklad;

    private String nazev;

    private Integer kapacita;

    private String telefonniCislo;

    private Supermarket supermarket;
}

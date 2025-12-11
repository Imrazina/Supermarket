package dreamteam.com.supermarket.model.user;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Entity for table ZAMESTNANEC - stores employee specific data (salary, position).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Zamestnanec {

    private Long id;

    private Uzivatel uzivatel;

    private BigDecimal mzda;

    private LocalDate datumNastupa;

    private String pozice;
}

package dreamteam.com.supermarket.model.user;

import lombok.*;

/**
 * Entity for table ZAKAZNIK - additional data for customer users.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Zakaznik {

    private Long id;

    private Uzivatel uzivatel;

    private String kartaVernosti;
}

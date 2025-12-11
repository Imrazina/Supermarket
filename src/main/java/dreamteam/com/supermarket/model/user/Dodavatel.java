package dreamteam.com.supermarket.model.user;

import lombok.*;

/**
 * Entity for table DODAVATEL - supplier specific data linked to a user.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Dodavatel {

    private Long id;

    private Uzivatel uzivatel;

    private String firma;
}

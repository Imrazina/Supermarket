package dreamteam.com.supermarket.model.user;

import lombok.*;

/**
 * Entity for table APP_ROLE - defines user roles in the system.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

    private Long idRole;

    private String nazev;
}

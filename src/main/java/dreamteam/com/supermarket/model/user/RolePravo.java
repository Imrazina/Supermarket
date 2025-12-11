package dreamteam.com.supermarket.model.user;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RolePravo {

    private RolePravoId id;

    private Pravo pravo;

    private Role role;
}

package dreamteam.com.supermarket.model.user;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "APP_ROLE_PRAVO")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RolePravo {

    @EmbeddedId
    private RolePravoId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("pravoId")
    @JoinColumn(name = "ID_PRAVO")
    private Pravo pravo;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roleId")
    @JoinColumn(name = "ID_ROLE")
    private Role role;
}

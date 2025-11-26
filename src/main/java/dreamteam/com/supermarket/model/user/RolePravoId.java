package dreamteam.com.supermarket.model.user;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RolePravoId implements Serializable {

    @Column(name = "ID_PRAVO")
    private Long pravoId;

    @Column(name = "ID_ROLE")
    private Long roleId;
}

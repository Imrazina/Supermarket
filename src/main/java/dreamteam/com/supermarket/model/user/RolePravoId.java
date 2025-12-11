package dreamteam.com.supermarket.model.user;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RolePravoId implements Serializable {

    private Long pravoId;

    private Long roleId;
}

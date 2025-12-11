package dreamteam.com.supermarket.model.market;

import lombok.*;
import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ObjednavkaZboziId implements Serializable {

    private Long objednavkaId;

    private Long zboziId;
}

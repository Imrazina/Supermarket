package dreamteam.com.supermarket.model.market;

import lombok.*;
import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DodavatelZboziId implements Serializable {

    private Long dodavatelId;

    private Long zboziId;
}

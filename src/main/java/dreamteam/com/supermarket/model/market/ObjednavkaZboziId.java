package dreamteam.com.supermarket.model.market;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ObjednavkaZboziId implements Serializable {

    @Column(name = "ID_OBJEDNAVKA")
    private Long objednavkaId;

    @Column(name = "ID_ZBOZI")
    private Long zboziId;
}

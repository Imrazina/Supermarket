package dreamteam.com.supermarket.model.market;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ObjednavkaZboziId implements Serializable {

    @Column(name = "OBJEDNAVKA_ID_OBJEDNAVKY")
    private Long objednavkaId;

    @Column(name = "ZBOZI_ID_ZBOZI")
    private Long zboziId;
}

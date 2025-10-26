package dreamteam.com.supermarket.model.market;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DodavatelZboziId implements Serializable {

    @Column(name = "DODAVATEL_ID_DODAVATEL")
    private Long dodavatelId;

    @Column(name = "ZBOZI_ID_ZBOZI")
    private Long zboziId;
}

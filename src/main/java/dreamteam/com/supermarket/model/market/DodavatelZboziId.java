package dreamteam.com.supermarket.model.market;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DodavatelZboziId implements Serializable {

    @Column(name = "ID_UZIVATELU")
    private Long dodavatelId;

    @Column(name = "ID_ZBOZI")
    private Long zboziId;
}

package dreamteam.com.supermarket.model.user;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OhlasenyId implements Serializable {

    @Column(name = "ID_OHLASENY")
    private Long idOhlaseny;

    @Column(name = "ZPRAVY_ID_ZPRAVY")
    private Long zpravyId;
}

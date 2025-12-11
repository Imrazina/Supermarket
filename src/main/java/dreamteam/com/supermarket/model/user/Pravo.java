package dreamteam.com.supermarket.model.user;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pravo {

    private Long idPravo;

    private String nazev;

    private String kod;

    private String popis;
}

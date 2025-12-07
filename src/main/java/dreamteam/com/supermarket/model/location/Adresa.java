package dreamteam.com.supermarket.model.location;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Adresa {
    private Long idAdresa;
    private String ulice;
    private String cisloPopisne;
    private String cisloOrientacni;
    private Mesto mesto;
}

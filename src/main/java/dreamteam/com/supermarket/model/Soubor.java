package dreamteam.com.supermarket.model;

import dreamteam.com.supermarket.model.user.Uzivatel;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity for table SOUBOR тАУ stores uploaded binary files (images, PDFs, etc.).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Soubor {

    private Long idSoubor;

    private String nazev;

    private String typ;

    private String pripona;

    private byte[] obsah;

    private LocalDateTime datumNahrani;

    private LocalDateTime datumModifikace;

    private String popis;

    private Uzivatel vlastnik;

    private Archiv archiv;

    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (datumNahrani == null) {
            datumNahrani = now;
        }
        datumModifikace = now;
    }

    protected void onUpdate() {
        datumModifikace = LocalDateTime.now();
    }
}

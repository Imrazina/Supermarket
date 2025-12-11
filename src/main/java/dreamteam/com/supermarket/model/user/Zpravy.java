package dreamteam.com.supermarket.model.user;

import lombok.*;
import java.time.LocalDateTime;

/**
 * Entity for table ZPRAVA Ú¿” internal messages between users.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Zpravy {

    private Long id;

    private Uzivatel sender;

    private Uzivatel receiver;

    private String content;

    private LocalDateTime datumZasilani;

    protected void onCreate() {
        if (datumZasilani == null) {
            datumZasilani = LocalDateTime.now();
        }
    }
}

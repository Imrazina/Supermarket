package dreamteam.com.supermarket.model;

import lombok.*;
import java.time.LocalDateTime;

/**
 * Entity for table LOG Ú¿” represents system log entries (auditing, triggers, etc.).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Log {

    private Long idLog;

    private String tabulkaNazev;

    private String operace;

    private String staraData;

    private String novaData;

    private LocalDateTime datumZmeny;

    private String idRekord;

    private String popis;

    private Archiv archiv;

    protected void onCreate() {
        if (datumZmeny == null) {
            datumZmeny = LocalDateTime.now();
        }
    }
}

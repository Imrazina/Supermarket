package dreamteam.com.supermarket.model.user;

import lombok.*;

/**
 * Entity for table NOTIFIKACE Ú¿” stores push subscription metadata per message.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notifikace {

    private Long idNotifikace;

    private Long zpravaId;

    private Zpravy zprava;

    private String authToken;

    private String endPoint;

    private String p256dh;

    private String adresat;

    public void setZprava(Zpravy zprava) {
        this.zprava = zprava;
        this.zpravaId = zprava != null ? zprava.getId() : null;
    }
}

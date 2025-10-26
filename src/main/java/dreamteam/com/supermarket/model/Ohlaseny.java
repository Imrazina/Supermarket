package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table OHLASENY – web push subscriptions bound to messages.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "OHLASENY")
public class Ohlaseny {

    @EmbeddedId
    private OhlasenyId id;

    @Column(name = "AUTHTOKEN", nullable = false, length = 555)
    private String authToken;

    @Column(name = "KONECOVYBOD", nullable = false, length = 444)
    private String konecovyBod;

    @Column(name = "P256DH", nullable = false, length = 512)
    private String p256dh;

    @Column(name = "ARDESAT", nullable = false, length = 255)
    private String ardesat;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("zpravyId")
    @JoinColumn(name = "ZPRAVY_ID_ZPRAVY", nullable = false, unique = true)
    private Zpravy zpravy;
}

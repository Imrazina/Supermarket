package dreamteam.com.supermarket.model.user;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table NOTIFIKACE – stores push subscription metadata per message.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(NotifikaceId.class)
@Table(name = "NOTIFIKACE")
public class Notifikace {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_notifikace")
    @SequenceGenerator(name = "seq_notifikace", sequenceName = "SEQ_NOTIFIKACE_ID", allocationSize = 1)
    @Column(name = "ID_NOTIFIKACE")
    private Long idNotifikace;

    @Id
    @Column(name = "ID_ZPRAVA")
    private Long zpravaId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ID_ZPRAVA", insertable = false, updatable = false, unique = true)
    private Zpravy zprava;

    @Column(name = "AUTHTOKEN", nullable = false, length = 555)
    private String authToken;

    @Column(name = "ENDPOINT", nullable = false, length = 444)
    private String endPoint;

    @Column(name = "P256DH", nullable = false, length = 512)
    private String p256dh;

    @Column(name = "ADRESAT", nullable = false, length = 255)
    private String adresat;

    public void setZprava(Zpravy zprava) {
        this.zprava = zprava;
        this.zpravaId = zprava != null ? zprava.getId() : null;
    }
}

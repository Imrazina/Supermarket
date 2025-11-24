package dreamteam.com.supermarket.model.market;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table STATUS - defines allowed order states.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "STATUS")
public class ObjednavkaStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_status")
    @SequenceGenerator(name = "seq_status", sequenceName = "SEQ_STATUS_ID", allocationSize = 1)
    @Column(name = "ID_STATUS")
    private Long idStatus;

    @Column(name = "NAZEV", nullable = false, length = 66)
    private String nazev;
}

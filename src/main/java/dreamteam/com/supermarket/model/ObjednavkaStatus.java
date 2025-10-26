package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table OBJEDNAVKA_STATUS - defines allowed order states.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "OBJEDNAVKA_STATUS")
public class ObjednavkaStatus {

    @Id
   // @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_objednavka_status")
  //  @SequenceGenerator(name = "seq_objednavka_status", sequenceName = "OBJEDNAVKA_STATUS_SEQ", allocationSize = 1)
    @Column(name = "ID_STATUSU")
    private Long idStatusu;

    @Column(name = "NAZEV", nullable = false, length = 66)
    private String nazev;
}

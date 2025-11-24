package dreamteam.com.supermarket.model.user;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table APP_ROLE - defines user roles in the system.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "APP_ROLE")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_role")
    @SequenceGenerator(name = "seq_role", sequenceName = "SEQ_ROLE_ID", allocationSize = 1)
    @Column(name = "ID_ROLE")
    private Long idRole;

    @Column(name = "NAZEV", nullable = false, unique = true, length = 20)
    private String nazev;
}

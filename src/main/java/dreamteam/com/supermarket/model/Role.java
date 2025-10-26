package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table ROLE - defines user or employee roles in the system.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "ROLE")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_role")
    @SequenceGenerator(name = "seq_role", sequenceName = "SEQ_ROLE", allocationSize = 1)
    @Column(name = "ID_ROLE")
    private Long idRole;

    @Column(name = "NAZEVROLE", nullable = false, unique = true, length = 50)
    private String nazevRole;
}

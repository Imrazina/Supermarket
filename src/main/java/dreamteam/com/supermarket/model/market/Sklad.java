package dreamteam.com.supermarket.model.market;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table SKLAD - represents warehouse belonging to a supermarket.
 */
@Entity
@Data
@EqualsAndHashCode(exclude = "supermarket")
@ToString(exclude = "supermarket")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "SKLAD")
public class Sklad {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_sklad")
    @SequenceGenerator(name = "seq_sklad", sequenceName = "SEQ_SKALD_ID", allocationSize = 1)
    @Column(name = "ID_SKLAD")
    private Long idSklad;

    @Column(name = "NAZEV", nullable = false, unique = true, length = 33)
    private String nazev;

    @Column(name = "KAPACITA", nullable = false)
    private Integer kapacita;

    @Column(name = "TELEFONNICISLO", nullable = false, length = 20)
    private String telefonniCislo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ID_SUPERMARKET", nullable = false)
    private Supermarket supermarket;
}

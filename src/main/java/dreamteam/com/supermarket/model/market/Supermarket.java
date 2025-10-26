package dreamteam.com.supermarket.model.market;

import dreamteam.com.supermarket.model.location.Adresa;
import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table SUPERMARKET - main branch/store entity.
 */
@Entity
@Data
@EqualsAndHashCode(exclude = "sklad")
@ToString(exclude = "sklad")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "SUPERMARKET")
public class Supermarket {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_supermarket")
    @SequenceGenerator(name = "seq_supermarket", sequenceName = "SUPERMARKET_SEQ", allocationSize = 1)
    @Column(name = "ID_SUPERMARKET")
    private Long idSupermarket;

    @Column(name = "NAZEV", nullable = false, unique = true, length = 100)
    private String nazev;

    @Column(name = "TELEFON", nullable = false)
    private Long telefon;

    @Column(name = "EMAIL", nullable = false, length = 35)
    private String email;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ADRESA_ID_ADRESA", nullable = false)
    private Adresa adresa;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "SKLAD_ID_SKLADU", nullable = false, unique = true)
    private Sklad sklad;
}

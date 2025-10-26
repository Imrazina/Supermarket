package dreamteam.com.supermarket.model;

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
    @SequenceGenerator(name = "seq_sklad", sequenceName = "SKLAD_SEQ", allocationSize = 1)
    @Column(name = "ID_SKLADU")
    private Long idSkladu;

    @Column(name = "NAZEV", nullable = false, unique = true, length = 33)
    private String nazev;

    @Column(name = "KAPACITA", nullable = false)
    private Integer kapacita;

    @Column(name = "TELEFONNICISLO", nullable = false, length = 55)
    private String telefonniCislo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ADRESA_ID_ADRESA", nullable = false)
    private Adresa adresa;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "SUPERMARKET_ID_SUPERMARKET", nullable = false, unique = true)
    private Supermarket supermarket;
}

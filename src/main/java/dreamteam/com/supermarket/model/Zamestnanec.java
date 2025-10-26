package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

/**
 * Entity for table ZAMESTNANEC - represents an employee working in a supermarket.
 */
@Entity
@Data
@EqualsAndHashCode(exclude = {"nadrizeny", "supermarket", "adresa", "pozice"})
@ToString(exclude = {"nadrizeny", "supermarket", "adresa", "pozice"})
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "ZAMESTNANEC")
public class Zamestnanec {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_zamestnanec")
    @SequenceGenerator(name = "seq_zamestnanec", sequenceName = "ZAMESTNANEC_SEQ", allocationSize = 1)
    @Column(name = "ID_ZAMESTNANEC")
    private Long idZamestnanec;

    @Column(name = "JMENO", nullable = false, length = 33)
    private String jmeno;

    @Column(name = "PRIJMENI", nullable = false, length = 33)
    private String prijmeni;

    @Column(name = "TELEFON", nullable = false)
    private Long telefon;

    @Column(name = "EMAIL", nullable = false, length = 111)
    private String email;

    @Column(name = "MZDA", nullable = false, precision = 12, scale = 2)
    private BigDecimal mzda;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ZAMESTNANEC_ID_ZAMESTNANEC")
    private Zamestnanec nadrizeny;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "SUPERMARKET_ID_SUPERMARKET", nullable = false)
    private Supermarket supermarket;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ADRESA_ID_ADRESA", nullable = false)
    private Adresa adresa;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "POZICE_ID_POZICE", nullable = false)
    private Pozice pozice;
}

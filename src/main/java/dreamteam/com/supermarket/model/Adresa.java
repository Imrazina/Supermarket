package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

/**
 * Entity for table ADRESA - stores address details of supermarkets or customers.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "ADRESA")
public class Adresa implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_adresa")
    @SequenceGenerator(name = "seq_adresa", sequenceName = "ADRESA_SEQ", allocationSize = 1)
    @Column(name = "ID_ADRESA")
    private Long idAdresa;

    @Column(name = "ULICE", nullable = false, length = 55)
    private String ulice;

    @Column(name = "CISLOPOPISNE", nullable = false, length = 33)
    private String cisloPopisne;

    @Column(name = "CISLOORIENTACNI", nullable = false, length = 33)
    private String cisloOrientacni;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "MESTO_PSC", referencedColumnName = "PSC", nullable = false)
    private Mesto mesto;
}

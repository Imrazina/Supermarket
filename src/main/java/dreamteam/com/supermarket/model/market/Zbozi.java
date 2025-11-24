package dreamteam.com.supermarket.model.market;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

/**
 * Entity for table ZBOZI - represents goods/products in the system.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "ZBOZI")
public class Zbozi {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_zbozi")
    @SequenceGenerator(name = "seq_zbozi", sequenceName = "SEQ_ZBOZI_ID", allocationSize = 1)
    @Column(name = "ID_ZBOZI")
    private Long idZbozi;

    @Column(name = "NAZEV", nullable = false, unique = true, length = 55)
    private String nazev;

    @Column(name = "CENA", nullable = false, precision = 12, scale = 2)
    private BigDecimal cena;

    @Column(name = "MNOZSTVI", nullable = false)
    private Integer mnozstvi;

    @Column(name = "MINMNOZSTVI", nullable = false)
    private Integer minMnozstvi;

    @Lob
    @Column(name = "POPIS")
    private String popis;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "SKLAD_ID_SKLAD", nullable = false)
    private Sklad sklad;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ID_KATEGORIE", nullable = false)
    private KategorieZbozi kategorie;
}

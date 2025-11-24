package dreamteam.com.supermarket.model.market;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table KATEGORIE_ZBOZI - represents product categories (reference table).
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "KATEGORIE_ZBOZI")
public class KategorieZbozi {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_kategorie_zbozi")
    @SequenceGenerator(name = "seq_kategorie_zbozi", sequenceName = "SEQ_KATEGORIE_ID", allocationSize = 1)
    @Column(name = "ID_KATEGORIE")
    private Long idKategorie;

    @Column(name = "NAZEV", nullable = false, length = 44, unique = true)
    private String nazev;

    @Column(name = "POPIS", length = 111)
    private String popis;
}

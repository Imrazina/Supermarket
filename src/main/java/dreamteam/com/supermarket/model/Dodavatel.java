package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table DODAVATEL - represents suppliers of goods.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "DODAVATEL")
public class Dodavatel {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_dodavatel")
    @SequenceGenerator(name = "seq_dodavatel", sequenceName = "DODAVATEL_SEQ", allocationSize = 1)
    @Column(name = "ID_DODAVATEL")
    private Long idDodavatel;

    @Column(name = "NAZEV", nullable = false, length = 33, unique = true)
    private String nazev;

    @Column(name = "KONTAKTNIOSOBA", nullable = false, length = 111)
    private String kontaktniOsoba;

    @Column(name = "TELEFON", nullable = false)
    private Long telefon;

    @Column(name = "EMAIL", nullable = false, length = 111)
    private String email;
}

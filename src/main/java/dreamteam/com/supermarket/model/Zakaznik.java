package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table ZAKAZNIK - represents a customer of the supermarket.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "ZAKAZNIK")
public class Zakaznik {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_zakaznik")
    @SequenceGenerator(name = "seq_zakaznik", sequenceName = "SEQ_ZAKAZNIK", allocationSize = 1)
    @Column(name = "ID_ZAKAZNIK")
    private Long idZakaznik;

    @Column(name = "MOBILCISLO", nullable = false)
    private Long mobilCislo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ADRESA_ID_ADRESA")
    private Adresa adresa;
}

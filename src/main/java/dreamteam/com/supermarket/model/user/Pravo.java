package dreamteam.com.supermarket.model.user;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "PRAVO")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pravo {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_pravo")
    @SequenceGenerator(name = "seq_pravo", sequenceName = "SEQ_PRAVO_ID", allocationSize = 1)
    @Column(name = "ID_PRAVO")
    private Long idPravo;

    @Column(name = "NAZEV", nullable = false, length = 20)
    private String nazev;

    @Column(name = "KOD", nullable = false, unique = true, length = 255)
    private String kod;

    @Lob
    @Column(name = "POPIS")
    private String popis;
}

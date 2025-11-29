package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;
/**
 * Entity for table ARCHIV – stores historical records of file versions or actions.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "ARCHIV")
public class Archiv {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_archiv")
    @SequenceGenerator(name = "seq_archiv", sequenceName = "SEQ_ARCHIV_ID", allocationSize = 1)
    @Column(name = "ID_ARCHIV")
    private Long idArchiv;

    @Column(name = "NAZEV", nullable = false, length = 33)
    private String nazev;

    @Lob
    @Column(name = "POPIS")
    private String popis;

    @Column(name = "PARENT_ID")
    private Long parentId;
}

package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table POZICE - represents a job position of an employee.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "POZICE")
public class Pozice {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_pozice")
    @SequenceGenerator(name = "seq_pozice", sequenceName = "SEQ_POZICE", allocationSize = 1)
    @Column(name = "ID_POZICE")
    private Long idPozice;

    @Column(name = "NAZEV", nullable = false, unique = true, length = 30)
    private String nazev;

    @Column(name = "POZNAMKA", length = 250)
    private String poznamka;
}

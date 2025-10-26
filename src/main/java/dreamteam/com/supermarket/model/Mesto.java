package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table MESTO - represents cities used for addresses.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "MESTO")
public class Mesto {

    @Id
    @Column(name = "PSC", columnDefinition = "CHAR(5)")
    private String psc;

    @Column(name = "NAZEV", nullable = false, length = 45)
    private String nazev;

    @Column(name = "KRAJ", nullable = false, length = 55)
    private String kraj;
}
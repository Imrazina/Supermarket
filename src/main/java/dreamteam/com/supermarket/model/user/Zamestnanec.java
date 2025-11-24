package dreamteam.com.supermarket.model.user;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Entity for table ZAMESTNANEC - stores employee specific data (salary, position).
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "ZAMESTNANEC")
public class Zamestnanec {

    @Id
    @Column(name = "ID_UZIVATELU")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "ID_UZIVATELU")
    private Uzivatel uzivatel;

    @Column(name = "MZDA", nullable = false, precision = 10, scale = 2)
    private BigDecimal mzda;

    @Column(name = "DATUMNASTUPA", nullable = false)
    private LocalDate datumNastupa;

    @Column(name = "POZICE", nullable = false, length = 50)
    private String pozice;
}

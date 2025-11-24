package dreamteam.com.supermarket.model.user;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table ZAKAZNIK - additional data for customer users.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "ZAKAZNIK")
public class Zakaznik {

    @Id
    @Column(name = "ID_UZIVATELU")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "ID_UZIVATELU")
    private Uzivatel uzivatel;

    @Column(name = "KARTAVERNOSTI", length = 20, unique = true)
    private String kartaVernosti;
}

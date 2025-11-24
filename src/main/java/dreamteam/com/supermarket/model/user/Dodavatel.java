package dreamteam.com.supermarket.model.user;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity for table DODAVATEL - supplier specific data linked to a user.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "DODAVATEL")
public class Dodavatel {

    @Id
    @Column(name = "ID_UZIVATELU")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "ID_UZIVATELU")
    private Uzivatel uzivatel;

    @Column(name = "FIRMA", nullable = false, length = 100, unique = true)
    private String firma;
}

package dreamteam.com.supermarket.model.user;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "UZIVATEL")
public class Uzivatel implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_uzivatel")
    @SequenceGenerator(name = "seq_uzivatel", sequenceName = "UZIVATEL_SEQ", allocationSize = 1)
    @Column(name = "ID_UZIVATELU")
    private Long idUzivatelu;

    @Column(name = "JMENO", nullable = false, length = 15)
    private String jmeno;

    @Column(name = "PRIJMENI", nullable = false, length = 15)
    private String prijmeni;

    @Column(name = "EMAIL", nullable = false, length = 77, unique = true)
    private String email;

    @Column(name = "HESLO", nullable = false, length = 100)
    private String heslo;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "ROLE_ID_ROLE", nullable = false)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ZAKAZNIK_ID_ZAKAZNIK")
    private Zakaznik zakaznik;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ZAMESTNANEC_ID_ZAMESTNANEC")
    private Zamestnanec zamestnanec;

    @Transient
    private LocalDateTime datumVytvoreni = LocalDateTime.now();

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.getNazevRole()));
    }

    @Override
    public String getPassword() {
        return heslo;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}

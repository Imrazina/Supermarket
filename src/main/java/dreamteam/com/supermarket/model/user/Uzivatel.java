package dreamteam.com.supermarket.model.user;

import dreamteam.com.supermarket.model.location.Adresa;
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
    @SequenceGenerator(name = "seq_uzivatel", sequenceName = "SEQ_UZIVATEL_ID", allocationSize = 1)
    @Column(name = "ID_UZIVATEL")
    private Long idUzivatel;

    @Column(name = "JMENO", nullable = false, length = 15)
    private String jmeno;

    @Column(name = "PRIJMENI", nullable = false, length = 15)
    private String prijmeni;

    @Column(name = "EMAIL", nullable = false, length = 255, unique = true)
    private String email;

    @Column(name = "HESLO", nullable = false, length = 255)
    private String heslo;

    @Column(name = "TELEFONNICISLO", nullable = false, length = 20, unique = true)
    private String telefonniCislo;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "ID_ROLE")
    private Role role;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_ADRESA")
    private Adresa adresa;

    @Transient
    private LocalDateTime datumVytvoreni = LocalDateTime.now();

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.getNazev()));
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

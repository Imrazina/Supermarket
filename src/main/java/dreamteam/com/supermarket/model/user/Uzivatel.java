package dreamteam.com.supermarket.model.user;

import dreamteam.com.supermarket.model.location.Adresa;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Uzivatel implements UserDetails {

    private Long idUzivatel;

    private String jmeno;

    private String prijmeni;

    private String email;

    private String heslo;

    private String telefonniCislo;

    private Role role;

    @ToString.Exclude
    private Adresa adresa;

    @Builder.Default
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

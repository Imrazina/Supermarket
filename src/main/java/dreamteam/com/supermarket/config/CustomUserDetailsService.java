package dreamteam.com.supermarket.config;

import dreamteam.com.supermarket.Service.UserJdbcService;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserJdbcService userJdbcService;

    public CustomUserDetailsService(UserJdbcService userJdbcService) {
        this.userJdbcService = userJdbcService;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String normalizedUsername = username == null ? "" : username.trim().toLowerCase();
        var uzivatel = userJdbcService.findByEmail(normalizedUsername);
        if (uzivatel == null) {
            throw new UsernameNotFoundException("User not found: " + normalizedUsername);
        }
        return uzivatel;
    }
}

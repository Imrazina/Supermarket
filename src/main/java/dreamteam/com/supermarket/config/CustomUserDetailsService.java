package dreamteam.com.supermarket.config;

import dreamteam.com.supermarket.repository.UzivatelRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UzivatelRepository uzivatelRepository;

    public CustomUserDetailsService(UzivatelRepository uzivatelRepository) {
        this.uzivatelRepository = uzivatelRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        System.out.println(" Ищем пользователя: " + username);
        return uzivatelRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }
}

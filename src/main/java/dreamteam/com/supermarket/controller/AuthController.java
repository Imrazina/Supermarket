package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.controller.dto.LoginRequest;
import dreamteam.com.supermarket.controller.dto.RegisterRequest;
import dreamteam.com.supermarket.jwt.JwtUtil;
import dreamteam.com.supermarket.model.user.Role;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.repository.RoleRepository;
import dreamteam.com.supermarket.repository.UzivatelRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "http://localhost:8000")
@Validated
public class AuthController {

    private static final String DEFAULT_ROLE_NAME = "NEW_USER";

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private UzivatelRepository uzivatelRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String firstName = request.getFirstName().trim();
        String lastName = request.getLastName().trim();

        if (uzivatelRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already registered"));
        }

        Role role = resolveDefaultRole();

        Uzivatel newUser = Uzivatel.builder()
                .jmeno(firstName)
                .prijmeni(lastName)
                .email(email)
                .heslo(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .build();

        Uzivatel savedUser = uzivatelRepository.save(newUser);
        return ResponseEntity.ok(Map.of(
                "message", "User registered successfully",
                "email", savedUser.getEmail(),
                "role", savedUser.getRole().getNazevRole()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String password = request.getPassword();

        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, password));

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        Uzivatel uzivatel = uzivatelRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
        String token = jwtUtil.generateToken(userDetails);

        return ResponseEntity.ok(Map.of(
                "token", token,
                "email", uzivatel.getEmail(),
                "fullName", uzivatel.getJmeno() + " " + uzivatel.getPrijmeni(),
                "role", uzivatel.getRole().getNazevRole()
        ));
    }

    private Role resolveDefaultRole() {
        return roleRepository.findByNazevRole(DEFAULT_ROLE_NAME)
                .orElseGet(() -> roleRepository.save(Role.builder().nazevRole(DEFAULT_ROLE_NAME).build()));
    }
}

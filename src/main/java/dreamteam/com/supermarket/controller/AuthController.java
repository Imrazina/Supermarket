package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.jwt.JwtUtil;
import dreamteam.com.supermarket.model.Role;
import dreamteam.com.supermarket.model.Uzivatel;
import dreamteam.com.supermarket.repository.RoleRepository;
import dreamteam.com.supermarket.repository.UzivatelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "http://localhost:8000")
public class AuthController {

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
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");
        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and password are required"));
        }

        if (uzivatelRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already registered"));
        }

        String username = request.getOrDefault("username", email);
        String firstName = request.getOrDefault("firstName", username);
        String lastName = request.getOrDefault("lastName", "User");

        Role role = roleRepository.findByNazevRole("USER")
                .orElseGet(() -> roleRepository.save(Role.builder().nazevRole("USER").build()));

        Uzivatel newUser = Uzivatel.builder()
                .jmeno(firstName)
                .prijmeni(lastName)
                .email(email)
                .heslo(passwordEncoder.encode(password))
                .role(role)
                .build();

        uzivatelRepository.save(newUser);
        return ResponseEntity.ok(Map.of("message", "User registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");

        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password));

        //  Загружаем пользователя из БД после аутентификации
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        String token = jwtUtil.generateToken(userDetails);

        return ResponseEntity.ok(Map.of("token", token, "username", userDetails.getUsername()));
    }
}

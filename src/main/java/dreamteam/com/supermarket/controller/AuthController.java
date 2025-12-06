package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.controller.dto.LoginRequest;
import dreamteam.com.supermarket.controller.dto.RegisterRequest;
import dreamteam.com.supermarket.Service.AuthJdbcService;
import dreamteam.com.supermarket.Service.UserJdbcService;
import dreamteam.com.supermarket.jwt.JwtUtil;
import dreamteam.com.supermarket.model.user.Role;
import dreamteam.com.supermarket.model.user.Uzivatel;
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
    private AuthJdbcService authJdbcService;

    @Autowired
    private UserJdbcService userJdbcService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String firstName = request.getFirstName().trim();
        String lastName = request.getLastName().trim();
        String phoneNumber = request.getPhoneNumber().trim();

        if (authJdbcService.emailExists(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already registered"));
        }

        if (authJdbcService.phoneExists(phoneNumber)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Phone already registered"));
        }

        Role role = resolveDefaultRole();

        String hashed = passwordEncoder.encode(request.getPassword());
        Uzivatel savedUser = authJdbcService.createUser(firstName, lastName, email, hashed, phoneNumber, role.getIdRole());
        return ResponseEntity.ok(Map.of(
                "message", "User registered successfully",
                "email", savedUser.getEmail(),
                "role", savedUser.getRole().getNazev()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String password = request.getPassword();

        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, password));

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        Uzivatel uzivatel = userJdbcService.findByEmail(email);
        if (uzivatel == null) {
            throw new UsernameNotFoundException("User not found: " + email);
        }
        String token = jwtUtil.generateToken(userDetails);

        return ResponseEntity.ok(Map.of(
                "token", token,
                "email", uzivatel.getEmail(),
                "fullName", uzivatel.getJmeno() + " " + uzivatel.getPrijmeni(),
                "role", uzivatel.getRole().getNazev()
        ));
    }

    private Role resolveDefaultRole() {
        Role role = authJdbcService.findRoleByName(DEFAULT_ROLE_NAME);
        if (role != null) return role;
        return authJdbcService.createRole(DEFAULT_ROLE_NAME);
    }
}

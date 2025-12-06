package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.Service.ProfileService;
import dreamteam.com.supermarket.controller.dto.PravoResponse;
import dreamteam.com.supermarket.controller.dto.ProfileMetaResponse;
import dreamteam.com.supermarket.controller.dto.ProfileUpdateRequest;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.Service.UserJdbcService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collection;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ProfileController {

    private final ProfileService profileService;
    private final UserJdbcService userJdbcService;

    public ProfileController(ProfileService profileService, UserJdbcService userJdbcService) {
        this.profileService = profileService;
        this.userJdbcService = userJdbcService;
    }

    @GetMapping("/prava")
    public List<PravoResponse> listPermissions() {
        return profileService.getPermissions();
    }

    @GetMapping("/profile/meta")
    public ResponseEntity<?> profileMeta(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!hasAdminAuthority(authentication.getAuthorities())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(profileService.getProfileMeta());
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody ProfileUpdateRequest request,
                                           Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!hasAdminAuthority(authentication.getAuthorities())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Pouze ADMIN může upravit profil.");
        }
        Uzivatel user = userJdbcService.findByEmail(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            profileService.updateProfile(user, request);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
        return ResponseEntity.ok().build();
    }

    private boolean hasAdminAuthority(Collection<? extends GrantedAuthority> authorities) {
        if (authorities == null) {
            return false;
        }
        return authorities.stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(auth -> auth != null && auth.equalsIgnoreCase("ROLE_ADMIN"));
    }
}

package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.Service.AdminUserService;
import dreamteam.com.supermarket.controller.dto.AdminUserResponse;
import dreamteam.com.supermarket.controller.dto.AdminUserUpdateRequest;
import dreamteam.com.supermarket.controller.dto.ImpersonationResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public ResponseEntity<List<AdminUserResponse>> listUsers(@RequestParam(value = "role", required = false) String role,
                                                             Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(adminUserService.listUsers(role));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id,
                                        @Valid @RequestBody AdminUserUpdateRequest request,
                                        Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            adminUserService.updateUser(id, request);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PostMapping("/{id}/impersonate")
    public ResponseEntity<?> impersonate(@PathVariable Long id, Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            ImpersonationResponse response = adminUserService.impersonate(id);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PostMapping("/hash-passwords")
    public ResponseEntity<?> hashPlainPasswords(Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        int updated = adminUserService.encodePlainPasswords();
        return ResponseEntity.ok("Zahashováno " + updated + " hesel.");
    }

    private boolean isAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return hasAdminAuthority(authentication.getAuthorities());
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

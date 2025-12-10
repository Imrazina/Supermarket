package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.Service.AdminUserService;
import dreamteam.com.supermarket.Service.PermissionService;
import dreamteam.com.supermarket.controller.dto.AdminUserResponse;
import dreamteam.com.supermarket.controller.dto.AdminUserUpdateRequest;
import dreamteam.com.supermarket.controller.dto.ImpersonationResponse;
import dreamteam.com.supermarket.controller.dto.RoleDependencyResponse;
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
    private final PermissionService permissionService;

    public AdminUserController(AdminUserService adminUserService, PermissionService permissionService) {
        this.adminUserService = adminUserService;
        this.permissionService = permissionService;
    }

    @GetMapping
    public ResponseEntity<List<AdminUserResponse>> listUsers(@RequestParam(value = "role", required = false) String role,
                                                             Authentication authentication) {
        if (!hasAccess(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(adminUserService.listUsers(role));
    }

    @GetMapping("/{id}/role-deps")
    public ResponseEntity<?> roleDependencies(@PathVariable Long id, Authentication authentication) {
        if (!hasAccess(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            RoleDependencyResponse resp = adminUserService.getRoleDependencies(id);
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @GetMapping("/loyalty-next")
    public ResponseEntity<?> nextLoyalty(Authentication authentication) {
        if (!hasAccess(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(adminUserService.nextLoyaltyCard());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id,
                                        @Valid @RequestBody AdminUserUpdateRequest request,
                                        Authentication authentication) {
        if (!hasAccess(authentication)) {
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
        if (!hasAccess(authentication)) {
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
        if (!hasAccess(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        int updated = adminUserService.encodePlainPasswords();
        return ResponseEntity.ok("Zahashováno " + updated + " hesel.");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id,
                                        @RequestParam(value = "force", defaultValue = "0") int force,
                                        Authentication authentication) {
        if (!hasAccess(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            adminUserService.deleteUser(id, force == 1);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    private boolean hasAccess(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        if (hasAdminAuthority(authentication.getAuthorities())) {
            return true;
        }
        return permissionService.hasPermission(authentication, "MANAGE_USERS");
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

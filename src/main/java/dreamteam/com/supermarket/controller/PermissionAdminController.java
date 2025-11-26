package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.Service.PermissionService;
import dreamteam.com.supermarket.controller.dto.PravoRequest;
import dreamteam.com.supermarket.controller.dto.PravoResponse;
import dreamteam.com.supermarket.controller.dto.RolePermissionsRequest;
import dreamteam.com.supermarket.controller.dto.RolePermissionsResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class PermissionAdminController {

    private final PermissionService permissionService;

    public PermissionAdminController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping("/prava")
    public ResponseEntity<List<PravoResponse>> list(Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(permissionService.getAll());
    }

    @PostMapping("/prava")
    public ResponseEntity<?> create(@Valid @RequestBody PravoRequest request, Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(permissionService.create(request));
    }

    @PutMapping("/prava/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @Valid @RequestBody PravoRequest request,
                                    Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            return ResponseEntity.ok(permissionService.update(id, request));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @DeleteMapping("/prava/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        permissionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/roles")
    public ResponseEntity<List<RolePermissionsResponse>> roles(Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(permissionService.getRolePermissions());
    }

    @PutMapping("/roles/{roleId}/permissions")
    public ResponseEntity<?> updateRolePermissions(@PathVariable Long roleId,
                                                   @Valid @RequestBody RolePermissionsRequest request,
                                                   Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            permissionService.updateRolePermissions(roleId, request);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
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

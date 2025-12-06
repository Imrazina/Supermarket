package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.Service.DbMetadataService;
import dreamteam.com.supermarket.Service.PermissionService;
import dreamteam.com.supermarket.controller.dto.DbObjectResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/db-objects")
public class DbMetadataController {

    private final DbMetadataService dbMetadataService;
    private final PermissionService permissionService;

    public DbMetadataController(DbMetadataService dbMetadataService,
                                PermissionService permissionService) {
        this.dbMetadataService = dbMetadataService;
        this.permissionService = permissionService;
    }

    @GetMapping
    public ResponseEntity<List<DbObjectResponse>> listObjects(Authentication authentication) {
        if (!hasAccess(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(dbMetadataService.listObjects());
    }

    @GetMapping("/ddl")
    public ResponseEntity<String> getDdl(@RequestParam("type") String type,
                                         @RequestParam("name") String name,
                                         Authentication authentication) {
        if (!hasAccess(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String ddl = dbMetadataService.getDdl(type, name);
        if (ddl == null || ddl.isBlank()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("DDL nenalezeno.");
        }
        return ResponseEntity.ok(ddl);
    }

    private boolean hasAccess(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        if (hasAdminAuthority(authentication.getAuthorities())) {
            return true;
        }
        String email = authentication.getName();
        return permissionService.userHasPermission(email, "VIEW_DB_OBJECTS");
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

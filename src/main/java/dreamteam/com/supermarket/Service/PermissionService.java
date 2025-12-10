package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.PravoRequest;
import dreamteam.com.supermarket.controller.dto.PravoResponse;
import dreamteam.com.supermarket.controller.dto.RolePermissionsRequest;
import dreamteam.com.supermarket.controller.dto.RolePermissionsResponse;
import dreamteam.com.supermarket.repository.PermissionProcedureDao;
import dreamteam.com.supermarket.repository.RoleProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final PermissionProcedureDao permissionDao;
    private final UserJdbcService userJdbcService;
    private final RolePravoJdbcService rolePravoJdbcService;
    private final RoleProcedureDao roleProcedureDao;

    public List<PravoResponse> getAll() {
        return permissionDao.listPermissions().stream()
                .sorted(Comparator.comparing(PermissionProcedureDao.Permission::code, String.CASE_INSENSITIVE_ORDER))
                .map(this::mapToResponse)
                .toList();
    }

    public PravoResponse create(PravoRequest request) {
        String code = normalizeCode(request.getCode());
        Long id = permissionDao.savePermission(
                null,
                request.getName(),
                code,
                request.getDescription()
        );
        return new PravoResponse(id, code, request.getName(), request.getDescription());
    }

    public PravoResponse update(Long id, PravoRequest request) {
        if (id == null) {
            throw new IllegalArgumentException("ID nesmí být prázdné");
        }
        String code = normalizeCode(request.getCode());
        permissionDao.savePermission(id, request.getName(), code, request.getDescription());
        return new PravoResponse(id, code, request.getName(), request.getDescription());
    }

    public void delete(Long id) {
        permissionDao.deletePermission(id);
    }

    public List<RolePermissionsResponse> getRolePermissions() {
        List<PermissionProcedureDao.RolePermissionRow> rows = permissionDao.listRolePermissions();
        Map<Long, List<String>> grouped = rows.stream()
                .collect(Collectors.groupingBy(
                        PermissionProcedureDao.RolePermissionRow::roleId,
                        Collectors.mapping(PermissionProcedureDao.RolePermissionRow::permissionCode, Collectors.toCollection(ArrayList::new))
                ));
        var roles = roleProcedureDao.list();
        return roles.stream()
                .map(role -> new RolePermissionsResponse(
                        role.id(),
                        role.name(),
                        grouped.getOrDefault(role.id(), List.of()).stream()
                                .filter(code -> code != null && !code.isBlank())
                                .sorted(String.CASE_INSENSITIVE_ORDER)
                                .toList()
                ))
                .sorted(Comparator.comparing(RolePermissionsResponse::roleName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    public void updateRolePermissions(Long roleId, RolePermissionsRequest request) {
        if (roleId == null) {
            throw new IllegalArgumentException("roleId nesmí být prázdné");
        }
        permissionDao.updateRolePermissions(roleId, request != null ? request.getPermissionCodes() : null);
    }

    public boolean userHasPermission(String email, String permissionCode) {
        if (email == null || permissionCode == null) {
            return false;
        }
        return permissionDao.userHasPermission(
                email.trim().toLowerCase(Locale.ROOT),
                permissionCode.trim().toUpperCase(Locale.ROOT)
        );
    }

    public boolean hasPermission(Authentication authentication, String permissionCode) {
        if (authentication == null || !authentication.isAuthenticated() || permissionCode == null) {
            return false;
        }
        return userHasPermission(authentication.getName(), permissionCode);
    }

    private PravoResponse mapToResponse(PermissionProcedureDao.Permission permission) {
        return new PravoResponse(
                permission.id(),
                permission.code(),
                permission.name(),
                permission.descr()
        );
    }

    private String normalizeCode(String code) {
        return code == null ? null : code.trim().toUpperCase(Locale.ROOT);
    }
}

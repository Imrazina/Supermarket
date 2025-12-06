package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.PravoRequest;
import dreamteam.com.supermarket.controller.dto.PravoResponse;
import dreamteam.com.supermarket.controller.dto.RolePermissionsRequest;
import dreamteam.com.supermarket.controller.dto.RolePermissionsResponse;
import dreamteam.com.supermarket.model.user.Pravo;
import dreamteam.com.supermarket.model.user.Role;
import dreamteam.com.supermarket.Service.PravoJdbcService;
import dreamteam.com.supermarket.Service.RoleJdbcService;
import dreamteam.com.supermarket.repository.PermissionProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final PravoJdbcService pravoJdbcService;
    private final RoleJdbcService roleJdbcService;
    private final RolePravoJdbcService rolePravoJdbcService;
    private final PermissionProcedureDao permissionDao;

    @Transactional(readOnly = true)
    public List<PravoResponse> getAll() {
        return permissionDao.listPermissions().stream()
                .map(p -> new PravoResponse(p.id(), p.code(), p.name(), p.descr()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RolePermissionsResponse> getRolePermissions() {
        Map<Long, RoleHolder> grouped = permissionDao.listRolePermissions().stream()
                .collect(Collectors.toMap(
                        PermissionProcedureDao.RolePermissionRow::roleId,
                        row -> {
                            List<String> perms = new java.util.ArrayList<>();
                            if (row.permissionCode() != null && !row.permissionCode().isBlank()) {
                                perms.add(row.permissionCode());
                            }
                            return new RoleHolder(row.roleId(), row.roleName(), perms);
                        },
                        (existing, incoming) -> {
                            if (incoming.permissions != null) {
                                existing.permissions.addAll(incoming.permissions);
                            }
                            return existing;
                        }
                ));
        return grouped.values().stream()
                .map(r -> new RolePermissionsResponse(r.roleId, r.roleName, List.copyOf(r.permissions)))
                .toList();
    }

    @Transactional
    public PravoResponse create(PravoRequest request) {
        Long id = permissionDao.savePermission(null, request.getName().trim(), request.getCode().trim(), request.getDescription());
        return new PravoResponse(id, request.getCode().trim(), request.getName().trim(), request.getDescription());
    }

    @Transactional
    public PravoResponse update(Long id, PravoRequest request) {
        Long savedId = permissionDao.savePermission(id, request.getName().trim(), request.getCode().trim(), request.getDescription());
        return new PravoResponse(savedId, request.getCode().trim(), request.getName().trim(), request.getDescription());
    }

    @Transactional
    public void delete(Long id) {
        permissionDao.deletePermission(id);
    }

    @Transactional
    public void updateRolePermissions(Long roleId, RolePermissionsRequest request) {
        permissionDao.updateRolePermissions(roleId, request.getPermissionCodes());
    }

    @Transactional(readOnly = true)
    public boolean userHasPermission(String email, String code) {
        return permissionDao.userHasPermission(email, code);
    }

    private record RoleHolder(Long roleId, String roleName, List<String> permissions) {}
}

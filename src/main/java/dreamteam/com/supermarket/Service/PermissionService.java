package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.PravoRequest;
import dreamteam.com.supermarket.controller.dto.PravoResponse;
import dreamteam.com.supermarket.controller.dto.RolePermissionsRequest;
import dreamteam.com.supermarket.controller.dto.RolePermissionsResponse;
import dreamteam.com.supermarket.model.user.Pravo;
import dreamteam.com.supermarket.model.user.Role;
import dreamteam.com.supermarket.Service.PravoJdbcService;
import dreamteam.com.supermarket.Service.RoleJdbcService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final PravoJdbcService pravoJdbcService;
    private final RoleJdbcService roleJdbcService;
    private final RolePravoJdbcService rolePravoJdbcService;

    @Transactional(readOnly = true)
    public List<PravoResponse> getAll() {
        return pravoJdbcService.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RolePermissionsResponse> getRolePermissions() {
        return roleJdbcService.findAll().stream()
                .map(role -> {
                    List<String> codes = rolePravoJdbcService.findCodesByRoleId(role.getIdRole());
                    return new RolePermissionsResponse(role.getIdRole(), role.getNazev(), codes);
                })
                .toList();
    }

    @Transactional
    public PravoResponse create(PravoRequest request) {
        Pravo pravo = new Pravo();
        applyRequest(pravo, request);
        return toResponse(pravoJdbcService.save(pravo));
    }

    @Transactional
    public PravoResponse update(Long id, PravoRequest request) {
        Pravo pravo = pravoJdbcService.findById(id);
        if (pravo == null) {
            throw new IllegalArgumentException("Pravo s ID " + id + " neexistuje.");
        }
        applyRequest(pravo, request);
        return toResponse(pravoJdbcService.save(pravo));
    }

    @Transactional
    public void delete(Long id) {
        if (!pravoJdbcService.existsById(id)) {
            return;
        }
        rolePravoJdbcService.deleteByPravoId(id);
        pravoJdbcService.deleteById(id);
    }

    @Transactional
    public void updateRolePermissions(Long roleId, RolePermissionsRequest request) {
        Role role = roleJdbcService.findById(roleId);
        if (role == null) {
            throw new IllegalArgumentException("Role s ID " + roleId + " neexistuje.");
        }
        rolePravoJdbcService.deleteByRoleId(roleId);
        (request.getPermissionCodes() == null ? List.<String>of() : request.getPermissionCodes()).stream()
                .map(String::trim)
                .filter(code -> !code.isBlank())
                .forEach(code -> {
                    Pravo pravo = pravoJdbcService.findByKod(code);
                    if (pravo == null) {
                        throw new IllegalArgumentException("Pravo " + code + " neexistuje.");
                    }
                    rolePravoJdbcService.insertMapping(pravo.getIdPravo(), role.getIdRole());
                });
    }

    private void applyRequest(Pravo pravo, PravoRequest request) {
        pravo.setNazev(request.getName().trim());
        pravo.setKod(request.getCode().trim());
        pravo.setPopis(request.getDescription());
    }

    private PravoResponse toResponse(Pravo pravo) {
        return new PravoResponse(
                pravo.getIdPravo(),
                pravo.getKod(),
                pravo.getNazev(),
                pravo.getPopis()
        );
    }
}

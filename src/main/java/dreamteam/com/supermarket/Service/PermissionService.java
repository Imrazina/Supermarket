package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.PravoRequest;
import dreamteam.com.supermarket.controller.dto.PravoResponse;
import dreamteam.com.supermarket.controller.dto.RolePermissionsRequest;
import dreamteam.com.supermarket.controller.dto.RolePermissionsResponse;
import dreamteam.com.supermarket.model.user.Pravo;
import dreamteam.com.supermarket.model.user.Role;
import dreamteam.com.supermarket.model.user.RolePravo;
import dreamteam.com.supermarket.model.user.RolePravoId;
import dreamteam.com.supermarket.repository.PravoRepository;
import dreamteam.com.supermarket.repository.RolePravoRepository;
import dreamteam.com.supermarket.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final PravoRepository pravoRepository;
    private final RoleRepository roleRepository;
    private final RolePravoRepository rolePravoRepository;

    @Transactional(readOnly = true)
    public List<PravoResponse> getAll() {
        return pravoRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RolePermissionsResponse> getRolePermissions() {
        return roleRepository.findAll().stream()
                .map(role -> {
                    List<String> codes = rolePravoRepository.findByRoleIdRole(role.getIdRole()).stream()
                            .map(rolePravo -> rolePravo.getPravo() != null ? rolePravo.getPravo().getKod() : null)
                            .filter(code -> code != null && !code.isBlank())
                            .toList();
                    return new RolePermissionsResponse(role.getIdRole(), role.getNazev(), codes);
                })
                .toList();
    }

    @Transactional
    public PravoResponse create(PravoRequest request) {
        Pravo pravo = new Pravo();
        applyRequest(pravo, request);
        return toResponse(pravoRepository.save(pravo));
    }

    @Transactional
    public PravoResponse update(Long id, PravoRequest request) {
        Pravo pravo = pravoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Právo s ID " + id + " neexistuje."));
        applyRequest(pravo, request);
        return toResponse(pravoRepository.save(pravo));
    }

    @Transactional
    public void delete(Long id) {
        if (!pravoRepository.existsById(id)) {
            return;
        }
        rolePravoRepository.deleteByPravo_IdPravo(id);
        pravoRepository.deleteById(id);
    }

    @Transactional
    public void updateRolePermissions(Long roleId, RolePermissionsRequest request) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new IllegalArgumentException("Role s ID " + roleId + " neexistuje."));
        rolePravoRepository.deleteByRoleIdRole(roleId);
        (request.getPermissionCodes() == null ? List.<String>of() : request.getPermissionCodes()).stream()
                .map(String::trim)
                .filter(code -> !code.isBlank())
                .forEach(code -> {
                    Pravo pravo = pravoRepository.findByKod(code)
                            .orElseThrow(() -> new IllegalArgumentException("Právo " + code + " neexistuje."));
                    RolePravo entity = RolePravo.builder()
                            .id(new RolePravoId(pravo.getIdPravo(), role.getIdRole()))
                            .pravo(pravo)
                            .role(role)
                            .build();
                    rolePravoRepository.save(entity);
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

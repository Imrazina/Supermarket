package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Role;
import dreamteam.com.supermarket.repository.RoleProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleJdbcService {

    private final RoleProcedureDao roleDao;

    public List<Role> findAll() {
        return roleDao.list().stream()
                .map(r -> Role.builder().idRole(r.id()).nazev(r.name()).build())
                .toList();
    }

    public Role findById(Long id) {
        if (id == null) return null;
        var r = roleDao.getById(id);
        return r == null ? null : Role.builder().idRole(r.id()).nazev(r.name()).build();
    }

    public Role findByNazev(String name) {
        if (name == null || name.isBlank()) return null;
        var r = roleDao.getByName(name);
        return r == null ? null : Role.builder().idRole(r.id()).nazev(r.name()).build();
    }
}

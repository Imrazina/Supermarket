package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.user.RolePravo;
import dreamteam.com.supermarket.model.user.RolePravoId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RolePravoRepository extends JpaRepository<RolePravo, RolePravoId> {
    List<RolePravo> findByRoleIdRole(Long roleId);
    void deleteByRoleIdRole(Long roleId);
    void deleteByPravo_IdPravo(Long pravoId);
}

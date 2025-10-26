package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.user.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByNazevRole(String nazevRole);
}

package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;



public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByUsername(String username);
}
package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.market.Objednavka;
import dreamteam.com.supermarket.model.user.Uzivatel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface ObjednavkaRepository extends JpaRepository<Objednavka, Long> {

    List<Objednavka> findByUzivatel(Uzivatel uzivatel);

    @Query("select o from Objednavka o left join fetch o.uzivatel where o.idObjednavka = :id")
    Optional<Objednavka> findWithUser(@Param("id") Long id);
}

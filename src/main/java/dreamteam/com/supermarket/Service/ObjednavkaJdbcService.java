package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.repository.OrderProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ObjednavkaJdbcService {

    private final OrderProcedureDao orderDao;

    // Vrátí všechny objednávky (pro přehled administrátora).
    public List<ObjednavkaRow> findAll() {
        return orderDao.listAll().stream()
                .map(r -> new ObjednavkaRow(
                        r.id(),
                        r.datum(),
                        r.statusId(),
                        r.supermarketId(),
                        r.supermarketNazev(),
                        r.poznamka(),
                        r.typObjednavka(),
                        r.cislo(),
                        r.uzivatelId(),
                        r.uzivatelEmail(),
                        r.uzivatelJmeno(),
                        r.uzivatelPrijmeni()
                ))
                .toList();
    }

    public List<ObjednavkaRow> findByUserId(Long userId) {
        return orderDao.listByUser(userId).stream()
                .map(r -> new ObjednavkaRow(
                        r.id(),
                        r.datum(),
                        r.statusId(),
                        r.supermarketId(),
                        r.supermarketNazev(),
                        r.poznamka(),
                        r.typObjednavka(),
                        r.cislo(),
                        r.uzivatelId(),
                        r.uzivatelEmail(),
                        r.uzivatelJmeno(),
                        r.uzivatelPrijmeni()
                ))
                .toList();
    }

    public ObjednavkaUser findWithUser(Long id) {
        var r = orderDao.getOrder(id);
        if (r == null) return null;
        return new ObjednavkaUser(
                r.id(),
                r.datum(),
                r.statusId(),
                r.uzivatelEmail(),
                r.uzivatelJmeno(),
                r.uzivatelPrijmeni()
        );
    }

    public record ObjednavkaRow(Long id,
                                java.time.LocalDateTime datum,
                                Long statusId,
                                Long supermarketId,
                                String supermarketNazev,
                                String poznamka,
                                String typObjednavka,
                                String cislo,
                                Long uzivatelId,
                                String uzivatelEmail,
                                String uzivatelJmeno,
                                String uzivatelPrijmeni) {}

    public record ObjednavkaUser(Long id, java.time.LocalDateTime datum, Long statusId,
                                 String userEmail, String userJmeno, String userPrijmeni) {}
}

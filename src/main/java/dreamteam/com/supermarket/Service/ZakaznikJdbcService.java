package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Zakaznik;
import dreamteam.com.supermarket.repository.PersonProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ZakaznikJdbcService {

    private final PersonProcedureDao personDao;

    public Zakaznik findById(Long id) {
        var row = id == null ? null : personDao.getCustomer(id);
        if (row == null) return null;
        return Zakaznik.builder()
                .id(row.id())
                .kartaVernosti(row.karta())
                .build();
    }

    public List<Zakaznik> findAll() {
        return personDao.listCustomers().stream()
                .map(row -> Zakaznik.builder()
                        .id(row.id())
                        .kartaVernosti(row.karta())
                        .build())
                .toList();
    }

    public Zakaznik save(Zakaznik zakaznik) {
        if (zakaznik == null || zakaznik.getId() == null) {
            return zakaznik;
        }
        personDao.saveCustomer(new PersonProcedureDao.CustomerRow(
                zakaznik.getId(),
                zakaznik.getKartaVernosti()
        ));
        return zakaznik;
    }

    public void deleteById(Long id) {
        if (id == null) return;
        personDao.deleteCustomer(id);
    }
}

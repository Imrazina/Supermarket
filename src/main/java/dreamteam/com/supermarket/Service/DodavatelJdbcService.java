package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Dodavatel;
import dreamteam.com.supermarket.repository.PersonProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DodavatelJdbcService {

    private final PersonProcedureDao personDao;

    public Dodavatel findById(Long id) {
        var row = id == null ? null : personDao.getSupplier(id);
        if (row == null) return null;
        return Dodavatel.builder()
                .id(row.id())
                .firma(row.firma())
                .build();
    }

    public List<Dodavatel> findAll() {
        return personDao.listSuppliers().stream()
                .map(row -> Dodavatel.builder()
                        .id(row.id())
                        .firma(row.firma())
                        .build())
                .toList();
    }

    public Dodavatel save(Dodavatel dodavatel) {
        if (dodavatel == null || dodavatel.getId() == null) {
            return dodavatel;
        }
        personDao.saveSupplier(new PersonProcedureDao.SupplierRow(
                dodavatel.getId(),
                dodavatel.getFirma()
        ));
        return dodavatel;
    }

    public void deleteById(Long id) {
        if (id == null) return;
        personDao.deleteSupplier(id);
    }
}

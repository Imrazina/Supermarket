package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Zamestnanec;
import dreamteam.com.supermarket.repository.PersonProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ZamestnanecJdbcService {

    private final PersonProcedureDao personDao;

    public Zamestnanec findById(Long id) {
        var row = id == null ? null : personDao.getEmployee(id);
        if (row == null) return null;
        return Zamestnanec.builder()
                .id(row.id())
                .mzda(row.mzda())
                .datumNastupa(row.datumNastupa())
                .pozice(row.pozice())
                .build();
    }

    public List<Zamestnanec> findAll() {
        return personDao.listEmployees().stream()
                .map(row -> Zamestnanec.builder()
                        .id(row.id())
                        .mzda(row.mzda())
                        .datumNastupa(row.datumNastupa())
                        .pozice(row.pozice())
                        .build())
                .toList();
    }

    public List<String> findDistinctPositions() {
        return personDao.listPositions();
    }

    public Zamestnanec save(Zamestnanec zamestnanec) {
        if (zamestnanec == null || zamestnanec.getId() == null) {
            return zamestnanec;
        }
        personDao.saveEmployee(new PersonProcedureDao.EmployeeRow(
                zamestnanec.getId(),
                zamestnanec.getMzda(),
                zamestnanec.getDatumNastupa(),
                zamestnanec.getPozice()
        ));
        return zamestnanec;
    }

    public void deleteById(Long id) {
        if (id == null) return;
        personDao.deleteEmployee(id);
    }
}

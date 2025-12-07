package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.location.Mesto;
import dreamteam.com.supermarket.repository.LocationProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MestoJdbcService {

    private final LocationProcedureDao locationDao;

    public List<Mesto> findAll() {
        return locationDao.listMesta().stream().map(row -> {
            Mesto m = new Mesto();
            m.setPsc(row.psc());
            m.setNazev(row.nazev());
            m.setKraj(row.kraj());
            return m;
        }).toList();
    }

    public Mesto findById(String psc) {
        var row = locationDao.getMesto(psc);
        if (row == null) return null;
        Mesto m = new Mesto();
        m.setPsc(row.psc());
        m.setNazev(row.nazev());
        m.setKraj(row.kraj());
        return m;
    }
}

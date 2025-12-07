package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.location.Adresa;
import dreamteam.com.supermarket.model.location.Mesto;
import dreamteam.com.supermarket.repository.LocationProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdresaJdbcService {

    private final LocationProcedureDao locationDao;

    public Adresa findById(Long id) {
        var row = locationDao.getAdresa(id);
        if (row == null) return null;
        return map(row, locationDao.getMesto(row.psc()));
    }

    public Adresa save(Adresa adresa) {
        LocationProcedureDao.AdresaRow row = new LocationProcedureDao.AdresaRow(
                adresa.getIdAdresa(),
                adresa.getUlice(),
                adresa.getCisloPopisne(),
                adresa.getCisloOrientacni(),
                adresa.getMesto() != null ? adresa.getMesto().getPsc() : null
        );
        Long id = locationDao.saveAdresa(row);
        return findById(id);
    }

    private Adresa map(LocationProcedureDao.AdresaRow row, LocationProcedureDao.MestoRow mestoRow) {
        Adresa a = new Adresa();
        a.setIdAdresa(row.id());
        a.setUlice(row.ulice());
        a.setCisloPopisne(row.cpop());
        a.setCisloOrientacni(row.corient());
        if (mestoRow != null) {
            Mesto m = new Mesto();
            m.setPsc(mestoRow.psc());
            m.setNazev(mestoRow.nazev());
            m.setKraj(mestoRow.kraj());
            a.setMesto(m);
        }
        return a;
    }
}

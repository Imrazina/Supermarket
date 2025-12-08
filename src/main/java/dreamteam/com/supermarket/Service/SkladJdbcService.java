package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.market.Sklad;
import dreamteam.com.supermarket.model.market.Supermarket;
import lombok.RequiredArgsConstructor;
import dreamteam.com.supermarket.repository.MarketProcedureDao;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SkladJdbcService {

    private final MarketProcedureDao marketDao;

    public List<Sklad> findAll() {
        return marketDao.listSklady().stream().map(this::map).toList();
    }

    public Sklad findById(Long id) {
        var row = marketDao.getSklad(id);
        return row == null ? null : map(row);
    }

    private Sklad map(MarketProcedureDao.SkladRow row) {
        Sklad s = new Sklad();
        s.setIdSklad(row.id());
        s.setNazev(row.nazev());
        s.setKapacita(row.kapacita());
        s.setTelefonniCislo(row.telefon());
        if (row.supermarketId() != null) {
            Supermarket supermarket = new Supermarket();
            supermarket.setIdSupermarket(row.supermarketId());
            s.setSupermarket(supermarket);
        }
        return s;
    }
}

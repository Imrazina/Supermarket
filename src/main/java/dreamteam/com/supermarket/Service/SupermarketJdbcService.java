package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.market.Supermarket;
import lombok.RequiredArgsConstructor;
import dreamteam.com.supermarket.repository.MarketProcedureDao;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SupermarketJdbcService {

    private final MarketProcedureDao marketDao;

    public List<Supermarket> findAll() {
        return marketDao.listSupermarket().stream().map(this::map).toList();
    }

    public Supermarket findFirst() {
        return marketDao.listSupermarket().stream().map(this::map).findFirst().orElse(null);
    }

    private Supermarket map(MarketProcedureDao.SupermarketRow row) {
        Supermarket s = new Supermarket();
        s.setIdSupermarket(row.id());
        s.setNazev(row.nazev());
        s.setTelefon(row.telefon());
        s.setEmail(row.email());
        return s;
    }
}

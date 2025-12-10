package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.market.Zbozi;
import dreamteam.com.supermarket.repository.MarketProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ZboziJdbcService {

    private final MarketProcedureDao marketDao;

    public Zbozi findById(Long id) {
        var row = marketDao.getZbozi(id);
        return row == null ? null : map(row);
    }

    public List<Zbozi> findAll() {
        return marketDao.listZbozi().stream().map(this::map).toList();
    }

    public List<Zbozi> findBySupermarket(Long supermarketId, String query, Long categoryId) {
        return marketDao.listZboziBySupermarket(supermarketId, query, categoryId)
                .stream()
                .map(this::mapCustomerCatalog)
                .toList();
    }

    private Zbozi map(MarketProcedureDao.ZboziRow row) {
        Zbozi z = new Zbozi();
        z.setIdZbozi(row.id());
        z.setNazev(row.nazev());
        z.setPopis(row.popis());
        z.setCena(row.cena());
        z.setMnozstvi(row.mnozstvi());
        z.setMinMnozstvi(row.minMnozstvi());
        if (row.kategorieId() != null && row.kategorieId() > 0) {
            var kat = new dreamteam.com.supermarket.model.market.KategorieZbozi();
            kat.setIdKategorie(row.kategorieId());
            kat.setNazev(row.kategorieNazev());
            z.setKategorie(kat);
        }
        if (row.skladId() != null && row.skladId() > 0) {
            var s = new dreamteam.com.supermarket.model.market.Sklad();
            s.setIdSklad(row.skladId());
            s.setNazev(row.skladNazev());
            if (row.supermarketId() != null && row.supermarketId() > 0) {
                var sp = new dreamteam.com.supermarket.model.market.Supermarket();
                sp.setIdSupermarket(row.supermarketId());
                sp.setNazev(row.supermarketNazev());
                s.setSupermarket(sp);
            }
            z.setSklad(s);
        }
        // Dodavatele na zbozi resi DodavatelZboziJdbcService; zde jen metadata z view
        return z;
    }

    private Zbozi mapCustomerCatalog(MarketProcedureDao.CustomerCatalogRow row) {
        Zbozi z = new Zbozi();
        z.setIdZbozi(row.id());
        z.setNazev(row.nazev());
        z.setPopis(row.popis());
        z.setCena(row.cena());
        z.setMnozstvi(row.mnozstvi());
        z.setMinMnozstvi(row.minMnozstvi());
        if (row.kategorieId() != null && row.kategorieId() > 0) {
            var kat = new dreamteam.com.supermarket.model.market.KategorieZbozi();
            kat.setIdKategorie(row.kategorieId());
            kat.setNazev(row.kategorieNazev());
            z.setKategorie(kat);
        }
        if (row.skladId() != null && row.skladId() > 0) {
            var s = new dreamteam.com.supermarket.model.market.Sklad();
            s.setIdSklad(row.skladId());
            s.setNazev(row.skladNazev());
            if (row.supermarketId() != null && row.supermarketId() > 0) {
                var sp = new dreamteam.com.supermarket.model.market.Supermarket();
                sp.setIdSupermarket(row.supermarketId());
                sp.setNazev(row.supermarketNazev());
                s.setSupermarket(sp);
            }
            z.setSklad(s);
        }
        return z;
    }
}

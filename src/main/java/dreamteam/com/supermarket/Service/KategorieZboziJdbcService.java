package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.market.KategorieZbozi;
import lombok.RequiredArgsConstructor;
import dreamteam.com.supermarket.repository.MarketProcedureDao;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class KategorieZboziJdbcService {

    private final MarketProcedureDao marketDao;

    public List<KategorieZbozi> findAll() {
        return marketDao.listKategorie().stream()
                .map(row -> {
                    KategorieZbozi k = new KategorieZbozi();
                    k.setIdKategorie(row.id());
                    k.setNazev(row.nazev());
                    k.setPopis(row.popis());
                    return k;
                })
                .toList();
    }
}

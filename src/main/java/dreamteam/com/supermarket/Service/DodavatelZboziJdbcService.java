package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.market.DodavatelZbozi;
import dreamteam.com.supermarket.model.market.DodavatelZboziId;
import dreamteam.com.supermarket.model.market.Zbozi;
import dreamteam.com.supermarket.model.user.Dodavatel;
import dreamteam.com.supermarket.repository.MarketProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DodavatelZboziJdbcService {

    private final MarketProcedureDao marketDao;

    public List<DodavatelZbozi> findAll() {
        return marketDao.listDodByZbozi(null).stream().map(this::map).toList();
    }

    public List<DodavatelZbozi> findByZbozi(Long zboziId) {
        return marketDao.listDodByZbozi(zboziId).stream().map(this::map).toList();
    }

    public List<DodavatelZbozi> findByDodavatel(Long dodavatelId) {
        return marketDao.listZboziByDodavatel(dodavatelId).stream().map(this::map).toList();
    }

    public void addRelation(Long zboziId, Long dodavatelId) {
        marketDao.addDodavatelToZbozi(zboziId, dodavatelId);
    }

    public void deleteRelation(Long zboziId, Long dodavatelId) {
        marketDao.deleteDodavatelFromZbozi(zboziId, dodavatelId);
    }

    public int countByDodavatel(Long dodavatelId) {
        if (dodavatelId == null) {
            return 0;
        }
        Integer cnt = marketDao.listZboziByDodavatel(dodavatelId).size();
        return cnt == null ? 0 : cnt;
    }

    private DodavatelZbozi map(MarketProcedureDao.ZboziDodRow row) {
        DodavatelZbozi rel = new DodavatelZbozi();
        rel.setId(new DodavatelZboziId(row.dodavatelId(), row.zboziId()));
        Dodavatel d = new Dodavatel();
        d.setId(row.dodavatelId());
        d.setFirma(row.dodavatelFirma());
        rel.setDodavatel(d);
        Zbozi z = new Zbozi();
        z.setIdZbozi(row.zboziId());
        rel.setZbozi(z);
        return rel;
    }
}

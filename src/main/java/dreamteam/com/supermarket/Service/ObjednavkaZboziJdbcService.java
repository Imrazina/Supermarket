package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.market.ObjednavkaZbozi;
import dreamteam.com.supermarket.model.market.ObjednavkaZboziId;
import dreamteam.com.supermarket.repository.OrderProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ObjednavkaZboziJdbcService {

    private final OrderProcedureDao orderDao;

    public List<ObjednavkaZbozi> findByObjednavka(Long objednavkaId) {
        return orderDao.listItems(objednavkaId).stream().map(row -> {
            ObjednavkaZbozi oz = new ObjednavkaZbozi();
            oz.setId(new ObjednavkaZboziId(row.objednavkaId(), row.zboziId()));
            oz.setPocet(row.pocet());
            var objednavka = new dreamteam.com.supermarket.model.market.Objednavka();
            objednavka.setIdObjednavka(row.objednavkaId());
            oz.setObjednavka(objednavka);
            var zbozi = new dreamteam.com.supermarket.model.market.Zbozi();
            zbozi.setIdZbozi(row.zboziId());
            zbozi.setNazev(row.zboziNazev());
            oz.setZbozi(zbozi);
            return oz;
        }).toList();
    }

    public void addItem(Long objednavkaId, Long zboziId, int qty) {
        orderDao.addItem(objednavkaId, zboziId, qty);
    }

    public void updateItem(Long objednavkaId, Long zboziId, int qty) {
        orderDao.updateItem(objednavkaId, zboziId, qty);
    }

    public void deleteItem(Long objednavkaId, Long zboziId) {
        orderDao.deleteItem(objednavkaId, zboziId);
    }
}

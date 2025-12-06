package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.market.ObjednavkaZbozi;
import dreamteam.com.supermarket.model.market.ObjednavkaZboziId;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ObjednavkaZboziJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<ObjednavkaZbozi> findAll() {
        String sql = """
                SELECT ID_OBJEDNAVKA, ID_ZBOZI, POCET
                FROM OBJEDNAVKA_ZBOZI
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            ObjednavkaZbozi oz = new ObjednavkaZbozi();
            Long objednavkaId = rs.getLong("ID_OBJEDNAVKA");
            Long zboziId = rs.getLong("ID_ZBOZI");
            oz.setId(new ObjednavkaZboziId(objednavkaId, zboziId));
            oz.setPocet(rs.getInt("POCET"));
            var objednavka = new dreamteam.com.supermarket.model.market.Objednavka();
            objednavka.setIdObjednavka(objednavkaId);
            oz.setObjednavka(objednavka);
            var zbozi = new dreamteam.com.supermarket.model.market.Zbozi();
            zbozi.setIdZbozi(zboziId);
            oz.setZbozi(zbozi);
            return oz;
        });
    }
}

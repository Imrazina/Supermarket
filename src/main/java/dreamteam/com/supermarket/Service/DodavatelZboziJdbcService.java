package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.market.DodavatelZbozi;
import dreamteam.com.supermarket.model.market.DodavatelZboziId;
import dreamteam.com.supermarket.model.market.Zbozi;
import dreamteam.com.supermarket.model.user.Dodavatel;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DodavatelZboziJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<DodavatelZbozi> findAll() {
        String sql = "SELECT ID_UZIVATELU, ID_ZBOZI FROM ZBOZI_DODAVATEL";
        return jdbcTemplate.query(sql, (rs, i) -> {
            Long dodavatelId = rs.getLong("ID_UZIVATELU");
            Long zboziId = rs.getLong("ID_ZBOZI");
            DodavatelZbozi rel = new DodavatelZbozi();
            rel.setId(new DodavatelZboziId(dodavatelId, zboziId));
            Dodavatel d = new Dodavatel();
            d.setId(dodavatelId);
            rel.setDodavatel(d);
            Zbozi z = new Zbozi();
            z.setIdZbozi(zboziId);
            rel.setZbozi(z);
            return rel;
        });
    }
}

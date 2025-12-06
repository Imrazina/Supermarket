package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.market.ObjednavkaStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ObjednavkaStatusJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<ObjednavkaStatus> findAll() {
        String sql = "SELECT ID_STATUS, NAZEV FROM STATUS ORDER BY ID_STATUS";
        return jdbcTemplate.query(sql, (rs, i) -> {
            ObjednavkaStatus status = new ObjednavkaStatus();
            status.setIdStatus(rs.getLong("ID_STATUS"));
            status.setNazev(rs.getString("NAZEV"));
            return status;
        });
    }

    public ObjednavkaStatus findById(Long id) {
        if (id == null) {
            return null;
        }
        String sql = "SELECT ID_STATUS, NAZEV FROM STATUS WHERE ID_STATUS = ?";
        return jdbcTemplate.query(sql, (rs, i) -> {
            ObjednavkaStatus status = new ObjednavkaStatus();
            status.setIdStatus(rs.getLong("ID_STATUS"));
            status.setNazev(rs.getString("NAZEV"));
            return status;
        }, id).stream().findFirst().orElse(null);
    }
}

package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.location.Mesto;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MestoJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<Mesto> findAll() {
        String sql = """
                SELECT PSC, NAZEV, KRAJ
                FROM MESTO
                ORDER BY PSC
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Mesto m = new Mesto();
            m.setPsc(rs.getString("PSC"));
            m.setNazev(rs.getString("NAZEV"));
            m.setKraj(rs.getString("KRAJ"));
            return m;
        });
    }

    public Mesto findById(String psc) {
        String sql = """
                SELECT PSC, NAZEV, KRAJ
                FROM MESTO
                WHERE PSC = ?
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Mesto m = new Mesto();
            m.setPsc(rs.getString("PSC"));
            m.setNazev(rs.getString("NAZEV"));
            m.setKraj(rs.getString("KRAJ"));
            return m;
        }, psc).stream().findFirst().orElse(null);
    }
}

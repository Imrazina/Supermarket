package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.market.Supermarket;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SupermarketJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<Supermarket> findAll() {
        String sql = """
                SELECT ID_SUPERMARKET, NAZEV, TELEFON, EMAIL, ID_ADRESA
                FROM SUPERMARKET
                ORDER BY ID_SUPERMARKET
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Supermarket s = new Supermarket();
            s.setIdSupermarket(rs.getLong("ID_SUPERMARKET"));
            s.setNazev(rs.getString("NAZEV"));
            s.setTelefon(rs.getString("TELEFON"));
            s.setEmail(rs.getString("EMAIL"));
            return s;
        });
    }

    public Supermarket findFirst() {
        String sql = """
                SELECT ID_SUPERMARKET, NAZEV, TELEFON, EMAIL, ID_ADRESA
                FROM SUPERMARKET
                WHERE ROWNUM = 1
                ORDER BY ID_SUPERMARKET
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Supermarket s = new Supermarket();
            s.setIdSupermarket(rs.getLong("ID_SUPERMARKET"));
            s.setNazev(rs.getString("NAZEV"));
            s.setTelefon(rs.getString("TELEFON"));
            s.setEmail(rs.getString("EMAIL"));
            return s;
        }).stream().findFirst().orElse(null);
    }
}

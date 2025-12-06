package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.market.KategorieZbozi;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class KategorieZboziJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<KategorieZbozi> findAll() {
        String sql = """
                SELECT ID_KATEGORIE, NAZEV
                FROM KATEGORIE_ZBOZI
                ORDER BY ID_KATEGORIE
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            KategorieZbozi k = new KategorieZbozi();
            k.setIdKategorie(rs.getLong("ID_KATEGORIE"));
            k.setNazev(rs.getString("NAZEV"));
            return k;
        });
    }
}

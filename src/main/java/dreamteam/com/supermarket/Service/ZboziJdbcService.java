package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.market.KategorieZbozi;
import dreamteam.com.supermarket.model.market.Sklad;
import dreamteam.com.supermarket.model.market.Zbozi;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ZboziJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public Zbozi findById(Long id) {
        String sql = """
                SELECT ID_ZBOZI, NAZEV, CENA, MNOZSTVI, MINMNOZSTVI, POPIS, SKLAD_ID_SKLAD, ID_KATEGORIE
                FROM ZBOZI
                WHERE ID_ZBOZI = ?
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Zbozi z = new Zbozi();
            z.setIdZbozi(rs.getLong("ID_ZBOZI"));
            z.setNazev(rs.getString("NAZEV"));
            z.setCena(rs.getBigDecimal("CENA"));
            z.setMnozstvi(rs.getInt("MNOZSTVI"));
            z.setMinMnozstvi(rs.getInt("MINMNOZSTVI"));
            z.setPopis(rs.getString("POPIS"));
            Long skladId = rs.getLong("SKLAD_ID_SKLAD");
            if (skladId != null) {
                Sklad s = new Sklad();
                s.setIdSklad(skladId);
                z.setSklad(s);
            }
            Long katId = rs.getLong("ID_KATEGORIE");
            if (katId != null) {
                KategorieZbozi k = new KategorieZbozi();
                k.setIdKategorie(katId);
                z.setKategorie(k);
            }
            return z;
        }, id).stream().findFirst().orElse(null);
    }

    public List<Zbozi> findAll() {
        String sql = """
                SELECT ID_ZBOZI, NAZEV, CENA, MNOZSTVI, MINMNOZSTVI, POPIS, SKLAD_ID_SKLAD, ID_KATEGORIE
                FROM ZBOZI
                ORDER BY ID_ZBOZI
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Zbozi z = new Zbozi();
            z.setIdZbozi(rs.getLong("ID_ZBOZI"));
            z.setNazev(rs.getString("NAZEV"));
            z.setCena(rs.getBigDecimal("CENA"));
            z.setMnozstvi(rs.getInt("MNOZSTVI"));
            z.setMinMnozstvi(rs.getInt("MINMNOZSTVI"));
            z.setPopis(rs.getString("POPIS"));
            Long skladId = rs.getLong("SKLAD_ID_SKLAD");
            if (skladId != null) {
                Sklad s = new Sklad();
                s.setIdSklad(skladId);
                z.setSklad(s);
            }
            Long katId = rs.getLong("ID_KATEGORIE");
            if (katId != null) {
                KategorieZbozi k = new KategorieZbozi();
                k.setIdKategorie(katId);
                z.setKategorie(k);
            }
            return z;
        });
    }
}

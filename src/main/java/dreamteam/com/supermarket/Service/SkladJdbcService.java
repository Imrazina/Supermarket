package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.market.Sklad;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SkladJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<Sklad> findAll() {
        String sql = """
                SELECT ID_SKLAD, NAZEV, KAPACITA, TELEFONNICISLO, ID_SUPERMARKET
                FROM SKLAD
                ORDER BY ID_SKLAD
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Sklad s = new Sklad();
            s.setIdSklad(rs.getLong("ID_SKLAD"));
            s.setNazev(rs.getString("NAZEV"));
            s.setKapacita(rs.getInt("KAPACITA"));
            s.setTelefonniCislo(rs.getString("TELEFONNICISLO"));
            // supermarket не подтягиваем лениво; при необходимости можно создать объект с id
            return s;
        });
    }

    public Sklad findById(Long id) {
        String sql = """
                SELECT ID_SKLAD, NAZEV, KAPACITA, TELEFONNICISLO, ID_SUPERMARKET
                FROM SKLAD
                WHERE ID_SKLAD = ?
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Sklad s = new Sklad();
            s.setIdSklad(rs.getLong("ID_SKLAD"));
            s.setNazev(rs.getString("NAZEV"));
            s.setKapacita(rs.getInt("KAPACITA"));
            s.setTelefonniCislo(rs.getString("TELEFONNICISLO"));
            return s;
        }, id).stream().findFirst().orElse(null);
    }
}

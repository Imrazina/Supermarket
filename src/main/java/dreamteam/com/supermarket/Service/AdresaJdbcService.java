package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.location.Adresa;
import dreamteam.com.supermarket.model.location.Mesto;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdresaJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public Adresa findById(Long id) {
        String sql = """
                SELECT ID_ADRESA, ULICE, CISLOPOPISNE, CISLOORIENTACNI, PSC
                FROM ADRESA
                WHERE ID_ADRESA = ?
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Adresa a = new Adresa();
            a.setIdAdresa(rs.getLong("ID_ADRESA"));
            a.setUlice(rs.getString("ULICE"));
            a.setCisloPopisne(rs.getString("CISLOPOPISNE"));
            a.setCisloOrientacni(rs.getString("CISLOORIENTACNI"));
            Mesto m = new Mesto();
            m.setPsc(rs.getString("PSC"));
            a.setMesto(m);
            return a;
        }, id).stream().findFirst().orElse(null);
    }

    public Adresa save(Adresa adresa) {
        if (adresa.getIdAdresa() == null) {
            Long id = jdbcTemplate.queryForObject("SELECT SEQ_ADRESA_ID.NEXTVAL FROM dual", Long.class);
            jdbcTemplate.update("""
                    INSERT INTO ADRESA (ID_ADRESA, ULICE, CISLOPOPISNE, CISLOORIENTACNI, PSC)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    id,
                    adresa.getUlice(),
                    adresa.getCisloPopisne(),
                    adresa.getCisloOrientacni(),
                    adresa.getMesto() != null ? adresa.getMesto().getPsc() : null
            );
            adresa.setIdAdresa(id);
        } else {
            jdbcTemplate.update("""
                    UPDATE ADRESA
                    SET ULICE = ?, CISLOPOPISNE = ?, CISLOORIENTACNI = ?, PSC = ?
                    WHERE ID_ADRESA = ?
                    """,
                    adresa.getUlice(),
                    adresa.getCisloPopisne(),
                    adresa.getCisloOrientacni(),
                    adresa.getMesto() != null ? adresa.getMesto().getPsc() : null,
                    adresa.getIdAdresa()
            );
        }
        return adresa;
    }
}

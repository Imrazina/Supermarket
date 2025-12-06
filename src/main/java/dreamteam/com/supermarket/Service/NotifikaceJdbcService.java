package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Notifikace;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotifikaceJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public Notifikace findByAdresat(String adresat) {
        String sql = """
                SELECT ID_NOTIFIKACE, ID_ZPRAVA, AUTHTOKEN, ENDPOINT, P256DH, ADRESAT
                FROM NOTIFIKACE
                WHERE LOWER(ADRESAT) = LOWER(?)
                FETCH FIRST 1 ROWS ONLY
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Notifikace n = new Notifikace();
            n.setIdNotifikace(rs.getLong("ID_NOTIFIKACE"));
            n.setZpravaId(rs.getLong("ID_ZPRAVA"));
            n.setAuthToken(rs.getString("AUTHTOKEN"));
            n.setEndPoint(rs.getString("ENDPOINT"));
            n.setP256dh(rs.getString("P256DH"));
            n.setAdresat(rs.getString("ADRESAT"));
            return n;
        }, adresat).stream().findFirst().orElse(null);
    }

    public List<Notifikace> findAll() {
        String sql = """
                SELECT ID_NOTIFIKACE, ID_ZPRAVA, AUTHTOKEN, ENDPOINT, P256DH, ADRESAT
                FROM NOTIFIKACE
                ORDER BY ID_NOTIFIKACE
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Notifikace n = new Notifikace();
            n.setIdNotifikace(rs.getLong("ID_NOTIFIKACE"));
            n.setZpravaId(rs.getLong("ID_ZPRAVA"));
            n.setAuthToken(rs.getString("AUTHTOKEN"));
            n.setEndPoint(rs.getString("ENDPOINT"));
            n.setP256dh(rs.getString("P256DH"));
            n.setAdresat(rs.getString("ADRESAT"));
            return n;
        });
    }

    public Notifikace save(Notifikace n) {
        if (n.getIdNotifikace() == null) {
            Long id = jdbcTemplate.queryForObject("SELECT SEQ_NOTIFIKACE_ID.NEXTVAL FROM dual", Long.class);
            jdbcTemplate.update("""
                    INSERT INTO NOTIFIKACE(ID_NOTIFIKACE, ID_ZPRAVA, AUTHTOKEN, ENDPOINT, P256DH, ADRESAT)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    id,
                    n.getZpravaId(),
                    n.getAuthToken(),
                    n.getEndPoint(),
                    n.getP256dh(),
                    n.getAdresat()
            );
            n.setIdNotifikace(id);
        } else {
            jdbcTemplate.update("""
                    UPDATE NOTIFIKACE
                    SET ID_ZPRAVA = ?, AUTHTOKEN = ?, ENDPOINT = ?, P256DH = ?, ADRESAT = ?
                    WHERE ID_NOTIFIKACE = ?
                    """,
                    n.getZpravaId(),
                    n.getAuthToken(),
                    n.getEndPoint(),
                    n.getP256dh(),
                    n.getAdresat(),
                    n.getIdNotifikace()
            );
        }
        return n;
    }

    public void deleteByAdresat(String adresat) {
        jdbcTemplate.update("DELETE FROM NOTIFIKACE WHERE LOWER(ADRESAT) = LOWER(?)", adresat);
    }
}

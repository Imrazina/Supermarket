package dreamteam.com.supermarket.Service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ObjednavkaJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<ObjednavkaRow> findByUserId(Long userId) {
        String sql = """
                SELECT ID_OBJEDNAVKA, DATUM, ID_STATUS, ID_SUPERMARKET, POZNAMKA, TYP_OBJEDNAVKA
                FROM OBJEDNAVKA
                WHERE ID_UZIVATEL = ?
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Timestamp ts = rs.getTimestamp("DATUM");
            LocalDateTime dt = ts != null ? ts.toLocalDateTime() : null;
            return new ObjednavkaRow(
                    rs.getLong("ID_OBJEDNAVKA"),
                    dt,
                    rs.getLong("ID_STATUS"),
                    rs.getLong("ID_SUPERMARKET"),
                    rs.getString("POZNAMKA"),
                    rs.getString("TYP_OBJEDNAVKA")
            );
        }, userId);
    }

    public ObjednavkaUser findWithUser(Long id) {
        String sql = """
                SELECT o.ID_OBJEDNAVKA,
                       o.DATUM,
                       o.ID_STATUS,
                       u.EMAIL AS USER_EMAIL,
                       u.JMENO AS USER_JMENO,
                       u.PRIJMENI AS USER_PRIJMENI
                FROM OBJEDNAVKA o
                LEFT JOIN UZIVATEL u ON u.ID_UZIVATEL = o.ID_UZIVATEL
                WHERE o.ID_OBJEDNAVKA = ?
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Timestamp ts = rs.getTimestamp("DATUM");
            LocalDateTime dt = ts != null ? ts.toLocalDateTime() : null;
            return new ObjednavkaUser(
                    rs.getLong("ID_OBJEDNAVKA"),
                    dt,
                    rs.getLong("ID_STATUS"),
                    rs.getString("USER_EMAIL"),
                    rs.getString("USER_JMENO"),
                    rs.getString("USER_PRIJMENI")
            );
        }, id).stream().findFirst().orElse(null);
    }

    public record ObjednavkaRow(Long id, LocalDateTime datum, Long statusId, Long supermarketId,
                                String poznamka, String typObjednavka) {}

    public record ObjednavkaUser(Long id, LocalDateTime datum, Long statusId,
                                 String userEmail, String userJmeno, String userPrijmeni) {}
}

package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.payment.Platba;
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
public class PlatbaJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public List<PlatbaRow> findByOrderIds(List<Long> orderIds) {
        if (orderIds == null || orderIds.isEmpty()) {
            return Collections.emptyList();
        }
        String inClause = orderIds.stream().map(id -> "?").collect(Collectors.joining(","));
        String sql = "SELECT ID_PLATBA, CASTKA, DATUM, ID_OBJEDNAVKA, PLATBATYP FROM PLATBA WHERE ID_OBJEDNAVKA IN (" + inClause + ")";
        return jdbcTemplate.query(sql, orderIds.toArray(), (rs, i) -> {
            Timestamp ts = rs.getTimestamp("DATUM");
            LocalDateTime dt = ts != null ? ts.toLocalDateTime() : null;
            return new PlatbaRow(
                    rs.getLong("ID_PLATBA"),
                    rs.getBigDecimal("CASTKA"),
                    dt,
                    rs.getLong("ID_OBJEDNAVKA"),
                    rs.getString("PLATBATYP")
            );
        });
    }

    public record PlatbaRow(Long id, java.math.BigDecimal castka, LocalDateTime datum, Long objednavkaId, String platbaTyp) {}
}

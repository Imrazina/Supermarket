package dreamteam.com.supermarket.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.CallableStatement;
import java.sql.Date;
import java.sql.Types;
import java.time.LocalDate;

@Repository
@RequiredArgsConstructor
public class RoleChangeDao {

    private final JdbcTemplate jdbcTemplate;

    public void changeRole(long userId,
                           long newRoleId,
                           String firma,
                           String karta,
                           BigDecimal mzda,
                           LocalDate datumNastupa,
                           String pozice) {
        jdbcTemplate.execute((Connection connection) -> {
            CallableStatement cs = connection.prepareCall("{ call PROC_CHANGE_USER_ROLE(?, ?, ?, ?, ?, ?, ?) }");
            cs.setLong(1, userId);
            cs.setLong(2, newRoleId);

            if (firma != null && !firma.isBlank()) {
                cs.setString(3, firma.trim());
            } else {
                cs.setNull(3, Types.VARCHAR);
            }

            if (karta != null && !karta.isBlank()) {
                cs.setString(4, karta.trim());
            } else {
                cs.setNull(4, Types.VARCHAR);
            }

            if (mzda != null) {
                cs.setBigDecimal(5, mzda);
            } else {
                cs.setNull(5, Types.NUMERIC);
            }

            if (datumNastupa != null) {
                cs.setDate(6, Date.valueOf(datumNastupa));
            } else {
                cs.setNull(6, Types.DATE);
            }

            if (pozice != null && !pozice.isBlank()) {
                cs.setString(7, pozice.trim());
            } else {
                cs.setNull(7, Types.VARCHAR);
            }
            cs.execute();
            return null;
        });
    }
}

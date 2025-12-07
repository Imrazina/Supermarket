package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.model.user.Zpravy;
import lombok.RequiredArgsConstructor;
import oracle.jdbc.OracleTypes;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public Zpravy findFirstBySenderReceiverContent(Long senderId, Long receiverId, String content) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_zprava.find_first(?, ?, ?, ?) }");
            cs.setLong(1, senderId);
            cs.setLong(2, receiverId);
            cs.setString(3, content);
            cs.registerOutParameter(4, OracleTypes.CURSOR);
            return cs;
        }, (CallableStatementCallback<Zpravy>) cs -> {
            cs.execute();
            try (var rs = (java.sql.ResultSet) cs.getObject(4)) {
                if (rs.next()) {
                    return mapSimple(rs);
                }
            }
            return null;
        });
    }

    public Zpravy save(Zpravy message) {
        LocalDateTime now = message.getDatumZasilani() != null ? message.getDatumZasilani() : LocalDateTime.now();
        Long id = jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_zprava.save_zprava(?, ?, ?, ?, ?) }");
            cs.setLong(1, message.getSender() != null ? message.getSender().getIdUzivatel() : null);
            cs.setLong(2, message.getReceiver() != null ? message.getReceiver().getIdUzivatel() : null);
            cs.setString(3, message.getContent());
            cs.setTimestamp(4, Timestamp.valueOf(now));
            cs.registerOutParameter(5, java.sql.Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<Long>) cs -> {
            cs.execute();
            return cs.getLong(5);
        });
        message.setId(id);
        message.setDatumZasilani(now);
        return message;
    }

    public List<Zpravy> findTop100WithParticipants() {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_zprava.list_top(?, ?) }");
            cs.setNull(1, java.sql.Types.NUMERIC);
            cs.registerOutParameter(2, OracleTypes.CURSOR);
            return cs;
        }, (CallableStatementCallback<List<Zpravy>>) cs -> {
            cs.execute();
            try (var rs = (java.sql.ResultSet) cs.getObject(2)) {
                List<Zpravy> list = new ArrayList<>();
                while (rs.next()) {
                    list.add(mapWithUsers(rs));
                }
                return list;
            }
        });
    }

    public List<Zpravy> findConversation(String currentEmail, String peerEmail) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_zprava.list_conversation(?, ?, ?) }");
            cs.setString(1, currentEmail);
            cs.setString(2, peerEmail);
            cs.registerOutParameter(3, OracleTypes.CURSOR);
            return cs;
        }, (CallableStatementCallback<List<Zpravy>>) cs -> {
            cs.execute();
            try (var rs = (java.sql.ResultSet) cs.getObject(3)) {
                List<Zpravy> list = new ArrayList<>();
                while (rs.next()) {
                    list.add(mapWithUsers(rs));
                }
                return list;
            }
        });
    }

    public long countUnread(Long userId, Long fromUserId) {
        if (userId == null) {
            return 0L;
        }
        try {
            return jdbcTemplate.query(con -> {
                PreparedStatement ps = con.prepareStatement("SELECT unread_messages(?, ?) FROM dual");
                ps.setLong(1, userId);
                if (fromUserId != null) {
                    ps.setLong(2, fromUserId);
                } else {
                    ps.setNull(2, Types.NUMERIC);
                }
                return ps;
            }, rs -> rs.next() ? rs.getLong(1) : 0L);
        } catch (DataAccessException ex) {
            return 0L;
        }
    }

    public String lastMessageSummary(Long userId) {
        if (userId == null) {
            return "Žádné zprávy";
        }
        try {
            String summary = jdbcTemplate.queryForObject(
                    "SELECT last_message_summary(?) FROM dual",
                    String.class,
                    userId
            );
            return summary != null ? summary : "Žádné zprávy";
        } catch (DataAccessException ex) {
            return "Žádné zprávy";
        }
    }

    public void update(Long id, String text, LocalDateTime datum) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_zprava.update_zprava(?, ?, ?) }");
            cs.setLong(1, id);
            cs.setString(2, text);
            if (datum != null) {
                cs.setTimestamp(3, Timestamp.valueOf(datum));
            } else {
                cs.setNull(3, java.sql.Types.TIMESTAMP);
            }
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public void delete(Long id) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_zprava.delete_zprava(?) }");
            cs.setLong(1, id);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    private Zpravy mapSimple(java.sql.ResultSet rs) throws java.sql.SQLException {
        Zpravy z = new Zpravy();
        z.setId(rs.getLong("ID_ZPRAVA"));
        z.setContent(rs.getString("ZPRAVA"));
        Timestamp ts = rs.getTimestamp("DATUMZASILANI");
        z.setDatumZasilani(ts != null ? ts.toLocalDateTime() : null);
        Uzivatel sender = new Uzivatel();
        sender.setIdUzivatel(rs.getLong("ODESILATEL_ID"));
        z.setSender(sender);
        Uzivatel rec = new Uzivatel();
        rec.setIdUzivatel(rs.getLong("PRIJIMAC_ID"));
        z.setReceiver(rec);
        return z;
    }

    public Zpravy findById(Long id) {
        if (id == null) {
            return null;
        }
        return jdbcTemplate.query(
                "SELECT ID_ZPRAVA, ODESILATEL_ID, PRIJIMAC_ID, ZPRAVA, DATUMZASILANI FROM ZPRAVA WHERE ID_ZPRAVA = ?",
                rs -> rs.next() ? mapSimple(rs) : null,
                id
        );
    }

    private Zpravy mapWithUsers(java.sql.ResultSet rs) throws java.sql.SQLException {
        Zpravy z = mapSimple(rs);
        Uzivatel sender = z.getSender();
        sender.setEmail(rs.getString("S_EMAIL"));
        sender.setJmeno(rs.getString("S_JMENO"));
        sender.setPrijmeni(rs.getString("S_PRIJMENI"));
        Uzivatel recv = z.getReceiver();
        recv.setEmail(rs.getString("R_EMAIL"));
        recv.setJmeno(rs.getString("R_JMENO"));
        recv.setPrijmeni(rs.getString("R_PRIJMENI"));
        return z;
    }
}

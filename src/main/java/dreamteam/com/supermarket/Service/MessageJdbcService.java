package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.model.user.Zpravy;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageJdbcService {

    private final JdbcTemplate jdbcTemplate;

    public Zpravy findFirstBySenderReceiverContent(Long senderId, Long receiverId, String content) {
        String sql = """
                SELECT ID_ZPRAVA, ODESILATEL_ID, PRIJIMAC_ID, ZPRAVA, DATUMZASILANI
                FROM ZPRAVA
                WHERE ODESILATEL_ID = ? AND PRIJIMAC_ID = ? AND ZPRAVA = ?
                AND ROWNUM = 1
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
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
        }, senderId, receiverId, content).stream().findFirst().orElse(null);
    }

    public Zpravy save(Zpravy message) {
        Long id = jdbcTemplate.queryForObject("SELECT SEQ_ZPRAVA_ID.NEXTVAL FROM dual", Long.class);
        LocalDateTime now = message.getDatumZasilani() != null ? message.getDatumZasilani() : LocalDateTime.now();
        jdbcTemplate.update("""
                INSERT INTO ZPRAVA (ID_ZPRAVA, ODESILATEL_ID, PRIJIMAC_ID, ZPRAVA, DATUMZASILANI)
                VALUES (?, ?, ?, ?, ?)
                """, id,
                message.getSender() != null ? message.getSender().getIdUzivatel() : null,
                message.getReceiver() != null ? message.getReceiver().getIdUzivatel() : null,
                message.getContent(),
                Timestamp.valueOf(now)
        );
        message.setId(id);
        message.setDatumZasilani(now);
        return message;
    }

    public List<Zpravy> findTop100WithParticipants() {
        String sql = """
                SELECT z.ID_ZPRAVA,
                       z.ODESILATEL_ID, s.EMAIL AS S_EMAIL, s.JMENO AS S_JMENO, s.PRIJMENI AS S_PRIJMENI,
                       z.PRIJIMAC_ID, r.EMAIL AS R_EMAIL, r.JMENO AS R_JMENO, r.PRIJMENI AS R_PRIJMENI,
                       z.ZPRAVA, z.DATUMZASILANI
                FROM ZPRAVA z
                JOIN UZIVATEL s ON s.ID_UZIVATEL = z.ODESILATEL_ID
                JOIN UZIVATEL r ON r.ID_UZIVATEL = z.PRIJIMAC_ID
                ORDER BY z.DATUMZASILANI DESC
                FETCH FIRST 100 ROWS ONLY
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Zpravy z = new Zpravy();
            z.setId(rs.getLong("ID_ZPRAVA"));
            z.setContent(rs.getString("ZPRAVA"));
            Timestamp ts = rs.getTimestamp("DATUMZASILANI");
            z.setDatumZasilani(ts != null ? ts.toLocalDateTime() : null);
            Uzivatel sender = new Uzivatel();
            sender.setIdUzivatel(rs.getLong("ODESILATEL_ID"));
            sender.setEmail(rs.getString("S_EMAIL"));
            sender.setJmeno(rs.getString("S_JMENO"));
            sender.setPrijmeni(rs.getString("S_PRIJMENI"));
            Uzivatel recv = new Uzivatel();
            recv.setIdUzivatel(rs.getLong("PRIJIMAC_ID"));
            recv.setEmail(rs.getString("R_EMAIL"));
            recv.setJmeno(rs.getString("R_JMENO"));
            recv.setPrijmeni(rs.getString("R_PRIJMENI"));
            z.setSender(sender);
            z.setReceiver(recv);
            return z;
        });
    }

    public List<Zpravy> findConversation(String currentEmail, String peerEmail) {
        String sql = """
                SELECT z.ID_ZPRAVA,
                       z.ODESILATEL_ID, s.EMAIL AS S_EMAIL, s.JMENO AS S_JMENO, s.PRIJMENI AS S_PRIJMENI,
                       z.PRIJIMAC_ID, r.EMAIL AS R_EMAIL, r.JMENO AS R_JMENO, r.PRIJMENI AS R_PRIJMENI,
                       z.ZPRAVA, z.DATUMZASILANI
                FROM ZPRAVA z
                JOIN UZIVATEL s ON s.ID_UZIVATEL = z.ODESILATEL_ID
                JOIN UZIVATEL r ON r.ID_UZIVATEL = z.PRIJIMAC_ID
                WHERE (LOWER(s.EMAIL) = LOWER(?) AND LOWER(r.EMAIL) = LOWER(?))
                   OR (LOWER(s.EMAIL) = LOWER(?) AND LOWER(r.EMAIL) = LOWER(?))
                ORDER BY z.DATUMZASILANI DESC
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Zpravy z = new Zpravy();
            z.setId(rs.getLong("ID_ZPRAVA"));
            z.setContent(rs.getString("ZPRAVA"));
            Timestamp ts = rs.getTimestamp("DATUMZASILANI");
            z.setDatumZasilani(ts != null ? ts.toLocalDateTime() : null);
            Uzivatel sender = new Uzivatel();
            sender.setIdUzivatel(rs.getLong("ODESILATEL_ID"));
            sender.setEmail(rs.getString("S_EMAIL"));
            sender.setJmeno(rs.getString("S_JMENO"));
            sender.setPrijmeni(rs.getString("S_PRIJMENI"));
            Uzivatel recv = new Uzivatel();
            recv.setIdUzivatel(rs.getLong("PRIJIMAC_ID"));
            recv.setEmail(rs.getString("R_EMAIL"));
            recv.setJmeno(rs.getString("R_JMENO"));
            recv.setPrijmeni(rs.getString("R_PRIJMENI"));
            z.setSender(sender);
            z.setReceiver(recv);
            return z;
        }, currentEmail, peerEmail, peerEmail, currentEmail);
    }
}

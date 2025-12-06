package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.Archiv;
import dreamteam.com.supermarket.model.Soubor;
import dreamteam.com.supermarket.model.user.Uzivatel;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SouborJdbcService {

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    public List<Soubor> findByArchiv(Long archivId) {
        String sql = """
                SELECT ID_SOUBOR, NAZEV, TYP, PRIPONA, DATUMNAHRANI, DATUMMODIFIKACE, POPIS, ID_UZIVATELU, ID_ARCHIV
                FROM SOUBOR
                WHERE ID_ARCHIV = ?
                ORDER BY DATUMMODIFIKACE DESC
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Soubor s = new Soubor();
            s.setIdSoubor(rs.getLong("ID_SOUBOR"));
            s.setNazev(rs.getString("NAZEV"));
            s.setTyp(rs.getString("TYP"));
            s.setPripona(rs.getString("PRIPONA"));
            s.setDatumNahrani(toLdt(rs.getTimestamp("DATUMNAHRANI")));
            s.setDatumModifikace(toLdt(rs.getTimestamp("DATUMMODIFIKACE")));
            s.setPopis(rs.getString("POPIS"));
            Long ownerId = rs.getLong("ID_UZIVATELU");
            if (!rs.wasNull()) {
                Uzivatel u = new Uzivatel();
                u.setIdUzivatel(ownerId);
                s.setVlastnik(u);
            }
            Archiv a = new Archiv();
            a.setIdArchiv(rs.getLong("ID_ARCHIV"));
            s.setArchiv(a);
            return s;
        }, archivId);
    }

    public Soubor findById(Long id) {
        if (id == null) {
            return null;
        }
        String sql = """
                SELECT ID_SOUBOR, NAZEV, TYP, PRIPONA, OBSAH, DATUMNAHRANI, DATUMMODIFIKACE, POPIS, ID_UZIVATELU, ID_ARCHIV
                FROM SOUBOR
                WHERE ID_SOUBOR = ?
                """;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Soubor s = new Soubor();
            s.setIdSoubor(rs.getLong("ID_SOUBOR"));
            s.setNazev(rs.getString("NAZEV"));
            s.setTyp(rs.getString("TYP"));
            s.setPripona(rs.getString("PRIPONA"));
            s.setObsah(rs.getBytes("OBSAH"));
            s.setDatumNahrani(toLdt(rs.getTimestamp("DATUMNAHRANI")));
            s.setDatumModifikace(toLdt(rs.getTimestamp("DATUMMODIFIKACE")));
            s.setPopis(rs.getString("POPIS"));
            Long ownerId = rs.getLong("ID_UZIVATELU");
            if (!rs.wasNull()) {
                Uzivatel u = new Uzivatel();
                u.setIdUzivatel(ownerId);
                s.setVlastnik(u);
            }
            Archiv a = new Archiv();
            a.setIdArchiv(rs.getLong("ID_ARCHIV"));
            s.setArchiv(a);
            return s;
        }, id).stream().findFirst().orElse(null);
    }

    public Soubor save(Soubor soubor) {
        if (soubor.getIdSoubor() == null) {
            Long newId = jdbcTemplate.queryForObject("SELECT SEQ_SOUBOR_ID.NEXTVAL FROM dual", Long.class);
            soubor.setIdSoubor(newId);
            LocalDateTime now = soubor.getDatumNahrani() != null ? soubor.getDatumNahrani() : LocalDateTime.now();
            LocalDateTime mod = soubor.getDatumModifikace() != null ? soubor.getDatumModifikace() : now;
            soubor.setDatumNahrani(now);
            soubor.setDatumModifikace(mod);
            jdbcTemplate.update("""
                    INSERT INTO SOUBOR (ID_SOUBOR, NAZEV, TYP, PRIPONA, OBSAH, DATUMNAHRANI, DATUMMODIFIKACE, POPIS, ID_UZIVATELU, ID_ARCHIV)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    soubor.getIdSoubor(),
                    soubor.getNazev(),
                    soubor.getTyp(),
                    soubor.getPripona(),
                    soubor.getObsah(),
                    Timestamp.valueOf(now),
                    Timestamp.valueOf(mod),
                    soubor.getPopis(),
                    soubor.getVlastnik() != null ? soubor.getVlastnik().getIdUzivatel() : null,
                    soubor.getArchiv() != null ? soubor.getArchiv().getIdArchiv() : null
            );
        } else {
            LocalDateTime mod = soubor.getDatumModifikace() != null ? soubor.getDatumModifikace() : LocalDateTime.now();
            jdbcTemplate.update("""
                    UPDATE SOUBOR
                    SET NAZEV = ?, TYP = ?, PRIPONA = ?, OBSAH = ?, DATUMMODIFIKACE = ?, POPIS = ?, ID_UZIVATELU = ?, ID_ARCHIV = ?
                    WHERE ID_SOUBOR = ?
                    """,
                    soubor.getNazev(),
                    soubor.getTyp(),
                    soubor.getPripona(),
                    soubor.getObsah(),
                    Timestamp.valueOf(mod),
                    soubor.getPopis(),
                    soubor.getVlastnik() != null ? soubor.getVlastnik().getIdUzivatel() : null,
                    soubor.getArchiv() != null ? soubor.getArchiv().getIdArchiv() : null,
                    soubor.getIdSoubor()
            );
            soubor.setDatumModifikace(mod);
        }
        return soubor;
    }

    public void deleteById(Long id) {
        if (id == null) return;
        jdbcTemplate.update("DELETE FROM SOUBOR WHERE ID_SOUBOR = ?", id);
    }

    public List<FileMetaRow> searchMeta(Long archivId, String query, int size) {
        int limit = Math.max(1, Math.min(size, 500));
        String sql = """
                SELECT s.ID_SOUBOR       AS idSoubor,
                       s.NAZEV           AS nazev,
                       s.PRIPONA         AS pripona,
                       s.TYP             AS typ,
                       a.NAZEV           AS archiv,
                       s.DATUMNAHRANI    AS datumNahrani,
                       s.DATUMMODIFIKACE AS datumModifikace,
                       LENGTH(s.OBSAH)   AS velikost,
                       CAST(s.POPIS AS VARCHAR2(4000)) AS popis,
                       (u.JMENO || ' ' || u.PRIJMENI) AS owner
                FROM SOUBOR s
                JOIN ARCHIV a ON a.ID_ARCHIV = s.ID_ARCHIV
                LEFT JOIN UZIVATEL u ON u.ID_UZIVATEL = s.ID_UZIVATELU
                WHERE (:archivId IS NULL OR s.ID_ARCHIV = :archivId)
                  AND (:q IS NULL OR LOWER(s.NAZEV) LIKE '%' || LOWER(:q) || '%' OR LOWER(s.TYP) LIKE '%' || LOWER(:q) || '%')
                ORDER BY s.DATUMMODIFIKACE DESC
                FETCH FIRST :limit ROWS ONLY
                """;
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("archivId", archivId)
                .addValue("q", query == null || query.isBlank() ? null : query.trim())
                .addValue("limit", limit);
        return namedParameterJdbcTemplate.query(sql, params, (rs, i) -> new FileMetaRow(
                rs.getLong("idSoubor"),
                rs.getString("nazev"),
                rs.getString("pripona"),
                rs.getString("typ"),
                rs.getString("archiv"),
                toLdt(rs.getTimestamp("datumNahrani")),
                toLdt(rs.getTimestamp("datumModifikace")),
                rs.getLong("velikost"),
                rs.getString("popis"),
                rs.getString("owner")
        ));
    }

    private LocalDateTime toLdt(Timestamp ts) {
        return ts != null ? ts.toLocalDateTime() : null;
    }

    public record FileMetaRow(Long idSoubor,
                              String nazev,
                              String pripona,
                              String typ,
                              String archiv,
                              LocalDateTime datumNahrani,
                              LocalDateTime datumModifikace,
                              Long velikost,
                              String popis,
                              String owner) { }
}

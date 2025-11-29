package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.Log;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.sql.Timestamp;
import java.util.List;

public interface LogRepository extends JpaRepository<Log, Long> {
    List<Log> findTop10ByOrderByDatumZmenyDesc();

    /**
     * Vrátí poslední logy společně s cestou archivu (CONNECT BY).
     */
    @Query(value = """
            SELECT l.ID_LOG          AS idLog,
                   l.TABULKANAZEV    AS tableName,
                   l.OPERACE         AS operation,
                   l.DATUMZMENY      AS timestamp,
                   CAST(l.POPIS AS VARCHAR2(4000)) AS popis,
                   DBMS_LOB.SUBSTR(l.NOVADATA, 4000, 1) AS novaData,
                   DBMS_LOB.SUBSTR(l.STARADATA, 4000, 1) AS staraData,
                   l.IDREKORD        AS idRekord,
                   COALESCE(h.cesta, a.NAZEV) AS archivPath
            FROM LOG l
            JOIN ARCHIV a ON a.ID_ARCHIV = l.ID_ARCHIV
            LEFT JOIN (
                SELECT id_archiv, SYS_CONNECT_BY_PATH(nazev, '/') AS cesta
                FROM ARCHIV
                START WITH parent_id IS NULL
                CONNECT BY PRIOR id_archiv = parent_id
            ) h ON h.id_archiv = l.ID_ARCHIV
            ORDER BY l.DATUMZMENY DESC
            FETCH FIRST 50 ROWS ONLY
            """, nativeQuery = true)
    List<LogWithPath> findRecentWithPath();

    /**
     * Filtrované logy s cestou archivu a stránkováním.
     */
    @Query(value = """
            SELECT l.ID_LOG          AS idLog,
                   l.TABULKANAZEV    AS tableName,
                   l.OPERACE         AS operation,
                   l.DATUMZMENY      AS timestamp,
                   CAST(l.POPIS AS VARCHAR2(4000)) AS popis,
                   DBMS_LOB.SUBSTR(l.NOVADATA, 4000, 1) AS novaData,
                   DBMS_LOB.SUBSTR(l.STARADATA, 4000, 1) AS staraData,
                   l.IDREKORD        AS idRekord,
                   COALESCE(h.cesta, a.NAZEV) AS archivPath
            FROM LOG l
            JOIN ARCHIV a ON a.ID_ARCHIV = l.ID_ARCHIV
            LEFT JOIN (
                SELECT id_archiv, SYS_CONNECT_BY_PATH(nazev, '/') AS cesta
                FROM ARCHIV
                START WITH parent_id IS NULL
                CONNECT BY PRIOR id_archiv = parent_id
            ) h ON h.id_archiv = l.ID_ARCHIV
            WHERE (:archiveId IS NULL OR l.ID_ARCHIV = :archiveId)
              AND (:table IS NULL OR l.TABULKANAZEV = :table)
              AND (:op IS NULL OR l.OPERACE = :op)
            ORDER BY l.DATUMZMENY DESC
            """,
            countQuery = """
            SELECT COUNT(*) FROM LOG l WHERE (:archiveId IS NULL OR l.ID_ARCHIV = :archiveId)
              AND (:table IS NULL OR l.TABULKANAZEV = :table)
              AND (:op IS NULL OR l.OPERACE = :op)
            """,
            nativeQuery = true)
    List<LogWithPath> findFilteredWithPath(Long archiveId, String table, String op, org.springframework.data.domain.Pageable pageable);

    interface LogWithPath {
        Long getIdLog();
        String getTableName();
        String getOperation();
        Timestamp getTimestamp();
        String getPopis();
        String getNovaData();
        String getStaraData();
        String getIdRekord();
        String getArchivPath();
    }
}

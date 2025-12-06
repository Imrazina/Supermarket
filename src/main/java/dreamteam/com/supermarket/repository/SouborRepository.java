package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.Archiv;
import dreamteam.com.supermarket.model.Soubor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SouborRepository extends JpaRepository<Soubor, Long> {
  List<Soubor> findByArchivOrderByDatumModifikaceDesc(Archiv archiv);

  /**
   * Vrací metadatový výpis souborů bez obsahu.
   */
  @Query(value = """
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
      """, nativeQuery = true)
  List<FileMeta> searchMeta(@Param("archivId") Long archivId,
      @Param("q") String query,
      Pageable pageable);

  interface FileMeta {
    Long getIdSoubor();

    String getNazev();

    String getPripona();

    String getTyp();

    String getArchiv();

    LocalDateTime getDatumNahrani();

    LocalDateTime getDatumModifikace();

    Long getVelikost();

    String getPopis();

    String getOwner();
  }
}

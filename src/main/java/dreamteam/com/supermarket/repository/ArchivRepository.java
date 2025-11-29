package dreamteam.com.supermarket.repository;

import dreamteam.com.supermarket.model.Archiv;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ArchivRepository extends JpaRepository<Archiv, Long> {

    /**
     * Hierarchical view of ARCHIV using Oracle CONNECT BY.
     */
    @Query(value = """
            SELECT id_archiv     AS idArchiv,
                   nazev         AS nazev,
                   parent_id     AS parentId,
                   LEVEL         AS lvl,
                   SYS_CONNECT_BY_PATH(nazev, '/') AS cesta
            FROM ARCHIV
            START WITH parent_id IS NULL
            CONNECT BY PRIOR id_archiv = parent_id
            ORDER SIBLINGS BY nazev
            """, nativeQuery = true)
    List<ArchivHierarchy> findHierarchy();

    interface ArchivHierarchy {
        Long getIdArchiv();
        String getNazev();
        Long getParentId();
        Integer getLvl();
        String getCesta();
    }
}

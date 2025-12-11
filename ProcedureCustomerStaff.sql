--------------------------------------------------------------------------------
-- Balík procedur pro obsluhu zákaznických objednávek (fronta + plný seznam).
-- Můžeš spustit v DB a používat přes SYS_REFCURSOR z aplikace nebo pro demo.
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_customer_staff AS
  -- Kompletní seznam zákaznických objednávek pro zaměstnance
  PROCEDURE list_staff_orders(p_cursor OUT SYS_REFCURSOR);

  -- Fronta: pouze neobsazené objednávky ve stavu 1 (Vytvořena) bez obsluhy
  PROCEDURE list_staff_queue(p_cursor OUT SYS_REFCURSOR);
END pkg_customer_staff;
/

CREATE OR REPLACE PACKAGE BODY pkg_customer_staff AS

  PROCEDURE list_staff_orders(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT o.ID_OBJEDNAVKA   AS id,
             o.ID_STATUS       AS status_id,
             s.NAZEV           AS status_nazev,
             o.ID_SUPERMARKET  AS supermarket_id,
             sp.NAZEV          AS super_nazev,
             o.ID_UZIVATEL     AS owner_id,
             u.EMAIL           AS owner_email,
             ou.EMAIL          AS handler_email,
             ou.JMENO          AS handler_firstname,
             ou.PRIJMENI       AS handler_lastname,
             o.DATUM           AS datum,
             o.POZNAMKA        AS poznamka
        FROM OBJEDNAVKA o
        JOIN STATUS s ON s.ID_STATUS = o.ID_STATUS
        LEFT JOIN SUPERMARKET sp ON sp.ID_SUPERMARKET = o.ID_SUPERMARKET
        LEFT JOIN UZIVATEL u ON u.ID_UZIVATEL = o.ID_UZIVATEL
        LEFT JOIN UZIVATEL ou ON ou.ID_UZIVATEL = o.ID_OBSLUHA
       WHERE UPPER(o.TYP_OBJEDNAVKA) = 'ZAKAZNIK'
    ORDER BY o.DATUM DESC, o.ID_OBJEDNAVKA DESC;
  END;

  PROCEDURE list_staff_queue(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT o.ID_OBJEDNAVKA   AS id,
             o.ID_STATUS       AS status_id,
             s.NAZEV           AS status_nazev,
             o.ID_SUPERMARKET  AS supermarket_id,
             sp.NAZEV          AS super_nazev,
             o.ID_UZIVATEL     AS owner_id,
             u.EMAIL           AS owner_email,
             o.DATUM           AS datum,
             o.POZNAMKA        AS poznamka
        FROM OBJEDNAVKA o
        JOIN STATUS s ON s.ID_STATUS = o.ID_STATUS
        LEFT JOIN SUPERMARKET sp ON sp.ID_SUPERMARKET = o.ID_SUPERMARKET
        LEFT JOIN UZIVATEL u ON u.ID_UZIVATEL = o.ID_UZIVATEL
       WHERE UPPER(o.TYP_OBJEDNAVKA) = 'ZAKAZNIK'
         AND o.ID_STATUS = 1            -- Vytvořena
         AND o.ID_OBSLUHA IS NULL       -- Bez přidělené obsluhy
    ORDER BY o.DATUM DESC, o.ID_OBJEDNAVKA DESC;
  END;

END pkg_customer_staff;
/

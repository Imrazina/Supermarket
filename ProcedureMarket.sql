--------------------------------------------------------------------------------
-- Balík procedur pro SKLAD (CRUD / list).
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_sklad AS
  PROCEDURE list_sklady(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_sklad(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE save_sklad(
    p_id            IN NUMBER,
    p_nazev         IN VARCHAR2,
    p_kapacita      IN NUMBER,
    p_telefon       IN VARCHAR2,
    p_id_supermarket IN NUMBER,
    p_out_id        OUT NUMBER
  );
  PROCEDURE delete_sklad(p_id IN NUMBER);
  PROCEDURE delete_info(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
END pkg_sklad;
/

CREATE OR REPLACE PACKAGE BODY pkg_sklad AS

  PROCEDURE list_sklady(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT s.ID_SKLAD        AS id,
             s.NAZEV           AS nazev,
             s.KAPACITA        AS kapacita,
             s.TELEFONNICISLO  AS telefon,
             s.ID_SUPERMARKET  AS supermarket_id,
             sp.NAZEV          AS supermarket_nazev
        FROM SKLAD s
        LEFT JOIN SUPERMARKET sp ON sp.ID_SUPERMARKET = s.ID_SUPERMARKET
       ORDER BY s.ID_SKLAD;
  END;

  PROCEDURE get_sklad(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT s.ID_SKLAD        AS id,
             s.NAZEV           AS nazev,
             s.KAPACITA        AS kapacita,
             s.TELEFONNICISLO  AS telefon,
             s.ID_SUPERMARKET  AS supermarket_id,
             sp.NAZEV          AS supermarket_nazev
        FROM SKLAD s
        LEFT JOIN SUPERMARKET sp ON sp.ID_SUPERMARKET = s.ID_SUPERMARKET
       WHERE s.ID_SKLAD = p_id;
  END;

  PROCEDURE save_sklad(
    p_id            IN NUMBER,
    p_nazev         IN VARCHAR2,
    p_kapacita      IN NUMBER,
    p_telefon       IN VARCHAR2,
    p_id_supermarket IN NUMBER,
    p_out_id        OUT NUMBER
  ) IS
    v_id NUMBER;
  BEGIN
    IF p_id IS NULL THEN
      INSERT INTO SKLAD(ID_SKLAD, NAZEV, KAPACITA, TELEFONNICISLO, ID_SUPERMARKET)
      VALUES (SEQ_SKALD_ID.NEXTVAL, p_nazev, p_kapacita, p_telefon, p_id_supermarket)
      RETURNING ID_SKLAD INTO v_id;
    ELSE
      UPDATE SKLAD
         SET NAZEV = p_nazev,
             KAPACITA = p_kapacita,
             TELEFONNICISLO = p_telefon,
             ID_SUPERMARKET = p_id_supermarket
       WHERE ID_SKLAD = p_id;
      IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20081, 'Sklad nebyl nalezen');
      END IF;
      v_id := p_id;
    END IF;
    p_out_id := v_id;
  END;

  PROCEDURE delete_sklad(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM ZBOZI_DODAVATEL
    WHERE ID_ZBOZI IN (SELECT z.ID_ZBOZI FROM ZBOZI z WHERE z.SKLAD_ID_SKLAD = p_id);
    DELETE FROM ZBOZI WHERE SKLAD_ID_SKLAD = p_id;
    DELETE FROM SKLAD WHERE ID_SKLAD = p_id;
  END;

  PROCEDURE delete_info(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT (SELECT s.NAZEV FROM SKLAD s WHERE s.ID_SKLAD = p_id) AS nazev,
             (SELECT COUNT(*) FROM ZBOZI z WHERE z.SKLAD_ID_SKLAD = p_id) AS zbozi_cnt,
             (SELECT COUNT(*) FROM ZBOZI_DODAVATEL zd WHERE zd.ID_ZBOZI IN (
                SELECT z.ID_ZBOZI FROM ZBOZI z WHERE z.SKLAD_ID_SKLAD = p_id
              )) AS dodavatel_cnt
        FROM DUAL;
  END;

END pkg_sklad;
/

--------------------------------------------------------------------------------
-- Balík procedur pro SUPERMARKET (CRUD / list).
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_supermarket AS
  PROCEDURE list_supermarket(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_supermarket(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE save_supermarket(
    p_id            IN NUMBER,
    p_nazev         IN VARCHAR2,
    p_telefon       IN VARCHAR2,
    p_email         IN VARCHAR2,
    p_id_adresa     IN NUMBER,
    p_ulice         IN VARCHAR2,
    p_cpop          IN VARCHAR2,
    p_corient       IN VARCHAR2,
    p_psc           IN VARCHAR2,
    p_out_id        OUT NUMBER
  );
  PROCEDURE delete_supermarket(p_id IN NUMBER);
  PROCEDURE delete_info(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
END pkg_supermarket;
/

CREATE OR REPLACE PACKAGE BODY pkg_supermarket AS

  PROCEDURE list_supermarket(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT s.ID_SUPERMARKET AS id,
             s.NAZEV          AS nazev,
             s.TELEFON        AS telefon,
             s.EMAIL          AS email,
             s.ID_ADRESA      AS adresa_id,
             a.ULICE          AS adresa_ulice,
             a.CISLOPOPISNE   AS adresa_cpop,
             a.CISLOORIENTACNI AS adresa_corient,
             a.MESTO_PSC      AS adresa_psc,
             m.NAZEV          AS adresa_mesto,
             CASE
               WHEN a.ID_ADRESA IS NULL THEN NULL
               ELSE a.ULICE || ' ' || a.CISLOPOPISNE ||
                    (CASE WHEN a.CISLOORIENTACNI IS NOT NULL THEN '/' || a.CISLOORIENTACNI ELSE '' END) ||
                    ', ' || COALESCE(m.NAZEV, a.MESTO_PSC)
             END              AS adresa_text
        FROM SUPERMARKET s
        LEFT JOIN ADRESA a ON a.ID_ADRESA = s.ID_ADRESA
        LEFT JOIN MESTO m ON m.PSC = a.MESTO_PSC
    ORDER BY s.ID_SUPERMARKET;
  END;

  PROCEDURE get_supermarket(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT s.ID_SUPERMARKET AS id,
             s.NAZEV          AS nazev,
             s.TELEFON        AS telefon,
             s.EMAIL          AS email,
             s.ID_ADRESA      AS adresa_id,
             a.ULICE          AS adresa_ulice,
             a.CISLOPOPISNE   AS adresa_cpop,
             a.CISLOORIENTACNI AS adresa_corient,
             a.MESTO_PSC      AS adresa_psc,
             m.NAZEV          AS adresa_mesto,
             CASE
               WHEN a.ID_ADRESA IS NULL THEN NULL
               ELSE a.ULICE || ' ' || a.CISLOPOPISNE ||
                    (CASE WHEN a.CISLOORIENTACNI IS NOT NULL THEN '/' || a.CISLOORIENTACNI ELSE '' END) ||
                    ', ' || COALESCE(m.NAZEV, a.MESTO_PSC)
             END              AS adresa_text
        FROM SUPERMARKET s
        LEFT JOIN ADRESA a ON a.ID_ADRESA = s.ID_ADRESA
        LEFT JOIN MESTO m ON m.PSC = a.MESTO_PSC
       WHERE s.ID_SUPERMARKET = p_id;
  END;

  PROCEDURE save_supermarket(
    p_id            IN NUMBER,
    p_nazev         IN VARCHAR2,
    p_telefon       IN VARCHAR2,
    p_email         IN VARCHAR2,
    p_id_adresa     IN NUMBER,
    p_ulice         IN VARCHAR2,
    p_cpop          IN VARCHAR2,
    p_corient       IN VARCHAR2,
    p_psc           IN VARCHAR2,
    p_out_id        OUT NUMBER
  ) IS
    v_id        NUMBER;
    v_adresa_id NUMBER;
  BEGIN
    IF p_ulice IS NULL OR p_cpop IS NULL OR p_corient IS NULL OR p_psc IS NULL THEN
      RAISE_APPLICATION_ERROR(-20090, 'Adresa neni kompletni');
    END IF;

    IF p_id_adresa IS NULL THEN
      INSERT INTO ADRESA (ID_ADRESA, ULICE, CISLOPOPISNE, CISLOORIENTACNI, MESTO_PSC)
      VALUES (SEQ_ADRESA_ID.NEXTVAL, p_ulice, p_cpop, p_corient, p_psc)
      RETURNING ID_ADRESA INTO v_adresa_id;
    ELSE
      UPDATE ADRESA
         SET ULICE = p_ulice,
             CISLOPOPISNE = p_cpop,
             CISLOORIENTACNI = p_corient,
             MESTO_PSC = p_psc
       WHERE ID_ADRESA = p_id_adresa;
      IF SQL%ROWCOUNT = 0 THEN
        INSERT INTO ADRESA (ID_ADRESA, ULICE, CISLOPOPISNE, CISLOORIENTACNI, MESTO_PSC)
        VALUES (SEQ_ADRESA_ID.NEXTVAL, p_ulice, p_cpop, p_corient, p_psc)
        RETURNING ID_ADRESA INTO v_adresa_id;
      ELSE
        v_adresa_id := p_id_adresa;
      END IF;
    END IF;

    IF p_id IS NULL THEN
      INSERT INTO SUPERMARKET (ID_SUPERMARKET, NAZEV, TELEFON, EMAIL, ID_ADRESA)
      VALUES (SEQ_SUPERMARKET_ID.NEXTVAL, p_nazev, p_telefon, p_email, v_adresa_id)
      RETURNING ID_SUPERMARKET INTO v_id;
    ELSE
      UPDATE SUPERMARKET
         SET NAZEV = p_nazev,
             TELEFON = p_telefon,
             EMAIL = p_email,
             ID_ADRESA = v_adresa_id
       WHERE ID_SUPERMARKET = p_id;
      IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20082, 'Supermarket nebyl nalezen');
      END IF;
      v_id := p_id;
    END IF;
    p_out_id := v_id;
  END;

  PROCEDURE delete_supermarket(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM ZBOZI_DODAVATEL
     WHERE ID_ZBOZI IN (
       SELECT z.ID_ZBOZI
         FROM ZBOZI z
         JOIN SKLAD s ON s.ID_SKLAD = z.SKLAD_ID_SKLAD
        WHERE s.ID_SUPERMARKET = p_id
     );
    DELETE FROM ZBOZI
     WHERE SKLAD_ID_SKLAD IN (
       SELECT s.ID_SKLAD FROM SKLAD s WHERE s.ID_SUPERMARKET = p_id
     );
    DELETE FROM SKLAD WHERE ID_SUPERMARKET = p_id;
    DELETE FROM SUPERMARKET WHERE ID_SUPERMARKET = p_id;
  END;

  PROCEDURE delete_info(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT (SELECT NAZEV FROM SUPERMARKET WHERE ID_SUPERMARKET = p_id) AS nazev,
             (SELECT COUNT(*) FROM SKLAD s WHERE s.ID_SUPERMARKET = p_id) AS sklad_cnt,
             (SELECT COUNT(*) FROM ZBOZI z WHERE z.SKLAD_ID_SKLAD IN (
                SELECT s.ID_SKLAD FROM SKLAD s WHERE s.ID_SUPERMARKET = p_id
              )) AS zbozi_cnt,
             (SELECT COUNT(*) FROM ZBOZI_DODAVATEL zd WHERE zd.ID_ZBOZI IN (
                SELECT z.ID_ZBOZI FROM ZBOZI z
                JOIN SKLAD s ON s.ID_SKLAD = z.SKLAD_ID_SKLAD
               WHERE s.ID_SUPERMARKET = p_id
              )) AS dodavatel_cnt
        FROM DUAL;
  END;

END pkg_supermarket;
/

--------------------------------------------------------------------------------
-- Balík procedur pro STATUS (CRUD / list).
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_status AS
  PROCEDURE list_status(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_status(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
END pkg_status;
/

CREATE OR REPLACE PACKAGE BODY pkg_status AS

  PROCEDURE list_status(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_STATUS AS id,
             NAZEV     AS nazev
        FROM STATUS
    ORDER BY ID_STATUS;
  END;

  PROCEDURE get_status(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_STATUS AS id,
             NAZEV     AS nazev
        FROM STATUS
       WHERE ID_STATUS = p_id;
  END;

END pkg_status;
/

--------------------------------------------------------------------------------
-- Balík procedur pro KATEGORIE_ZBOZI (CRUD / list).
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_kategorie AS
  PROCEDURE list_kategorie(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_kategorie(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
END pkg_kategorie;
/

CREATE OR REPLACE PACKAGE BODY pkg_kategorie AS

  PROCEDURE list_kategorie(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_KATEGORIE AS id,
             NAZEV        AS nazev,
             POPIS        AS popis
        FROM KATEGORIE_ZBOZI
    ORDER BY ID_KATEGORIE;
  END;

  PROCEDURE get_kategorie(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_KATEGORIE AS id,
             NAZEV        AS nazev,
             POPIS        AS popis
        FROM KATEGORIE_ZBOZI
       WHERE ID_KATEGORIE = p_id;
  END;

END pkg_kategorie;
/

--------------------------------------------------------------------------------
-- Balík procedur pro ZBOZI (CRUD / list).
-- Pozn.: jednoduchý CRUD; případné další pohledy/joiny řeš na straně SELECT.
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_zbozi AS
  PROCEDURE list_zbozi(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_zbozi(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  -- Úprava množství o delta (kladné i záporné), vyhodí chybu pokud záznam neexistuje.
  PROCEDURE update_mnozstvi(p_id IN NUMBER, p_delta IN NUMBER);
  PROCEDURE save_zbozi(
    p_id            IN NUMBER,
    p_nazev         IN VARCHAR2,
    p_popis         IN VARCHAR2,
    p_cena          IN NUMBER,
    p_mnozstvi      IN NUMBER,
    p_minmnozstvi   IN NUMBER,
    p_id_kategorie  IN NUMBER,
    p_id_sklad      IN NUMBER,
    p_out_id        OUT NUMBER
  );
  PROCEDURE delete_zbozi(p_id IN NUMBER);
END pkg_zbozi;
/

CREATE OR REPLACE PACKAGE BODY pkg_zbozi AS

  PROCEDURE list_zbozi(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT z.ID_ZBOZI        AS id,
             z.NAZEV           AS nazev,
             z.POPIS           AS popis,
             z.CENA            AS cena,
             z.MNOZSTVI        AS mnozstvi,
             z.MINMNOZSTVI     AS min_mnozstvi,
             z.ID_KATEGORIE    AS kategorie_id,
             k.NAZEV           AS kategorie_nazev,
             z.SKLAD_ID_SKLAD  AS sklad_id,
             s.NAZEV           AS sklad_nazev,
             s.ID_SUPERMARKET  AS supermarket_id,
             sp.NAZEV          AS supermarket_nazev,
             (SELECT COUNT(*) FROM ZBOZI_DODAVATEL zd WHERE zd.ID_ZBOZI = z.ID_ZBOZI) AS dodavatel_cnt,
             (SELECT LISTAGG(d.FIRMA, ', ') WITHIN GROUP (ORDER BY d.FIRMA)
                FROM ZBOZI_DODAVATEL zd
                JOIN DODAVATEL d ON d.ID_UZIVATELU = zd.ID_UZIVATELU
               WHERE zd.ID_ZBOZI = z.ID_ZBOZI) AS dodavatel_nazvy
        FROM ZBOZI z
        LEFT JOIN KATEGORIE_ZBOZI k ON k.ID_KATEGORIE = z.ID_KATEGORIE
        LEFT JOIN SKLAD s ON s.ID_SKLAD = z.SKLAD_ID_SKLAD
        LEFT JOIN SUPERMARKET sp ON sp.ID_SUPERMARKET = s.ID_SUPERMARKET
    ORDER BY z.ID_ZBOZI;
  END;

  PROCEDURE get_zbozi(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT z.ID_ZBOZI        AS id,
             z.NAZEV           AS nazev,
             z.POPIS           AS popis,
             z.CENA            AS cena,
             z.MNOZSTVI        AS mnozstvi,
             z.MINMNOZSTVI     AS min_mnozstvi,
             z.ID_KATEGORIE    AS kategorie_id,
             k.NAZEV           AS kategorie_nazev,
             z.SKLAD_ID_SKLAD  AS sklad_id,
             s.NAZEV           AS sklad_nazev,
             s.ID_SUPERMARKET  AS supermarket_id,
             sp.NAZEV          AS supermarket_nazev,
             (SELECT COUNT(*) FROM ZBOZI_DODAVATEL zd WHERE zd.ID_ZBOZI = z.ID_ZBOZI) AS dodavatel_cnt,
             (SELECT LISTAGG(d.FIRMA, ', ') WITHIN GROUP (ORDER BY d.FIRMA)
                FROM ZBOZI_DODAVATEL zd
                JOIN DODAVATEL d ON d.ID_UZIVATELU = zd.ID_UZIVATELU
               WHERE zd.ID_ZBOZI = z.ID_ZBOZI) AS dodavatel_nazvy
        FROM ZBOZI z
        LEFT JOIN KATEGORIE_ZBOZI k ON k.ID_KATEGORIE = z.ID_KATEGORIE
        LEFT JOIN SKLAD s ON s.ID_SKLAD = z.SKLAD_ID_SKLAD
        LEFT JOIN SUPERMARKET sp ON sp.ID_SUPERMARKET = s.ID_SUPERMARKET
       WHERE z.ID_ZBOZI = p_id;
  END;

  PROCEDURE save_zbozi(
    p_id            IN NUMBER,
    p_nazev         IN VARCHAR2,
    p_popis         IN VARCHAR2,
    p_cena          IN NUMBER,
    p_mnozstvi      IN NUMBER,
    p_minmnozstvi   IN NUMBER,
    p_id_kategorie  IN NUMBER,
    p_id_sklad      IN NUMBER,
    p_out_id        OUT NUMBER
  ) IS
    v_id NUMBER;
  BEGIN
    IF p_id IS NULL THEN
      INSERT INTO ZBOZI (ID_ZBOZI, NAZEV, POPIS, CENA, MNOZSTVI, MINMNOZSTVI, ID_KATEGORIE, SKLAD_ID_SKLAD)
      VALUES (SEQ_ZBOZI_ID.NEXTVAL, p_nazev, p_popis, p_cena, p_mnozstvi, p_minmnozstvi, p_id_kategorie, p_id_sklad)
      RETURNING ID_ZBOZI INTO v_id;
    ELSE
      UPDATE ZBOZI
         SET NAZEV = p_nazev,
             POPIS = p_popis,
             CENA = p_cena,
             MNOZSTVI = p_mnozstvi,
             MINMNOZSTVI = p_minmnozstvi,
             ID_KATEGORIE = p_id_kategorie,
             SKLAD_ID_SKLAD = p_id_sklad
       WHERE ID_ZBOZI = p_id;
      IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20084, 'Zbozi nebylo nalezeno');
      END IF;
      v_id := p_id;
    END IF;
    p_out_id := v_id;
  END;

  PROCEDURE delete_zbozi(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM ZBOZI_DODAVATEL WHERE ID_ZBOZI = p_id;
    DELETE FROM ZBOZI WHERE ID_ZBOZI = p_id;
  END;

  PROCEDURE update_mnozstvi(p_id IN NUMBER, p_delta IN NUMBER) IS
  BEGIN
    UPDATE ZBOZI SET MNOZSTVI = MNOZSTVI + p_delta WHERE ID_ZBOZI = p_id;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20084, 'Zbozi nebylo nalezeno');
    END IF;
  END;

END pkg_zbozi;
/

--------------------------------------------------------------------------------
-- Balík procedur pro ZBOZI_DODAVATEL (správa vazeb).
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_zbozi_dodavatel AS
  PROCEDURE list_by_zbozi(p_zbozi_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE list_by_dodavatel(p_dod_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE add_rel(p_zbozi_id IN NUMBER, p_dod_id IN NUMBER);
  PROCEDURE delete_rel(p_zbozi_id IN NUMBER, p_dod_id IN NUMBER);
END pkg_zbozi_dodavatel;
/

CREATE OR REPLACE PACKAGE BODY pkg_zbozi_dodavatel AS

  PROCEDURE list_by_zbozi(p_zbozi_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT zd.ID_ZBOZI       AS zbozi_id,
             zd.ID_UZIVATELU   AS dodavatel_id,
             d.FIRMA           AS dodavatel_firma
        FROM ZBOZI_DODAVATEL zd
        JOIN DODAVATEL d ON d.ID_UZIVATELU = zd.ID_UZIVATELU
       WHERE zd.ID_ZBOZI = p_zbozi_id;
  END;

  PROCEDURE list_by_dodavatel(p_dod_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT zd.ID_ZBOZI       AS zbozi_id,
             zd.ID_UZIVATELU   AS dodavatel_id
        FROM ZBOZI_DODAVATEL zd
       WHERE zd.ID_UZIVATELU = p_dod_id;
  END;

  PROCEDURE add_rel(p_zbozi_id IN NUMBER, p_dod_id IN NUMBER) IS
  BEGIN
    INSERT INTO ZBOZI_DODAVATEL (ID_ZBOZI, ID_UZIVATELU)
    VALUES (p_zbozi_id, p_dod_id);
  END;

  PROCEDURE delete_rel(p_zbozi_id IN NUMBER, p_dod_id IN NUMBER) IS
  BEGIN
    DELETE FROM ZBOZI_DODAVATEL
     WHERE ID_ZBOZI = p_zbozi_id
       AND ID_UZIVATELU = p_dod_id;
  END;

END pkg_zbozi_dodavatel;
/

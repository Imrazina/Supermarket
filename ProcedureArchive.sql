--------------------------------------------------------------------------------
-- Balík procedur pro Archiv (strom, soubory, logy) bez ORM.
-- Všechny operace jsou přes uložené procedury / native SQL.
--------------------------------------------------------------------------------

CREATE OR REPLACE PACKAGE pkg_archive AS
  PROCEDURE get_tree(p_cursor OUT SYS_REFCURSOR);

  PROCEDURE get_files(
    p_archive_id IN NUMBER,
    p_q          IN VARCHAR2,
    p_size       IN NUMBER,
    p_cursor     OUT SYS_REFCURSOR
  );

  PROCEDURE get_file_data(
    p_file_id IN NUMBER,
    p_name    OUT VARCHAR2,
    p_ext     OUT VARCHAR2,
    p_type    OUT VARCHAR2,
    p_blob    OUT BLOB
  );

  PROCEDURE save_file(
    p_archive_id  IN NUMBER,
    p_owner_email IN VARCHAR2,
    p_filename    IN VARCHAR2,
    p_mime        IN VARCHAR2,
    p_blob        IN BLOB,
    p_new_id      OUT NUMBER
  );

  PROCEDURE update_file_data(
    p_file_id IN NUMBER,
    p_blob    IN BLOB
  );

  PROCEDURE update_file_descr(
    p_file_id IN NUMBER,
    p_descr   IN VARCHAR2
  );

  PROCEDURE delete_file(p_file_id IN NUMBER);
END pkg_archive;
/

CREATE OR REPLACE PACKAGE BODY pkg_archive AS

  --------------------------------------------------------------------
  -- Helpers
  --------------------------------------------------------------------
  FUNCTION normalize_limit(p_size NUMBER DEFAULT 100) RETURN NUMBER IS
  BEGIN
    IF p_size IS NULL OR p_size < 1 THEN
      RETURN 100;
    ELSIF p_size > 500 THEN
      RETURN 500;
    END IF;
    RETURN p_size;
  END;

  FUNCTION is_log_folder(p_archiv_id NUMBER) RETURN NUMBER IS
    v_count NUMBER;
  BEGIN
    SELECT COUNT(*)
      INTO v_count
      FROM (
            SELECT 1
              FROM ARCHIV
             WHERE REGEXP_LIKE(NAZEV, '(^|[^[:alnum:]])(log|zpravy|zprava|uzivatele|uživatele)([^[:alnum:]]|$)', 'i')
             START WITH ID_ARCHIV = p_archiv_id
           CONNECT BY PRIOR ID_ARCHIV = PARENT_ID
          ) t
     WHERE ROWNUM = 1;
    IF v_count > 0 THEN
      RETURN 1;
    END IF;
    RETURN 0;
  END;

  --------------------------------------------------------------------
  -- Strom archivu
  --------------------------------------------------------------------
  PROCEDURE get_tree(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_ARCHIV       AS id,
             NAZEV           AS name,
             PARENT_ID       AS parent_id,
             LEVEL           AS lvl,
             SYS_CONNECT_BY_PATH(NAZEV, '/') AS path
        FROM ARCHIV
       START WITH PARENT_ID IS NULL
     CONNECT BY PRIOR ID_ARCHIV = PARENT_ID
     ORDER SIBLINGS BY NAZEV;
  END;

  --------------------------------------------------------------------
  -- Výpis metadat souborů (bez obsahu)
  --------------------------------------------------------------------
  PROCEDURE get_files(
    p_archive_id IN NUMBER,
    p_q          IN VARCHAR2,
    p_size       IN NUMBER,
    p_cursor     OUT SYS_REFCURSOR
  ) IS
    v_size NUMBER := normalize_limit(p_size);
  BEGIN
    OPEN p_cursor FOR
      SELECT *
        FROM (
              SELECT s.ID_SOUBOR            AS id,
                     s.NAZEV                AS name,
                     s.PRIPONA              AS ext,
                     s.TYP                  AS type,
                     a.NAZEV                AS archive,
                     (u.JMENO || ' ' || u.PRIJMENI) AS owner,
                     CAST(s.POPIS AS VARCHAR2(4000)) AS description,
                     s.DATUMNAHRANI         AS uploaded,
                     s.DATUMMODIFIKACE      AS updated,
                     DBMS_LOB.GETLENGTH(s.OBSAH) AS file_size
                FROM SOUBOR s
                JOIN ARCHIV a ON a.ID_ARCHIV = s.ID_ARCHIV
           LEFT JOIN UZIVATEL u ON u.ID_UZIVATEL = s.ID_UZIVATELU
               WHERE (p_archive_id IS NULL OR s.ID_ARCHIV = p_archive_id)
                 AND (p_q IS NULL OR LOWER(s.NAZEV) LIKE '%' || LOWER(p_q) || '%' OR LOWER(s.TYP) LIKE '%' || LOWER(p_q) || '%')
               ORDER BY s.DATUMMODIFIKACE DESC
             ) t
       WHERE ROWNUM <= v_size;
  END;

  --------------------------------------------------------------------
  -- Náhled / download obsahu souboru
  --------------------------------------------------------------------
  PROCEDURE get_file_data(
    p_file_id IN NUMBER,
    p_name    OUT VARCHAR2,
    p_ext     OUT VARCHAR2,
    p_type    OUT VARCHAR2,
    p_blob    OUT BLOB
  ) IS
  BEGIN
    SELECT NAZEV, PRIPONA, TYP, OBSAH
      INTO p_name, p_ext, p_type, p_blob
      FROM SOUBOR
     WHERE ID_SOUBOR = p_file_id;
  END;

  --------------------------------------------------------------------
  -- Upload souboru
  --------------------------------------------------------------------
  PROCEDURE save_file(
    p_archive_id  IN NUMBER,
    p_owner_email IN VARCHAR2,
    p_filename    IN VARCHAR2,
    p_mime        IN VARCHAR2,
    p_blob        IN BLOB,
    p_new_id      OUT NUMBER
  ) IS
    v_owner_id NUMBER;
    v_ext      VARCHAR2(30);
    v_name     VARCHAR2(100);
  BEGIN
    IF p_blob IS NULL THEN
      RAISE_APPLICATION_ERROR(-20050, 'Soubor je prázdný.');
    END IF;
    IF p_archive_id IS NULL THEN
      RAISE_APPLICATION_ERROR(-20051, 'Archiv musí být vybrán.');
    END IF;

    IF is_log_folder(p_archive_id) = 1 THEN
      RAISE_APPLICATION_ERROR(-20052, 'Nahrávání do LOG není povoleno.');
    END IF;

    -- Owner podle emailu, fallback první uživatel.
    BEGIN
      SELECT ID_UZIVATEL
        INTO v_owner_id
        FROM UZIVATEL
       WHERE EMAIL = p_owner_email
         AND ROWNUM = 1;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        SELECT ID_UZIVATEL
          INTO v_owner_id
          FROM (
                SELECT ID_UZIVATEL
                  FROM UZIVATEL
              ORDER BY ID_UZIVATEL
               )
         WHERE ROWNUM = 1;
    END;

    -- Název / přípona
    IF INSTR(p_filename, '.', -1) > 0 THEN
      v_ext  := SUBSTR(p_filename, INSTR(p_filename, '.', -1) + 1);
      v_name := SUBSTR(p_filename, 1, INSTR(p_filename, '.', -1) - 1);
    ELSE
      v_ext  := '';
      v_name := p_filename;
    END IF;

    INSERT INTO SOUBOR (
      ID_SOUBOR, NAZEV, TYP, PRIPONA, OBSAH,
      DATUMNAHRANI, DATUMMODIFIKACE, POPIS,
      ID_UZIVATELU, ID_ARCHIV
    ) VALUES (
      SEQ_SOUBOR_ID.NEXTVAL,
      v_name,
      NVL(p_mime, 'application/octet-stream'),
      v_ext,
      p_blob,
      SYSDATE,
      SYSDATE,
      'Nahráno přes proceduru',
      v_owner_id,
      p_archive_id
    )
    RETURNING ID_SOUBOR INTO p_new_id;
  END;

  --------------------------------------------------------------------
  -- Uložení obsahu (edit)
  --------------------------------------------------------------------
  PROCEDURE update_file_data(
    p_file_id IN NUMBER,
    p_blob    IN BLOB
  ) IS
  BEGIN
    UPDATE SOUBOR
       SET OBSAH = p_blob,
           DATUMMODIFIKACE = SYSDATE
     WHERE ID_SOUBOR = p_file_id;

    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20053, 'Soubor not found');
    END IF;
  END;

  --------------------------------------------------------------------
  -- Uložení popisu
  --------------------------------------------------------------------
  PROCEDURE update_file_descr(
    p_file_id IN NUMBER,
    p_descr   IN VARCHAR2
  ) IS
  BEGIN
    UPDATE SOUBOR
       SET POPIS = p_descr,
           DATUMMODIFIKACE = SYSDATE
     WHERE ID_SOUBOR = p_file_id;

    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20054, 'Soubor not found');
    END IF;
  END;

  --------------------------------------------------------------------
  -- Delete souboru
  --------------------------------------------------------------------
  PROCEDURE delete_file(p_file_id IN NUMBER) IS
  BEGIN
    DELETE FROM SOUBOR WHERE ID_SOUBOR = p_file_id;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20055, 'Soubor not found');
    END IF;
  END;

END pkg_archive;
/

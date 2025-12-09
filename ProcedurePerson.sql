--------------------------------------------------------------------------------
-- Procedury pro doplňkové entity uživatele: ZAMESTNANEC, ZAKAZNIK, DODAVATEL.
-- Vše bez ORM, jednoduché CRUD a seznam pozic.
--------------------------------------------------------------------------------

CREATE OR REPLACE PACKAGE pkg_person AS
  -- Zamestnanec
  PROCEDURE employee_get(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE employee_list(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE employee_positions(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE employee_save(
    p_id     IN NUMBER,
    p_mzda   IN NUMBER,
    p_datum  IN DATE,
    p_pozice IN VARCHAR2
  );
  PROCEDURE employee_delete(p_id IN NUMBER);

  -- Zakaznik
  PROCEDURE customer_get(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE customer_list(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE customer_save(p_id IN NUMBER, p_karta IN VARCHAR2);
  PROCEDURE customer_delete(p_id IN NUMBER);

  -- Dodavatel
  PROCEDURE supplier_get(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE supplier_list(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE supplier_save(p_id IN NUMBER, p_firma IN VARCHAR2);
  PROCEDURE supplier_delete(p_id IN NUMBER);
END pkg_person;
/

CREATE OR REPLACE PACKAGE BODY pkg_person AS

  --------------------------------------------------------------------
  -- Zamestnanec
  --------------------------------------------------------------------
  PROCEDURE employee_get(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_UZIVATELU AS id,
             MZDA        AS mzda,
             DATUMNASTUPA AS datum,
             POZICE      AS pozice
        FROM ZAMESTNANEC
       WHERE ID_UZIVATELU = p_id;
  END;

  PROCEDURE employee_list(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_UZIVATELU AS id,
             MZDA        AS mzda,
             DATUMNASTUPA AS datum,
             POZICE      AS pozice
        FROM ZAMESTNANEC
    ORDER BY ID_UZIVATELU;
  END;

  PROCEDURE employee_positions(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT DISTINCT POZICE AS pozice
        FROM ZAMESTNANEC
    ORDER BY POZICE;
  END;

  PROCEDURE employee_save(
    p_id     IN NUMBER,
    p_mzda   IN NUMBER,
    p_datum  IN DATE,
    p_pozice IN VARCHAR2
  ) IS
  BEGIN
    UPDATE ZAMESTNANEC
       SET MZDA = p_mzda,
           DATUMNASTUPA = p_datum,
           POZICE = p_pozice
     WHERE ID_UZIVATELU = p_id;

    IF SQL%ROWCOUNT = 0 THEN
      INSERT INTO ZAMESTNANEC (ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE)
      VALUES (p_id, p_mzda, p_datum, p_pozice);
    END IF;
  END;

  PROCEDURE employee_delete(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM ZAMESTNANEC WHERE ID_UZIVATELU = p_id;
  END;

  --------------------------------------------------------------------
  -- Zakaznik
  --------------------------------------------------------------------
  PROCEDURE customer_get(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_UZIVATELU AS id,
             KARTAVERNOSTI AS karta
        FROM ZAKAZNIK
       WHERE ID_UZIVATELU = p_id;
  END;

  PROCEDURE customer_list(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_UZIVATELU AS id,
             KARTAVERNOSTI AS karta
        FROM ZAKAZNIK
    ORDER BY ID_UZIVATELU;
  END;

  PROCEDURE customer_save(p_id IN NUMBER, p_karta IN VARCHAR2) IS
  BEGIN
    UPDATE ZAKAZNIK
       SET KARTAVERNOSTI = p_karta
     WHERE ID_UZIVATELU = p_id;

    IF SQL%ROWCOUNT = 0 THEN
      INSERT INTO ZAKAZNIK (ID_UZIVATELU, KARTAVERNOSTI)
      VALUES (p_id, p_karta);
    END IF;
  END;

  PROCEDURE customer_delete(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM ZAKAZNIK WHERE ID_UZIVATELU = p_id;
  END;

  --------------------------------------------------------------------
  -- Dodavatel
  --------------------------------------------------------------------
  PROCEDURE supplier_get(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_UZIVATELU AS id,
             FIRMA        AS firma
        FROM DODAVATEL
       WHERE ID_UZIVATELU = p_id;
  END;

  PROCEDURE supplier_list(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_UZIVATELU AS id,
             FIRMA        AS firma
        FROM DODAVATEL
    ORDER BY ID_UZIVATELU;
  END;

  PROCEDURE supplier_save(p_id IN NUMBER, p_firma IN VARCHAR2) IS
  BEGIN
    UPDATE DODAVATEL
       SET FIRMA = p_firma
     WHERE ID_UZIVATELU = p_id;

    IF SQL%ROWCOUNT = 0 THEN
      INSERT INTO DODAVATEL (ID_UZIVATELU, FIRMA)
      VALUES (p_id, p_firma);
    END IF;
  END;

  PROCEDURE supplier_delete(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM DODAVATEL WHERE ID_UZIVATELU = p_id;
  END;

END pkg_person;
/

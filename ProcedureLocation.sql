--------------------------------------------------------------------------------
-- Procedury pro MESTO a ADRESA bez ORM (CRUD/list).
--------------------------------------------------------------------------------

CREATE OR REPLACE PACKAGE pkg_location AS
  PROCEDURE mesto_list(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE mesto_get(p_psc IN VARCHAR2, p_cursor OUT SYS_REFCURSOR);

  PROCEDURE adresa_get(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE adresa_save(
    p_id     IN NUMBER,
    p_ulice  IN VARCHAR2,
    p_cpop   IN VARCHAR2,
    p_corient IN VARCHAR2,
    p_psc    IN VARCHAR2,
    p_out_id OUT NUMBER
  );
  PROCEDURE adresa_delete(p_id IN NUMBER);
END pkg_location;
/

CREATE OR REPLACE PACKAGE BODY pkg_location AS

  PROCEDURE mesto_list(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT m.PSC, m.NAZEV, m.KRAJ
        FROM MESTO m
    ORDER BY m.PSC;
  END;

  PROCEDURE mesto_get(p_psc IN VARCHAR2, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT m.PSC, m.NAZEV, m.KRAJ
        FROM MESTO m
       WHERE m.PSC = p_psc;
  END;

  PROCEDURE adresa_get(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT a.ID_ADRESA,
             a.ULICE,
             a.CISLOPOPISNE,
             a.CISLOORIENTACNI,
             a.MESTO_PSC AS PSC
        FROM ADRESA a
       WHERE a.ID_ADRESA = p_id;
  END;

  PROCEDURE adresa_save(
    p_id     IN NUMBER,
    p_ulice  IN VARCHAR2,
    p_cpop   IN VARCHAR2,
    p_corient IN VARCHAR2,
    p_psc    IN VARCHAR2,
    p_out_id OUT NUMBER
  ) IS
    v_id NUMBER;
  BEGIN
    IF p_id IS NULL THEN
      INSERT INTO ADRESA (ID_ADRESA, ULICE, CISLOPOPISNE, CISLOORIENTACNI, MESTO_PSC)
      VALUES (SEQ_ADRESA_ID.NEXTVAL, p_ulice, p_cpop, p_corient, p_psc)
      RETURNING ID_ADRESA INTO v_id;
    ELSE
      UPDATE ADRESA
         SET ULICE = p_ulice,
             CISLOPOPISNE = p_cpop,
             CISLOORIENTACNI = p_corient,
             MESTO_PSC = p_psc
       WHERE ID_ADRESA = p_id;
      IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20090, 'Adresa not found');
      END IF;
      v_id := p_id;
    END IF;
    p_out_id := v_id;
  END;

  PROCEDURE adresa_delete(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM ADRESA WHERE ID_ADRESA = p_id;
  END;

END pkg_location;
/

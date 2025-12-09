--------------------------------------------------------------------------------
-- Balík procedur pro UZIVATEL (CRUD/listy/validace) bez ORM.
--------------------------------------------------------------------------------

CREATE OR REPLACE PACKAGE pkg_user AS
  PROCEDURE get_by_email(p_email IN VARCHAR2, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_by_id(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE list_all(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_by_phone(p_phone IN VARCHAR2, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_by_role(p_role IN VARCHAR2, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE email_used(p_email IN VARCHAR2, p_self_id IN NUMBER, p_used OUT NUMBER);
  PROCEDURE phone_used(p_phone IN VARCHAR2, p_self_id IN NUMBER, p_used OUT NUMBER);
  PROCEDURE create_user(
    p_jmeno    IN VARCHAR2,
    p_prijmeni IN VARCHAR2,
    p_email    IN VARCHAR2,
    p_heslo    IN VARCHAR2,
    p_phone    IN VARCHAR2,
    p_role_id  IN NUMBER,
    p_id       OUT NUMBER
  );
  PROCEDURE update_core(
    p_id       IN NUMBER,
    p_jmeno    IN VARCHAR2,
    p_prijmeni IN VARCHAR2,
    p_email    IN VARCHAR2,
    p_heslo    IN VARCHAR2,
    p_phone    IN VARCHAR2,
    p_role_id  IN NUMBER
  );
  PROCEDURE delete_user(p_id IN NUMBER);
END pkg_user;
/

--------------------------------------------------------------------------------
-- Funkce pro vygenerování další věrnostní karty ve formátu LTC00001+
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION FN_NEXT_LOYALTY_CARD
  RETURN VARCHAR2
IS
  v_card VARCHAR2(50);
BEGIN
  SELECT 'LTC' || LPAD(NVL(MAX(TO_NUMBER(REGEXP_SUBSTR(kartaVernosti, '[0-9]+$'))), 0) + 1, 5, '0')
    INTO v_card
    FROM ZAKAZNIK;
  RETURN v_card;
END;
/

CREATE OR REPLACE PACKAGE BODY pkg_user AS

  FUNCTION base_query RETURN VARCHAR2 IS
  BEGIN
    RETURN '
      SELECT u.ID_UZIVATEL  AS id,
             u.JMENO        AS jmeno,
             u.PRIJMENI     AS prijmeni,
             u.EMAIL        AS email,
             u.HESLO        AS heslo,
             u.TELEFONNICISLO AS phone,
             u.ID_ADRESA    AS addr_id,
             a.ULICE        AS ulice,
             a.CISLOPOPISNE AS cpop,
             a.CISLOORIENTACNI AS corient,
             a.MESTO_PSC    AS psc,
             m.NAZEV        AS mesto,
             m.KRAJ         AS kraj,
             r.ID_ROLE      AS role_id,
             r.NAZEV        AS role_name
        FROM UZIVATEL u
        LEFT JOIN ADRESA a ON a.ID_ADRESA = u.ID_ADRESA
        LEFT JOIN MESTO m ON m.PSC = a.MESTO_PSC
        LEFT JOIN APP_ROLE r ON r.ID_ROLE = u.ID_ROLE
    ';
  END;

  PROCEDURE get_by_email(p_email IN VARCHAR2, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR base_query() || ' WHERE LOWER(u.EMAIL) = LOWER(:1)' USING p_email;
  END;

  PROCEDURE get_by_id(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR base_query() || ' WHERE u.ID_UZIVATEL = :1' USING p_id;
  END;

  PROCEDURE list_all(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR base_query() || ' ORDER BY u.ID_UZIVATEL';
  END;

  PROCEDURE get_by_phone(p_phone IN VARCHAR2, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR base_query() || ' WHERE u.TELEFONNICISLO = :1' USING p_phone;
  END;

  PROCEDURE get_by_role(p_role IN VARCHAR2, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR base_query() || ' WHERE LOWER(r.NAZEV) = LOWER(:1)' USING p_role;
  END;

  PROCEDURE email_used(p_email IN VARCHAR2, p_self_id IN NUMBER, p_used OUT NUMBER) IS
    v_cnt NUMBER;
  BEGIN
    SELECT COUNT(*) INTO v_cnt
      FROM UZIVATEL
     WHERE LOWER(EMAIL) = LOWER(p_email)
       AND ID_UZIVATEL <> NVL(p_self_id, -1);
    p_used := CASE WHEN v_cnt > 0 THEN 1 ELSE 0 END;
  END;

  PROCEDURE phone_used(p_phone IN VARCHAR2, p_self_id IN NUMBER, p_used OUT NUMBER) IS
    v_cnt NUMBER;
  BEGIN
    SELECT COUNT(*) INTO v_cnt
      FROM UZIVATEL
     WHERE TELEFONNICISLO = p_phone
       AND ID_UZIVATEL <> NVL(p_self_id, -1);
    p_used := CASE WHEN v_cnt > 0 THEN 1 ELSE 0 END;
  END;

  PROCEDURE update_core(
    p_id       IN NUMBER,
    p_jmeno    IN VARCHAR2,
    p_prijmeni IN VARCHAR2,
    p_email    IN VARCHAR2,
    p_heslo    IN VARCHAR2,
    p_phone    IN VARCHAR2,
    p_role_id  IN NUMBER
  ) IS
  BEGIN
    UPDATE UZIVATEL
       SET JMENO = p_jmeno,
           PRIJMENI = p_prijmeni,
           EMAIL = p_email,
           HESLO = p_heslo,
           TELEFONNICISLO = p_phone,
           ID_ROLE = p_role_id
     WHERE ID_UZIVATEL = p_id;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20080, 'Uzivatel not found');
    END IF;
  END;

  PROCEDURE create_user(
    p_jmeno    IN VARCHAR2,
    p_prijmeni IN VARCHAR2,
    p_email    IN VARCHAR2,
    p_heslo    IN VARCHAR2,
    p_phone    IN VARCHAR2,
    p_role_id  IN NUMBER,
    p_id       OUT NUMBER
  ) IS
  BEGIN
    INSERT INTO UZIVATEL (ID_UZIVATEL, JMENO, PRIJMENI, EMAIL, HESLO, TELEFONNICISLO, ID_ROLE)
    VALUES (SEQ_UZIVATEL_ID.NEXTVAL, p_jmeno, p_prijmeni, p_email, p_heslo, p_phone, p_role_id)
    RETURNING ID_UZIVATEL INTO p_id;
  END;

  PROCEDURE delete_user(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM ZAMESTNANEC WHERE ID_UZIVATELU = p_id;
    DELETE FROM ZAKAZNIK WHERE ID_UZIVATELU = p_id;
    DELETE FROM DODAVATEL WHERE ID_UZIVATELU = p_id;
    DELETE FROM UZIVATEL WHERE ID_UZIVATEL = p_id;
  END;

END pkg_user;
/

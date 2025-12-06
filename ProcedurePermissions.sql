--------------------------------------------------------------------------------
-- Balík procedur pro práva/role bez ORM (CRUD + přiřazení).
-- Obsahuje i helper pro kontrolu oprávnění podle emailu uživatele.
--------------------------------------------------------------------------------

CREATE OR REPLACE PACKAGE pkg_permission AS
  PROCEDURE list_permissions(p_cursor OUT SYS_REFCURSOR);

  PROCEDURE save_permission(
    p_id    IN NUMBER,
    p_name  IN VARCHAR2,
    p_code  IN VARCHAR2,
    p_descr IN VARCHAR2,
    p_out_id OUT NUMBER
  );

  PROCEDURE delete_permission(p_id IN NUMBER);

  PROCEDURE list_role_permissions(p_cursor OUT SYS_REFCURSOR);

  PROCEDURE update_role_permissions(p_role_id IN NUMBER, p_codes IN VARCHAR2);

  PROCEDURE user_has_permission(p_email IN VARCHAR2, p_code IN VARCHAR2, p_has OUT NUMBER);
END pkg_permission;
/

CREATE OR REPLACE PACKAGE BODY pkg_permission AS

  FUNCTION split_csv(p_codes VARCHAR2) RETURN SYS.ODCIVARCHAR2LIST IS
    v_result SYS.ODCIVARCHAR2LIST := SYS.ODCIVARCHAR2LIST();
    v_idx    PLS_INTEGER := 1;
    v_item   VARCHAR2(255);
  BEGIN
    IF p_codes IS NULL OR TRIM(p_codes) IS NULL THEN
      RETURN v_result;
    END IF;
    LOOP
      v_item := REGEXP_SUBSTR(p_codes, '[^,]+', 1, v_idx);
      EXIT WHEN v_item IS NULL;
      v_result.EXTEND;
      v_result(v_result.COUNT) := TRIM(v_item);
      v_idx := v_idx + 1;
    END LOOP;
    RETURN v_result;
  END;

  PROCEDURE list_permissions(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_PRAVO AS id, KOD AS code, NAZEV AS name, POPIS AS descr
        FROM PRAVO
    ORDER BY KOD;
  END;

  PROCEDURE save_permission(
    p_id    IN NUMBER,
    p_name  IN VARCHAR2,
    p_code  IN VARCHAR2,
    p_descr IN VARCHAR2,
    p_out_id OUT NUMBER
  ) IS
    v_id NUMBER;
  BEGIN
    IF p_name IS NULL OR p_code IS NULL THEN
      RAISE_APPLICATION_ERROR(-20060, 'Název i kód práva jsou povinné.');
    END IF;
    IF p_id IS NULL THEN
      INSERT INTO PRAVO (ID_PRAVO, NAZEV, KOD, POPIS)
      VALUES (SEQ_PRAVO_ID.NEXTVAL, p_name, p_code, p_descr)
      RETURNING ID_PRAVO INTO v_id;
    ELSE
      UPDATE PRAVO
         SET NAZEV = p_name,
             KOD   = p_code,
             POPIS = p_descr
       WHERE ID_PRAVO = p_id;
      IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20061, 'Právo neexistuje.');
      END IF;
      v_id := p_id;
    END IF;
    p_out_id := v_id;
  END;

  PROCEDURE delete_permission(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM APP_ROLE_PRAVO WHERE ID_PRAVO = p_id;
    DELETE FROM PRAVO WHERE ID_PRAVO = p_id;
  END;

  PROCEDURE list_role_permissions(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT r.ID_ROLE   AS role_id,
             r.NAZEV     AS role_name,
             p.KOD       AS permission_code
        FROM APP_ROLE r
        LEFT JOIN APP_ROLE_PRAVO rp ON rp.ID_ROLE = r.ID_ROLE
        LEFT JOIN PRAVO p ON p.ID_PRAVO = rp.ID_PRAVO
    ORDER BY r.ID_ROLE, p.KOD;
  END;

  PROCEDURE update_role_permissions(p_role_id IN NUMBER, p_codes IN VARCHAR2) IS
    v_codes SYS.ODCIVARCHAR2LIST := split_csv(p_codes);
  BEGIN
    IF p_role_id IS NULL THEN
      RAISE_APPLICATION_ERROR(-20062, 'Role ID je povinné.');
    END IF;

    -- smažeme vazby, které už nejsou v seznamu
    DELETE FROM APP_ROLE_PRAVO rp
     WHERE rp.ID_ROLE = p_role_id
       AND NOT EXISTS (
             SELECT 1
               FROM TABLE(v_codes) c
               JOIN PRAVO p ON UPPER(p.KOD) = UPPER(c.COLUMN_VALUE)
              WHERE p.ID_PRAVO = rp.ID_PRAVO
           );

    -- přidáme nové vazby
    FOR rec IN (
        SELECT p.ID_PRAVO AS pid
          FROM PRAVO p
         WHERE EXISTS (
               SELECT 1 FROM TABLE(v_codes) c
                WHERE UPPER(c.COLUMN_VALUE) = UPPER(p.KOD)
           )
           AND NOT EXISTS (
               SELECT 1 FROM APP_ROLE_PRAVO rp
                WHERE rp.ID_ROLE = p_role_id AND rp.ID_PRAVO = p.ID_PRAVO
           )
    ) LOOP
      INSERT INTO APP_ROLE_PRAVO(ID_ROLE, ID_PRAVO)
      VALUES (p_role_id, rec.pid);
    END LOOP;

    -- pokud seznam prázdný, v_codes má count 0 a DELETE výše odmaže vše, insert nic nepřidá
  END;

  PROCEDURE user_has_permission(p_email IN VARCHAR2, p_code IN VARCHAR2, p_has OUT NUMBER) IS
    v_exists NUMBER;
  BEGIN
    SELECT COUNT(*)
      INTO v_exists
      FROM UZIVATEL u
      JOIN APP_ROLE r ON r.ID_ROLE = u.ID_ROLE
      JOIN APP_ROLE_PRAVO rp ON rp.ID_ROLE = r.ID_ROLE
      JOIN PRAVO p ON p.ID_PRAVO = rp.ID_PRAVO
     WHERE LOWER(u.EMAIL) = LOWER(p_email)
       AND UPPER(p.KOD) = UPPER(p_code);
    p_has := CASE WHEN v_exists > 0 THEN 1 ELSE 0 END;
  END;

END pkg_permission;
/

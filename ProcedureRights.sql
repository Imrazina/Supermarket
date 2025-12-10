--------------------------------------------------------------------------------
-- Balíček pro práva (PRAVO) a mapování role-právo (APP_ROLE_PRAVO).
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_pravo AS
  PROCEDURE list_prava(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_pravo(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_pravo_by_kod(p_kod IN VARCHAR2, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE save_pravo(p_id IN NUMBER, p_nazev IN VARCHAR2, p_kod IN VARCHAR2, p_popis IN VARCHAR2, p_out_id OUT NUMBER);
  PROCEDURE delete_pravo(p_id IN NUMBER);
END pkg_pravo;
/

CREATE OR REPLACE PACKAGE BODY pkg_pravo AS

  PROCEDURE list_prava(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_PRAVO, NAZEV, KOD, POPIS
        FROM PRAVO
    ORDER BY ID_PRAVO;
  END list_prava;

  PROCEDURE get_pravo(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_PRAVO, NAZEV, KOD, POPIS
        FROM PRAVO
       WHERE ID_PRAVO = p_id;
  END get_pravo;

  PROCEDURE get_pravo_by_kod(p_kod IN VARCHAR2, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_PRAVO, NAZEV, KOD, POPIS
        FROM PRAVO
       WHERE UPPER(KOD) = UPPER(p_kod);
  END get_pravo_by_kod;

  PROCEDURE save_pravo(p_id IN NUMBER, p_nazev IN VARCHAR2, p_kod IN VARCHAR2, p_popis IN VARCHAR2, p_out_id OUT NUMBER) IS
    v_id NUMBER;
  BEGIN
    IF p_id IS NULL THEN
      INSERT INTO PRAVO (ID_PRAVO, NAZEV, KOD, POPIS)
      VALUES (SEQ_PRAVO_ID.NEXTVAL, p_nazev, p_kod, p_popis)
      RETURNING ID_PRAVO INTO v_id;
    ELSE
      UPDATE PRAVO
         SET NAZEV = p_nazev,
             KOD = p_kod,
             POPIS = p_popis
       WHERE ID_PRAVO = p_id;
      IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20098, 'Pravo nebylo nalezeno');
      END IF;
      v_id := p_id;
    END IF;
    p_out_id := v_id;
  END save_pravo;

  PROCEDURE delete_pravo(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM APP_ROLE_PRAVO WHERE ID_PRAVO = p_id;
    DELETE FROM PRAVO WHERE ID_PRAVO = p_id;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20099, 'Pravo nebylo nalezeno');
    END IF;
  END delete_pravo;

END pkg_pravo;
/

--------------------------------------------------------------------------------
-- Role-právo mapping
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_role_pravo AS
  PROCEDURE list_kody_by_role(p_role_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE list_role_permissions(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE update_role_permissions(p_role_id IN NUMBER, p_codes IN VARCHAR2);
  PROCEDURE user_has_permission(p_email IN VARCHAR2, p_code IN VARCHAR2, p_has OUT NUMBER);
  PROCEDURE delete_by_role(p_role_id IN NUMBER);
  PROCEDURE delete_by_pravo(p_pravo_id IN NUMBER);
  PROCEDURE insert_mapping(p_pravo_id IN NUMBER, p_role_id IN NUMBER);
END pkg_role_pravo;
/

CREATE OR REPLACE PACKAGE BODY pkg_role_pravo AS

  -- Rozdělení CSV kódů na seznam.
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

  PROCEDURE list_kody_by_role(p_role_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT p.KOD
        FROM APP_ROLE_PRAVO rp
        JOIN PRAVO p ON p.ID_PRAVO = rp.ID_PRAVO
       WHERE rp.ID_ROLE = p_role_id;
  END list_kody_by_role;

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
  END list_role_permissions;

  PROCEDURE update_role_permissions(p_role_id IN NUMBER, p_codes IN VARCHAR2) IS
    v_codes SYS.ODCIVARCHAR2LIST := split_csv(p_codes);
  BEGIN
    IF p_role_id IS NULL THEN
      RAISE_APPLICATION_ERROR(-20100, 'Role ID je povinné.');
    END IF;

    -- Pokud seznam je prázdný → odebereme všechna práva.
    IF v_codes.COUNT = 0 THEN
      DELETE FROM APP_ROLE_PRAVO WHERE ID_ROLE = p_role_id;
      RETURN;
    END IF;

    -- Odebereme všechna práva, která už nejsou v seznamu.
    DELETE FROM APP_ROLE_PRAVO rp
     WHERE rp.ID_ROLE = p_role_id
       AND NOT EXISTS (
             SELECT 1
               FROM PRAVO p
              WHERE p.ID_PRAVO = rp.ID_PRAVO
                AND EXISTS (
                      SELECT 1 FROM TABLE(v_codes) c
                       WHERE UPPER(c.COLUMN_VALUE) = UPPER(p.KOD)
                  )
         );

    -- Přidáme chybějící práva.
    FOR rec IN (
        SELECT p.ID_PRAVO AS pid
          FROM PRAVO p
         WHERE EXISTS (
               SELECT 1 FROM TABLE(v_codes) c
                WHERE UPPER(c.COLUMN_VALUE) = UPPER(p.KOD)
           )
           AND NOT EXISTS (
                 SELECT 1
                   FROM APP_ROLE_PRAVO rp
                  WHERE rp.ID_ROLE = p_role_id
                    AND rp.ID_PRAVO = p.ID_PRAVO
           )
    ) LOOP
      INSERT INTO APP_ROLE_PRAVO(ID_ROLE, ID_PRAVO) VALUES (p_role_id, rec.pid);
    END LOOP;
  END update_role_permissions;

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
  END user_has_permission;

  PROCEDURE delete_by_role(p_role_id IN NUMBER) IS
  BEGIN
    DELETE FROM APP_ROLE_PRAVO WHERE ID_ROLE = p_role_id;
  END delete_by_role;

  PROCEDURE delete_by_pravo(p_pravo_id IN NUMBER) IS
  BEGIN
    DELETE FROM APP_ROLE_PRAVO WHERE ID_PRAVO = p_pravo_id;
  END delete_by_pravo;

  PROCEDURE insert_mapping(p_pravo_id IN NUMBER, p_role_id IN NUMBER) IS
  BEGIN
    INSERT INTO APP_ROLE_PRAVO(ID_PRAVO, ID_ROLE) VALUES (p_pravo_id, p_role_id);
  END insert_mapping;

END pkg_role_pravo;
/

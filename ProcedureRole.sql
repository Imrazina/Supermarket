--------------------------------------------------------------------------------
-- Procedury pro APP_ROLE bez ORM (CRUD/list).
--------------------------------------------------------------------------------

CREATE OR REPLACE PACKAGE pkg_role AS
  PROCEDURE list_roles(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_by_id(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_by_name(p_name IN VARCHAR2, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE save_role(p_id IN NUMBER, p_name IN VARCHAR2, p_out_id OUT NUMBER);
  PROCEDURE delete_role(p_id IN NUMBER);
END pkg_role;
/

CREATE OR REPLACE PACKAGE BODY pkg_role AS

  PROCEDURE list_roles(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_ROLE AS id, NAZEV AS name
        FROM APP_ROLE
    ORDER BY ID_ROLE;
  END;

  PROCEDURE get_by_id(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_ROLE AS id, NAZEV AS name
        FROM APP_ROLE
       WHERE ID_ROLE = p_id;
  END;

  PROCEDURE get_by_name(p_name IN VARCHAR2, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_ROLE AS id, NAZEV AS name
        FROM APP_ROLE
       WHERE UPPER(NAZEV) = UPPER(p_name);
  END;

  PROCEDURE save_role(p_id IN NUMBER, p_name IN VARCHAR2, p_out_id OUT NUMBER) IS
    v_id NUMBER;
  BEGIN
    IF p_id IS NULL THEN
      INSERT INTO APP_ROLE(ID_ROLE, NAZEV)
      VALUES (SEQ_ROLE_ID.NEXTVAL, p_name)
      RETURNING ID_ROLE INTO v_id;
    ELSE
      UPDATE APP_ROLE
         SET NAZEV = p_name
       WHERE ID_ROLE = p_id;
      IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20091, 'Role not found');
      END IF;
      v_id := p_id;
    END IF;
    p_out_id := v_id;
  END;

  PROCEDURE delete_role(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM APP_ROLE_PRAVO WHERE ID_ROLE = p_id;
    DELETE FROM UZIVATEL WHERE ID_ROLE = p_id;
    DELETE FROM APP_ROLE WHERE ID_ROLE = p_id;
  END;

END pkg_role;
/

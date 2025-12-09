--------------------------------------------------------------------------------
-- Balíček pro metadata DB (výpis objektů a DDL).
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_dbmeta AS
  -- Výpis podporovaných objektů ze schématu.
  PROCEDURE list_objects(p_cursor OUT SYS_REFCURSOR);
  -- DDL pro zadaný typ a jméno objektu (nevrací nic, pokud typ/jméno nevalidní).
  PROCEDURE get_ddl(p_typ IN VARCHAR2, p_jmeno IN VARCHAR2, p_ddl OUT CLOB);
END pkg_dbmeta;
/

CREATE OR REPLACE PACKAGE BODY pkg_dbmeta AS

  FUNCTION norm_typ(p_typ IN VARCHAR2) RETURN VARCHAR2 IS
    v_typ VARCHAR2(30);
  BEGIN
    IF p_typ IS NULL THEN
      RETURN NULL;
    END IF;
    v_typ := UPPER(TRIM(p_typ));
    IF v_typ IN ('TABLE','VIEW','INDEX','SEQUENCE','TRIGGER','PROCEDURE','FUNCTION','PACKAGE','PACKAGE BODY','SYNONYM') THEN
      RETURN v_typ;
    ELSE
      RETURN NULL;
    END IF;
  END;

  PROCEDURE list_objects(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT object_type,
             object_name,
             created,
             last_ddl_time
        FROM user_objects
       WHERE object_type IN ('TABLE','VIEW','INDEX','SEQUENCE','TRIGGER','PROCEDURE','FUNCTION','PACKAGE','PACKAGE BODY','SYNONYM')
    ORDER BY object_type, object_name;
  END list_objects;

  PROCEDURE get_ddl(p_typ IN VARCHAR2, p_jmeno IN VARCHAR2, p_ddl OUT CLOB) IS
    v_typ  VARCHAR2(30) := norm_typ(p_typ);
    v_name VARCHAR2(200) := CASE WHEN p_jmeno IS NULL THEN NULL ELSE UPPER(TRIM(p_jmeno)) END;
  BEGIN
    IF v_typ IS NULL OR v_name IS NULL THEN
      p_ddl := NULL;
      RETURN;
    END IF;
    BEGIN
      DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'SQLTERMINATOR', FALSE);
      SELECT DBMS_METADATA.GET_DDL(v_typ, v_name) INTO p_ddl FROM dual;
    EXCEPTION
      WHEN OTHERS THEN
        p_ddl := NULL;
    END;
  END get_ddl;

END pkg_dbmeta;
/


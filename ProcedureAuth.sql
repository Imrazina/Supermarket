--------------------------------------------------------------------------------
-- Balíček pro ověření existence e-mailu/telefonu (AUTH).
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_auth AS
  FUNCTION email_exists(p_email IN VARCHAR2) RETURN NUMBER;
  FUNCTION phone_exists(p_phone IN VARCHAR2) RETURN NUMBER;
END pkg_auth;
/

CREATE OR REPLACE PACKAGE BODY pkg_auth AS

  FUNCTION email_exists(p_email IN VARCHAR2) RETURN NUMBER IS
    v_dummy NUMBER;
  BEGIN
    SELECT 1 INTO v_dummy
      FROM UZIVATEL
     WHERE EMAIL = p_email
       AND ROWNUM = 1;
    RETURN 1;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RETURN 0;
  END email_exists;

  FUNCTION phone_exists(p_phone IN VARCHAR2) RETURN NUMBER IS
    v_dummy NUMBER;
  BEGIN
    SELECT 1 INTO v_dummy
      FROM UZIVATEL
     WHERE TELEFONNICISLO = p_phone
       AND ROWNUM = 1;
    RETURN 1;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RETURN 0;
  END phone_exists;

END pkg_auth;
/

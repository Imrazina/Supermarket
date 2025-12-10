--------------------------------------------------------------------------------
-- Balíček pro notifikace (web push).
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_notifikace AS
  PROCEDURE get_by_adresat(p_adresat IN VARCHAR2, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE list_notifikace(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE save_notifikace(
    p_id        IN OUT NUMBER,
    p_id_zprava IN NUMBER,
    p_authtoken IN VARCHAR2,
    p_endpoint  IN VARCHAR2,
    p_p256dh    IN VARCHAR2,
    p_adresat   IN VARCHAR2
  );
  PROCEDURE delete_by_adresat(p_adresat IN VARCHAR2);
END pkg_notifikace;
/

CREATE OR REPLACE PACKAGE BODY pkg_notifikace AS

  PROCEDURE get_by_adresat(p_adresat IN VARCHAR2, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_NOTIFIKACE,
             ID_ZPRAVA,
             AUTHTOKEN,
             ENDPOINT,
             P256DH,
             ADRESAT
        FROM NOTIFIKACE
       WHERE LOWER(ADRESAT) = LOWER(p_adresat)
       FETCH FIRST 1 ROWS ONLY;
  END get_by_adresat;

  PROCEDURE list_notifikace(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_NOTIFIKACE,
             ID_ZPRAVA,
             AUTHTOKEN,
             ENDPOINT,
             P256DH,
             ADRESAT
        FROM NOTIFIKACE
    ORDER BY ID_NOTIFIKACE;
  END list_notifikace;

  PROCEDURE save_notifikace(
    p_id        IN OUT NUMBER,
    p_id_zprava IN NUMBER,
    p_authtoken IN VARCHAR2,
    p_endpoint  IN VARCHAR2,
    p_p256dh    IN VARCHAR2,
    p_adresat   IN VARCHAR2
  ) IS
  BEGIN
    IF p_id IS NULL THEN
      INSERT INTO NOTIFIKACE(ID_NOTIFIKACE, ID_ZPRAVA, AUTHTOKEN, ENDPOINT, P256DH, ADRESAT)
      VALUES (SEQ_NOTIFIKACE_ID.NEXTVAL, p_id_zprava, p_authtoken, p_endpoint, p_p256dh, p_adresat)
      RETURNING ID_NOTIFIKACE INTO p_id;
    ELSE
      UPDATE NOTIFIKACE
         SET ID_ZPRAVA = p_id_zprava,
             AUTHTOKEN = p_authtoken,
             ENDPOINT  = p_endpoint,
             P256DH    = p_p256dh,
             ADRESAT   = p_adresat
       WHERE ID_NOTIFIKACE = p_id;
      IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20097, 'Notifikace nebyla nalezena');
      END IF;
    END IF;
  END save_notifikace;

  PROCEDURE delete_by_adresat(p_adresat IN VARCHAR2) IS
  BEGIN
    DELETE FROM NOTIFIKACE WHERE LOWER(ADRESAT) = LOWER(p_adresat);
  END delete_by_adresat;

END pkg_notifikace;
/

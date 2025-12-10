--------------------------------------------------------------------------------
-- Balíček pro zprávy (ZPRAVA) – CRUD/list konverzací.
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_zprava AS
  -- Vrátí první zprávu podle odesílatele/příjemce/textu (pro kontrolu duplikátů).
  PROCEDURE find_first(p_sender_id IN NUMBER, p_receiver_id IN NUMBER, p_text IN CLOB, p_cursor OUT SYS_REFCURSOR);
  -- Uloží zprávu, vrátí nové ID.
  PROCEDURE save_zprava(p_sender_id IN NUMBER, p_receiver_id IN NUMBER, p_text IN CLOB, p_datum IN DATE DEFAULT SYSDATE, p_out_id OUT NUMBER);
  -- Posledních N zpráv (default 100) s údaji o účastnících.
  PROCEDURE list_top(p_limit IN NUMBER DEFAULT 100, p_cursor OUT SYS_REFCURSOR);
  -- Konverzace mezi dvěma e-maily (obě směry), seřazeno dle data desc.
  PROCEDURE list_conversation(p_email1 IN VARCHAR2, p_email2 IN VARCHAR2, p_cursor OUT SYS_REFCURSOR);
  -- Aktualizace textu/datu; vyhodí chybu pokud záznam neexistuje.
  PROCEDURE update_zprava(p_id IN NUMBER, p_text IN CLOB, p_datum IN DATE DEFAULT SYSDATE);
  -- Smazání zprávy; vyhodí chybu pokud záznam neexistuje.
  PROCEDURE delete_zprava(p_id IN NUMBER);
END pkg_zprava;
/

CREATE OR REPLACE PACKAGE BODY pkg_zprava AS

  PROCEDURE find_first(p_sender_id IN NUMBER, p_receiver_id IN NUMBER, p_text IN CLOB, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT z.ID_ZPRAVA,
             z.ODESILATEL_ID,
             z.PRIJIMAC_ID,
             z.ZPRAVA,
             z.DATUMZASILANI
        FROM ZPRAVA z
       WHERE z.ODESILATEL_ID = p_sender_id
         AND z.PRIJIMAC_ID = p_receiver_id
         AND ((p_text IS NULL AND z.ZPRAVA IS NULL) OR (p_text IS NOT NULL AND DBMS_LOB.compare(z.ZPRAVA, p_text) = 0))
         AND ROWNUM = 1;
  END find_first;

  PROCEDURE save_zprava(p_sender_id IN NUMBER, p_receiver_id IN NUMBER, p_text IN CLOB, p_datum IN DATE, p_out_id OUT NUMBER) IS
  BEGIN
    INSERT INTO ZPRAVA (ID_ZPRAVA, ODESILATEL_ID, PRIJIMAC_ID, ZPRAVA, DATUMZASILANI)
    VALUES (SEQ_ZPRAVA_ID.NEXTVAL, p_sender_id, p_receiver_id, p_text, NVL(p_datum, SYSDATE))
    RETURNING ID_ZPRAVA INTO p_out_id;
  END save_zprava;

  PROCEDURE list_top(p_limit IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT z.ID_ZPRAVA,
             z.ODESILATEL_ID, s.EMAIL AS S_EMAIL, s.JMENO AS S_JMENO, s.PRIJMENI AS S_PRIJMENI,
             z.PRIJIMAC_ID, r.EMAIL AS R_EMAIL, r.JMENO AS R_JMENO, r.PRIJMENI AS R_PRIJMENI,
             z.ZPRAVA,
             z.DATUMZASILANI
        FROM ZPRAVA z
        JOIN UZIVATEL s ON s.ID_UZIVATEL = z.ODESILATEL_ID
        JOIN UZIVATEL r ON r.ID_UZIVATEL = z.PRIJIMAC_ID
    ORDER BY z.DATUMZASILANI DESC;
  END list_top;

  PROCEDURE list_conversation(p_email1 IN VARCHAR2, p_email2 IN VARCHAR2, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT z.ID_ZPRAVA,
             z.ODESILATEL_ID, s.EMAIL AS S_EMAIL, s.JMENO AS S_JMENO, s.PRIJMENI AS S_PRIJMENI,
             z.PRIJIMAC_ID, r.EMAIL AS R_EMAIL, r.JMENO AS R_JMENO, r.PRIJMENI AS R_PRIJMENI,
             z.ZPRAVA,
             z.DATUMZASILANI
        FROM ZPRAVA z
        JOIN UZIVATEL s ON s.ID_UZIVATEL = z.ODESILATEL_ID
        JOIN UZIVATEL r ON r.ID_UZIVATEL = z.PRIJIMAC_ID
       WHERE (LOWER(s.EMAIL) = LOWER(p_email1) AND LOWER(r.EMAIL) = LOWER(p_email2))
          OR (LOWER(s.EMAIL) = LOWER(p_email2) AND LOWER(r.EMAIL) = LOWER(p_email1))
    ORDER BY z.DATUMZASILANI DESC;
  END list_conversation;

  PROCEDURE update_zprava(p_id IN NUMBER, p_text IN CLOB, p_datum IN DATE) IS
  BEGIN
    UPDATE ZPRAVA
       SET ZPRAVA = p_text,
           DATUMZASILANI = NVL(p_datum, SYSDATE)
     WHERE ID_ZPRAVA = p_id;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20095, 'Zprava nebyla nalezena');
    END IF;
  END update_zprava;

  PROCEDURE delete_zprava(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM ZPRAVA WHERE ID_ZPRAVA = p_id;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20096, 'Zprava nebyla nalezena');
    END IF;
  END delete_zprava;

END pkg_zprava;
/

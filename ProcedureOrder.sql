--------------------------------------------------------------------------------
-- Balík procedur pro OBJEDNAVKA (CRUD / list).
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_objednavka AS
  PROCEDURE list_objednavky(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE list_by_user(p_user_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_objednavka(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE save_objednavka(
    p_id            IN NUMBER,
    p_datum         IN DATE,
    p_status_id     IN NUMBER,
    p_user_id       IN NUMBER,
    p_supermarket_id IN NUMBER,
    p_poznamka      IN CLOB,
    p_typ           IN VARCHAR2,
    p_out_id        OUT NUMBER
  );
  PROCEDURE delete_objednavka(p_id IN NUMBER);
END pkg_objednavka;
/

CREATE OR REPLACE PACKAGE BODY pkg_objednavka AS

  PROCEDURE list_objednavky(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT o.ID_OBJEDNAVKA   AS id,
             o.DATUM          AS datum,
             o.ID_STATUS      AS status_id,
             s.NAZEV          AS status_nazev,
             o.ID_UZIVATEL    AS uzivatel_id,
             u.EMAIL          AS uzivatel_email,
             u.JMENO          AS uzivatel_jmeno,
             u.PRIJMENI       AS uzivatel_prijmeni,
             o.ID_SUPERMARKET AS supermarket_id,
             sp.NAZEV         AS supermarket_nazev,
             o.POZNAMKA       AS poznamka,
             o.TYP_OBJEDNAVKA AS typ_objednavka
        FROM OBJEDNAVKA o
        LEFT JOIN STATUS s ON s.ID_STATUS = o.ID_STATUS
        LEFT JOIN UZIVATEL u ON u.ID_UZIVATEL = o.ID_UZIVATEL
        LEFT JOIN SUPERMARKET sp ON sp.ID_SUPERMARKET = o.ID_SUPERMARKET
    ORDER BY o.ID_OBJEDNAVKA;
  END;

  PROCEDURE list_by_user(p_user_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT o.ID_OBJEDNAVKA   AS id,
             o.DATUM          AS datum,
             o.ID_STATUS      AS status_id,
             s.NAZEV          AS status_nazev,
             o.ID_UZIVATEL    AS uzivatel_id,
             u.EMAIL          AS uzivatel_email,
             u.JMENO          AS uzivatel_jmeno,
             u.PRIJMENI       AS uzivatel_prijmeni,
             o.ID_SUPERMARKET AS supermarket_id,
             sp.NAZEV         AS supermarket_nazev,
             o.POZNAMKA       AS poznamka,
             o.TYP_OBJEDNAVKA AS typ_objednavka
        FROM OBJEDNAVKA o
        LEFT JOIN STATUS s ON s.ID_STATUS = o.ID_STATUS
        LEFT JOIN UZIVATEL u ON u.ID_UZIVATEL = o.ID_UZIVATEL
        LEFT JOIN SUPERMARKET sp ON sp.ID_SUPERMARKET = o.ID_SUPERMARKET
       WHERE o.ID_UZIVATEL = p_user_id
    ORDER BY o.ID_OBJEDNAVKA;
  END;

  PROCEDURE get_objednavka(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT o.ID_OBJEDNAVKA   AS id,
             o.DATUM          AS datum,
             o.ID_STATUS      AS status_id,
             s.NAZEV          AS status_nazev,
             o.ID_UZIVATEL    AS uzivatel_id,
             u.EMAIL          AS uzivatel_email,
             u.JMENO          AS uzivatel_jmeno,
             u.PRIJMENI       AS uzivatel_prijmeni,
             o.ID_SUPERMARKET AS supermarket_id,
             sp.NAZEV         AS supermarket_nazev,
             o.POZNAMKA       AS poznamka,
             o.TYP_OBJEDNAVKA AS typ_objednavka
        FROM OBJEDNAVKA o
        LEFT JOIN STATUS s ON s.ID_STATUS = o.ID_STATUS
        LEFT JOIN UZIVATEL u ON u.ID_UZIVATEL = o.ID_UZIVATEL
        LEFT JOIN SUPERMARKET sp ON sp.ID_SUPERMARKET = o.ID_SUPERMARKET
       WHERE o.ID_OBJEDNAVKA = p_id;
  END;

  PROCEDURE save_objednavka(
    p_id            IN NUMBER,
    p_datum         IN DATE,
    p_status_id     IN NUMBER,
    p_user_id       IN NUMBER,
    p_supermarket_id IN NUMBER,
    p_poznamka      IN CLOB,
    p_typ           IN VARCHAR2,
    p_out_id        OUT NUMBER
  ) IS
    v_id NUMBER;
  BEGIN
    IF p_id IS NULL THEN
      INSERT INTO OBJEDNAVKA (ID_OBJEDNAVKA, DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET)
      VALUES (SEQ_OBJEDNAVKA_ID.NEXTVAL, p_datum, p_status_id, p_typ, p_poznamka, p_user_id, p_supermarket_id)
      RETURNING ID_OBJEDNAVKA INTO v_id;
    ELSE
      UPDATE OBJEDNAVKA
         SET DATUM = p_datum,
             ID_STATUS = p_status_id,
             TYP_OBJEDNAVKA = p_typ,
             POZNAMKA = p_poznamka,
             ID_UZIVATEL = p_user_id,
             ID_SUPERMARKET = p_supermarket_id
       WHERE ID_OBJEDNAVKA = p_id;
      IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20085, 'Objednavka nebyla nalezena');
      END IF;
      v_id := p_id;
    END IF;
    p_out_id := v_id;
  END;

  PROCEDURE delete_objednavka(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM OBJEDNAVKA WHERE ID_OBJEDNAVKA = p_id;
  END;

END pkg_objednavka;
/

--------------------------------------------------------------------------------
-- Balík procedur pro OBJEDNAVKA_ZBOZI (správa položek).
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_objednavka_zbozi AS
  PROCEDURE list_by_objednavka(p_obj_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE add_item(p_obj_id IN NUMBER, p_zbozi_id IN NUMBER, p_pocet IN NUMBER);
  PROCEDURE update_item(p_obj_id IN NUMBER, p_zbozi_id IN NUMBER, p_pocet IN NUMBER);
  PROCEDURE delete_item(p_obj_id IN NUMBER, p_zbozi_id IN NUMBER);
END pkg_objednavka_zbozi;
/

CREATE OR REPLACE PACKAGE BODY pkg_objednavka_zbozi AS

  PROCEDURE list_by_objednavka(p_obj_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT oz.ID_OBJEDNAVKA AS objednavka_id,
             oz.ID_ZBOZI      AS zbozi_id,
             z.NAZEV          AS zbozi_nazev,
             oz.POCET         AS pocet
        FROM OBJEDNAVKA_ZBOZI oz
        JOIN ZBOZI z ON z.ID_ZBOZI = oz.ID_ZBOZI
       WHERE oz.ID_OBJEDNAVKA = p_obj_id;
  END;

  PROCEDURE add_item(p_obj_id IN NUMBER, p_zbozi_id IN NUMBER, p_pocet IN NUMBER) IS
  BEGIN
    INSERT INTO OBJEDNAVKA_ZBOZI (ID_OBJEDNAVKA, ID_ZBOZI, POCET)
    VALUES (p_obj_id, p_zbozi_id, p_pocet);
  END;

  PROCEDURE update_item(p_obj_id IN NUMBER, p_zbozi_id IN NUMBER, p_pocet IN NUMBER) IS
  BEGIN
    UPDATE OBJEDNAVKA_ZBOZI
       SET POCET = p_pocet
     WHERE ID_OBJEDNAVKA = p_obj_id
       AND ID_ZBOZI = p_zbozi_id;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20086, 'Polozka objednavky nebyla nalezena');
    END IF;
  END;

  PROCEDURE delete_item(p_obj_id IN NUMBER, p_zbozi_id IN NUMBER) IS
  BEGIN
    DELETE FROM OBJEDNAVKA_ZBOZI
     WHERE ID_OBJEDNAVKA = p_obj_id
       AND ID_ZBOZI = p_zbozi_id;
  END;

END pkg_objednavka_zbozi;
/

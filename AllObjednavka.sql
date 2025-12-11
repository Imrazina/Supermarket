create or replace PACKAGE BODY pkg_objednavka AS

  PROCEDURE list_objednavky(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT o.ID_OBJEDNAVKA   AS id,
             o.DATUM          AS datum,
             o.ID_STATUS      AS status_id,
             s.NAZEV          AS status_nazev,
             o.CISLO          AS cislo,
             o.ID_UZIVATEL    AS uzivatel_id,
             u.EMAIL          AS uzivatel_email,
             u.JMENO          AS uzivatel_jmeno,
             u.PRIJMENI       AS uzivatel_prijmeni,
             o.ID_SUPERMARKET AS supermarket_id,
             sp.NAZEV         AS supermarket_nazev,
             o.POZNAMKA       AS poznamka,
             o.TYP_OBJEDNAVKA AS typ_objednavka,
             o.ID_OBSLUHA     AS obsluha_id
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
             o.CISLO          AS cislo,
             o.ID_UZIVATEL    AS uzivatel_id,
             u.EMAIL          AS uzivatel_email,
             u.JMENO          AS uzivatel_jmeno,
             u.PRIJMENI       AS uzivatel_prijmeni,
             o.ID_SUPERMARKET AS supermarket_id,
             sp.NAZEV         AS supermarket_nazev,
             o.POZNAMKA       AS poznamka,
             o.TYP_OBJEDNAVKA AS typ_objednavka,
             o.ID_OBSLUHA     AS obsluha_id
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
             o.CISLO          AS cislo,
             o.ID_UZIVATEL    AS uzivatel_id,
             u.EMAIL          AS uzivatel_email,
             u.JMENO          AS uzivatel_jmeno,
             u.PRIJMENI       AS uzivatel_prijmeni,
             o.ID_SUPERMARKET AS supermarket_id,
             sp.NAZEV         AS supermarket_nazev,
             o.POZNAMKA       AS poznamka,
             o.TYP_OBJEDNAVKA AS typ_objednavka,
             o.ID_OBSLUHA     AS obsluha_id
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

  PROCEDURE delete_objednavka_cascade(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM KARTA
     WHERE ID_platba IN (SELECT ID_platba FROM PLATBA WHERE ID_Objednavka = p_id);

    DELETE FROM HOTOVOST
     WHERE ID_platba IN (SELECT ID_platba FROM PLATBA WHERE ID_Objednavka = p_id);

    DELETE FROM PLATBA
     WHERE ID_Objednavka = p_id;

    DELETE FROM POHYB_UCTU
     WHERE ID_Objednavka = p_id;

    DELETE FROM OBJEDNAVKA_ZBOZI
     WHERE ID_Objednavka = p_id;

    DELETE FROM OBJEDNAVKA
     WHERE ID_Objednavka = p_id;
  END delete_objednavka_cascade;

  PROCEDURE list_client_orders(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT o.ID_Objednavka AS id,
             o.DATUM         AS datum,
             o.ID_Status     AS status_id,
             s.NAZEV         AS status_nazev,
             o.ID_Supermarket AS supermarket_id,
             sp.NAZEV        AS supermarket_nazev,
             o.ID_Uzivatel   AS uzivatel_id,
             u.EMAIL         AS uzivatel_email,
             o.ID_Obsluha    AS obsluha_id,
             ou.EMAIL        AS obsluha_email,
             o.POZNAMKA      AS poznamka,
             o.TYP_Objednavka AS typ_objednavka
        FROM OBJEDNAVKA o
        JOIN STATUS s ON s.ID_STATUS = o.ID_STATUS
        JOIN SUPERMARKET sp ON sp.ID_Supermarket = o.ID_Supermarket
        LEFT JOIN UZIVATEL u ON u.ID_Uzivatel = o.ID_Uzivatel
        LEFT JOIN UZIVATEL ou ON ou.ID_Uzivatel = o.ID_Obsluha
       WHERE o.TYP_OBJEDNAVKA = 'ZAKAZNIK'
         AND o.ID_Status IN (1,2,3,4,5,6)
       ORDER BY o.DATUM DESC, o.ID_Objednavka DESC;
  END;

  PROCEDURE list_customer_history(p_user_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT o.ID_Objednavka AS id,
             o.DATUM         AS datum,
             o.ID_Status     AS status_id,
             s.NAZEV         AS status_nazev,
             o.ID_Supermarket AS supermarket_id,
             sp.NAZEV        AS supermarket_nazev,
             o.CISLO         AS cislo,
             o.ID_Uzivatel   AS uzivatel_id,
             u.EMAIL         AS uzivatel_email,
             o.ID_Obsluha    AS obsluha_id,
             ou.EMAIL        AS obsluha_email,
             o.POZNAMKA      AS poznamka,
             o.TYP_Objednavka AS typ_objednavka
        FROM OBJEDNAVKA o
        JOIN STATUS s ON s.ID_STATUS = o.ID_STATUS
        JOIN SUPERMARKET sp ON sp.ID_Supermarket = o.ID_Supermarket
        LEFT JOIN UZIVATEL u ON u.ID_Uzivatel = o.ID_Uzivatel
        LEFT JOIN UZIVATEL ou ON ou.ID_Uzivatel = o.ID_Obsluha
       WHERE o.TYP_OBJEDNAVKA = 'ZAKAZNIK'
         AND o.ID_Status IN (1,2,3,4,5,6)
         AND o.ID_Uzivatel = p_user_id
       ORDER BY o.DATUM DESC, o.ID_Objednavka DESC;
  END;

  PROCEDURE set_customer_status(
    p_order_id   IN NUMBER,
    p_user_id    IN NUMBER,
    p_new_status IN NUMBER,
    p_out_code   OUT NUMBER,
    p_out_prev   OUT NUMBER
  ) IS
  BEGIN
    proc_customer_set_status(p_order_id, p_user_id, p_new_status, p_out_code, p_out_prev);
  END;

END pkg_objednavka;


create or replace PACKAGE BODY pkg_objednavka_zbozi AS

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

create or replace PACKAGE BODY pkg_zbozi AS

  PROCEDURE list_zbozi(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT z.ID_ZBOZI        AS id,
             z.NAZEV           AS nazev,
             z.POPIS           AS popis,
             z.CENA            AS cena,
             z.MNOZSTVI        AS mnozstvi,
             z.MINMNOZSTVI     AS min_mnozstvi,
             z.ID_KATEGORIE    AS kategorie_id,
             k.NAZEV           AS kategorie_nazev,
             z.SKLAD_ID_SKLAD  AS sklad_id,
             s.NAZEV           AS sklad_nazev,
             s.ID_SUPERMARKET  AS supermarket_id,
             sp.NAZEV          AS supermarket_nazev,
             (SELECT COUNT(*) FROM ZBOZI_DODAVATEL zd WHERE zd.ID_ZBOZI = z.ID_ZBOZI) AS dodavatel_cnt,
             (SELECT LISTAGG(d.FIRMA, ', ') WITHIN GROUP (ORDER BY d.FIRMA)
                FROM ZBOZI_DODAVATEL zd
                JOIN DODAVATEL d ON d.ID_UZIVATELU = zd.ID_UZIVATELU
               WHERE zd.ID_ZBOZI = z.ID_ZBOZI) AS dodavatel_nazvy
        FROM ZBOZI z
        LEFT JOIN KATEGORIE_ZBOZI k ON k.ID_KATEGORIE = z.ID_KATEGORIE
        LEFT JOIN SKLAD s ON s.ID_SKLAD = z.SKLAD_ID_SKLAD
        LEFT JOIN SUPERMARKET sp ON sp.ID_SUPERMARKET = s.ID_SUPERMARKET
    ORDER BY z.ID_ZBOZI;
  END;

  PROCEDURE get_zbozi(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT z.ID_ZBOZI        AS id,
             z.NAZEV           AS nazev,
             z.POPIS           AS popis,
             z.CENA            AS cena,
             z.MNOZSTVI        AS mnozstvi,
             z.MINMNOZSTVI     AS min_mnozstvi,
             z.ID_KATEGORIE    AS kategorie_id,
             k.NAZEV           AS kategorie_nazev,
             z.SKLAD_ID_SKLAD  AS sklad_id,
             s.NAZEV           AS sklad_nazev,
             s.ID_SUPERMARKET  AS supermarket_id,
             sp.NAZEV          AS supermarket_nazev,
             (SELECT COUNT(*) FROM ZBOZI_DODAVATEL zd WHERE zd.ID_ZBOZI = z.ID_ZBOZI) AS dodavatel_cnt,
             (SELECT LISTAGG(d.FIRMA, ', ') WITHIN GROUP (ORDER BY d.FIRMA)
                FROM ZBOZI_DODAVATEL zd
                JOIN DODAVATEL d ON d.ID_UZIVATELU = zd.ID_UZIVATELU
               WHERE zd.ID_ZBOZI = z.ID_ZBOZI) AS dodavatel_nazvy
        FROM ZBOZI z
        LEFT JOIN KATEGORIE_ZBOZI k ON k.ID_KATEGORIE = z.ID_KATEGORIE
        LEFT JOIN SKLAD s ON s.ID_SKLAD = z.SKLAD_ID_SKLAD
        LEFT JOIN SUPERMARKET sp ON sp.ID_SUPERMARKET = s.ID_SUPERMARKET
       WHERE z.ID_ZBOZI = p_id;
  END;

  PROCEDURE save_zbozi(
    p_id            IN NUMBER,
    p_nazev         IN VARCHAR2,
    p_popis         IN VARCHAR2,
    p_cena          IN NUMBER,
    p_mnozstvi      IN NUMBER,
    p_minmnozstvi   IN NUMBER,
    p_id_kategorie  IN NUMBER,
    p_id_sklad      IN NUMBER,
    p_out_id        OUT NUMBER
  ) IS
    v_id NUMBER;
  BEGIN
    IF p_id IS NULL THEN
      INSERT INTO ZBOZI (ID_ZBOZI, NAZEV, POPIS, CENA, MNOZSTVI, MINMNOZSTVI, ID_KATEGORIE, SKLAD_ID_SKLAD)
      VALUES (SEQ_ZBOZI_ID.NEXTVAL, p_nazev, p_popis, p_cena, p_mnozstvi, p_minmnozstvi, p_id_kategorie, p_id_sklad)
      RETURNING ID_ZBOZI INTO v_id;
    ELSE
      UPDATE ZBOZI
         SET NAZEV = p_nazev,
             POPIS = p_popis,
             CENA = p_cena,
             MNOZSTVI = p_mnozstvi,
             MINMNOZSTVI = p_minmnozstvi,
             ID_KATEGORIE = p_id_kategorie,
             SKLAD_ID_SKLAD = p_id_sklad
       WHERE ID_ZBOZI = p_id;
      IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20084, 'Zbozi nebylo nalezeno');
      END IF;
      v_id := p_id;
    END IF;
    p_out_id := v_id;
  END;

  PROCEDURE delete_zbozi(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM ZBOZI_DODAVATEL WHERE ID_ZBOZI = p_id;
    DELETE FROM ZBOZI WHERE ID_ZBOZI = p_id;
  END;

  PROCEDURE update_mnozstvi(p_id IN NUMBER, p_delta IN NUMBER) IS
  BEGIN
    UPDATE ZBOZI SET MNOZSTVI = MNOZSTVI + p_delta WHERE ID_ZBOZI = p_id;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20084, 'Zbozi nebylo nalezeno');
    END IF;
  END;

END pkg_zbozi;


create or replace PACKAGE BODY pkg_zbozi_dodavatel AS

  PROCEDURE list_by_zbozi(p_zbozi_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT zd.ID_ZBOZI       AS zbozi_id,
             zd.ID_UZIVATELU   AS dodavatel_id,
             d.FIRMA           AS dodavatel_firma
        FROM ZBOZI_DODAVATEL zd
        JOIN DODAVATEL d ON d.ID_UZIVATELU = zd.ID_UZIVATELU
       WHERE zd.ID_ZBOZI = p_zbozi_id;
  END;

  PROCEDURE list_by_dodavatel(p_dod_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT zd.ID_ZBOZI       AS zbozi_id,
             zd.ID_UZIVATELU   AS dodavatel_id
        FROM ZBOZI_DODAVATEL zd
       WHERE zd.ID_UZIVATELU = p_dod_id;
  END;

  PROCEDURE add_rel(p_zbozi_id IN NUMBER, p_dod_id IN NUMBER) IS
  BEGIN
    INSERT INTO ZBOZI_DODAVATEL (ID_ZBOZI, ID_UZIVATELU)
    VALUES (p_zbozi_id, p_dod_id);
  END;

  PROCEDURE delete_rel(p_zbozi_id IN NUMBER, p_dod_id IN NUMBER) IS
  BEGIN
    DELETE FROM ZBOZI_DODAVATEL
     WHERE ID_ZBOZI = p_zbozi_id
       AND ID_UZIVATELU = p_dod_id;
  END;

END pkg_zbozi_dodavatel;


create or replace PROCEDURE proc_claim_supplier_order(
    p_order_id   IN NUMBER,
    p_user_id    IN NUMBER,
    p_out_code   OUT NUMBER
) AS
    v_typ     OBJEDNAVKA.typ_objednavka%TYPE;
    v_status  OBJEDNAVKA.ID_Status%TYPE;
    v_owner   OBJEDNAVKA.ID_Uzivatel%TYPE;
    v_admin   NUMBER;
BEGIN
    p_out_code := -4;

    SELECT MIN(u.ID_Uzivatel)
      INTO v_admin
      FROM UZIVATEL u
      JOIN APP_ROLE r ON r.ID_Role = u.ID_Role
     WHERE UPPER(r.nazev) = 'ADMIN';

    SELECT typ_objednavka, ID_Status, ID_Uzivatel
      INTO v_typ, v_status, v_owner
      FROM OBJEDNAVKA
     WHERE ID_Objednavka = p_order_id
     FOR UPDATE;

    IF v_typ <> 'DODAVATEL' THEN
        p_out_code := -1; RETURN;
    END IF;
    IF v_status <> 1 THEN
        p_out_code := -2; RETURN;
    END IF;
    IF v_owner IS NULL OR v_owner <> v_admin THEN
        p_out_code := -3; RETURN;
    END IF;

    UPDATE OBJEDNAVKA
       SET ID_Uzivatel = p_user_id,
           ID_Status = 2
     WHERE ID_Objednavka = p_order_id;

    p_out_code := 0;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        p_out_code := -4;
END;

create or replace PROCEDURE list_zbozi_by_supermarket (
    p_supermarket_id IN NUMBER,
    p_q              IN VARCHAR2 DEFAULT NULL,   -- volitelný textový filtr (nazev/popis)
    p_category_id    IN NUMBER   DEFAULT NULL,   -- volitelný filtr kategorie
    p_cursor         OUT SYS_REFCURSOR
) AS
BEGIN
    IF p_supermarket_id IS NULL THEN
        RAISE_APPLICATION_ERROR(-20001, 'SUPERMAKET_ID je povinný');
    END IF;

    OPEN p_cursor FOR
        SELECT
            z.id_zbozi        AS zbozi_id,
            z.nazev           AS name,
            z.popis           AS description,
            z.cena            AS price,
            z.mnozstvi        AS qty_available,
            z.minmnozstvi     AS qty_min,
            z.id_kategorie    AS category_id,
            z.sklad_id_sklad  AS sklad_id,
            s.nazev           AS sklad_name,
            s.id_supermarket  AS supermarket_id,
            sm.nazev          AS supermarket_name
        FROM zbozi z
        JOIN sklad s        ON s.id_sklad = z.sklad_id_sklad
        JOIN supermarket sm ON sm.id_supermarket = s.id_supermarket
        WHERE s.id_supermarket = p_supermarket_id
          AND (p_category_id IS NULL OR z.id_kategorie = p_category_id)
          AND (
                p_q IS NULL
             OR LOWER(z.nazev) LIKE '%' || LOWER(p_q) || '%'
             OR LOWER(z.popis) LIKE '%' || LOWER(p_q) || '%'
          )
        ORDER BY z.nazev;
END;


create or replace PROCEDURE proc_customer_set_status(
    p_order_id      IN NUMBER,
    p_user_id       IN NUMBER,
    p_new_status    IN NUMBER,
    p_out_code      OUT NUMBER,
    p_out_prev      OUT NUMBER
) AS
    v_typ       OBJEDNAVKA.typ_objednavka%TYPE;
    v_status    OBJEDNAVKA.ID_Status%TYPE;
BEGIN
    p_out_code := -3;
    p_out_prev := NULL;

    SELECT typ_objednavka, ID_Status
      INTO v_typ, v_status
      FROM OBJEDNAVKA
     WHERE ID_Objednavka = p_order_id
     FOR UPDATE;

    p_out_prev := v_status;

    IF v_typ <> 'ZAKAZNIK' THEN
        p_out_code := -2; RETURN;
    END IF;

    IF NOT (
        (v_status = 1 AND p_new_status IN (2,6)) OR
        (v_status = 2 AND p_new_status IN (3,6)) OR
        (v_status = 3 AND p_new_status IN (4,6)) OR
        (v_status = 4 AND p_new_status IN (5,6))
    ) THEN
        p_out_code := -1; RETURN;
    END IF;

    UPDATE OBJEDNAVKA
       SET ID_Status = p_new_status,
           ID_Obsluha = p_user_id
     WHERE ID_Objednavka = p_order_id;

    p_out_code := 0;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        p_out_code := -3;
    WHEN DUP_VAL_ON_INDEX THEN
        p_out_code := -1;
    WHEN OTHERS THEN
        RAISE;
END;


create or replace PROCEDURE proc_supplier_set_status(
    p_order_id      IN NUMBER,
    p_user_id       IN NUMBER,
    p_new_status    IN NUMBER,
    p_out_code      OUT NUMBER,
    p_out_reward    OUT NUMBER,
    p_out_balance   OUT NUMBER
) AS
    c_supplier_share CONSTANT NUMBER := 0.7;
    v_typ       OBJEDNAVKA.typ_objednavka%TYPE;
    v_status    OBJEDNAVKA.ID_Status%TYPE;
    v_owner     OBJEDNAVKA.ID_Uzivatel%TYPE;
    v_ucet_id   UCET.ID_UCET%TYPE;
    v_reward    NUMBER := 0;
BEGIN
    p_out_code := -3;
    p_out_reward := NULL;
    p_out_balance := NULL;

    SELECT typ_objednavka, ID_Status, ID_Uzivatel
      INTO v_typ, v_status, v_owner
      FROM OBJEDNAVKA
     WHERE ID_Objednavka = p_order_id
     FOR UPDATE;

    IF v_typ <> 'DODAVATEL' OR v_owner <> p_user_id THEN
        p_out_code := -2; RETURN;
    END IF;

    IF NOT (
        (v_status = 2 AND p_new_status IN (3,6)) OR
        (v_status = 3 AND p_new_status IN (4,6)) OR
        (v_status = 4 AND p_new_status IN (5,6))
    ) THEN
        p_out_code := -1; RETURN;
    END IF;

    IF p_new_status = 5 THEN
        FOR rec IN (
            SELECT oz.ID_Zbozi, oz.pocet
              FROM OBJEDNAVKA_ZBOZI oz
             WHERE oz.ID_Objednavka = p_order_id
        ) LOOP
            UPDATE ZBOZI
               SET mnozstvi = NVL(mnozstvi,0) + rec.pocet
             WHERE ID_Zbozi = rec.ID_Zbozi;
        END LOOP;

        SELECT SUM(oz.pocet * NVL(z.cena,0) * c_supplier_share)
          INTO v_reward
          FROM OBJEDNAVKA_ZBOZI oz
          JOIN ZBOZI z ON z.ID_Zbozi = oz.ID_Zbozi
         WHERE oz.ID_Objednavka = p_order_id;

        BEGIN
            SELECT ID_UCET
              INTO v_ucet_id
              FROM UCET
             WHERE ID_UZIVATEL = p_user_id
             FOR UPDATE;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                INSERT INTO UCET (ID_UZIVATEL, ZUSTATEK)
                VALUES (p_user_id, 0)
                RETURNING ID_UCET INTO v_ucet_id;
        END;

        INSERT INTO POHYB_UCTU (ID_POHYB, ID_UCET, SMER, METODA, CASTKA, POZNAMKA, DATUM_VYTVORENI, ID_OBJEDNAVKA)
        VALUES (SEQ_POHYB_UCTU_ID.NEXTVAL, v_ucet_id, 'P', 'OBJEDNAVKA', v_reward,
                'Vyplaceno za objednavku ' || p_order_id, SYSDATE, p_order_id);

        UPDATE UCET
           SET ZUSTATEK = NVL(ZUSTATEK,0) + v_reward
         WHERE ID_UCET = v_ucet_id
         RETURNING ZUSTATEK INTO p_out_balance;

        p_out_reward := v_reward;
    END IF;

    UPDATE OBJEDNAVKA
       SET ID_Status = p_new_status
     WHERE ID_Objednavka = p_order_id;

    p_out_code := 0;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        p_out_code := -3;
    WHEN DUP_VAL_ON_INDEX THEN
        p_out_code := -1;
    WHEN OTHERS THEN
        RAISE;
END;


create or replace PROCEDURE proc_create_restock_order(
    p_zbozi_id   IN NUMBER,
    p_sklad_id   IN NUMBER,
    p_super_id   IN NUMBER,
    p_min        IN NUMBER,
    p_current    IN NUMBER,
    p_price      IN NUMBER
) AS
    c_supplier_share CONSTANT NUMBER := 0.7;
    v_super         SKLAD.ID_Supermarket%TYPE;
    v_min           NUMBER := NVL(p_min, 0);
    v_current       NUMBER := NVL(p_current, 0);
    v_price         NUMBER := NVL(p_price, 0);
    v_amount        NUMBER;
    v_order_id      NUMBER;
    v_open          NUMBER;
    v_admin_user    NUMBER;
    v_reward        NUMBER := 0;
    v_note          CLOB;
BEGIN
    -- systémový vlastník = libovolný ADMIN (deterministicky nejmenší ID)
    SELECT MIN(u.ID_Uzivatel)
      INTO v_admin_user
      FROM UZIVATEL u
      JOIN APP_ROLE r ON r.ID_Role = u.ID_Role
     WHERE UPPER(r.nazev) = 'ADMIN';

    IF v_admin_user IS NULL THEN
        RAISE_APPLICATION_ERROR(-20110, 'Chybí uživatel s rolí ADMIN pro auto objednávky.');
    END IF;

    -- supermarket pro daný sklad (pokud nebyl dodán)
    IF p_super_id IS NOT NULL THEN
        v_super := p_super_id;
    ELSE
        SELECT ID_Supermarket
          INTO v_super
          FROM SKLAD
         WHERE ID_Sklad = p_sklad_id;
    END IF;

    -- otevřená objednávka pro stejné zboží a supermarket už existuje?
    SELECT COUNT(*)
      INTO v_open
      FROM OBJEDNAVKA o
      JOIN OBJEDNAVKA_ZBOZI oz ON oz.ID_Objednavka = o.ID_Objednavka
     WHERE oz.ID_Zbozi = p_zbozi_id
       AND o.ID_Supermarket = v_super
       AND o.ID_Status IN (1,2,3,4); -- otevřené stavy

    IF v_open > 0 THEN
        RETURN;
    END IF;

    -- množství k doobjednání (jednoduché pravidlo)
    v_amount := GREATEST(v_min * 3, v_min - v_current + v_min);

    -- odměna pro dodavatele (definovaná procentuální část)
    v_reward := ROUND(v_amount * v_price * c_supplier_share, 2);

    v_note := 'Automatická objednávka doplnění zásob';

    -- vytvoř objednávku (vlastník = ADMIN, typ DODAVATEL, status=1 Vytvorena)
    INSERT INTO OBJEDNAVKA (ID_Objednavka, datum, ID_Status, typ_objednavka, poznamka, ID_Uzivatel, ID_Supermarket)
    VALUES (SEQ_OBJEDNAVKA_ID.NEXTVAL, SYSDATE, 1, 'DODAVATEL', v_note, v_admin_user, v_super)
    RETURNING ID_Objednavka INTO v_order_id;

    -- položka
    INSERT INTO OBJEDNAVKA_ZBOZI (pocet, ID_Objednavka, ID_Zbozi)
    VALUES (v_amount, v_order_id, p_zbozi_id);

    -- log záznam pro adminy
    INSERT INTO LOG (
        ID_Log, tabulkaNazev, operace, datumZmeny, idRekord, popis, ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'ZBOZI',
        'I',
        SYSDATE,
        v_order_id,
        'Automaticky vytvořena objednávka kvůli nízkému množství zásob.',
        1
    );
END;

--------------------------------------------------------------------------------
-- PKG_UCET – hlavička (veřejné procedury)
--------------------------------------------------------------------------------
create or replace PACKAGE "PKG_UCET" AS
  PROCEDURE create_account(
    p_id_uzivatel IN  NUMBER,
    p_out_id      OUT NUMBER
  );

  PROCEDURE topup_account(
    p_id_ucet     IN  NUMBER,
    p_castka      IN  NUMBER,
    p_metoda      IN  VARCHAR2,
    p_cislo_karty IN  VARCHAR2 DEFAULT NULL,
    p_poznamka    IN  VARCHAR2 DEFAULT NULL,
    p_id_pohyb    OUT NUMBER
  );

  PROCEDURE pay_order_from_account(
    p_id_ucet       IN  NUMBER,
    p_id_objednavka IN  NUMBER,
    p_castka        IN  NUMBER,
    p_id_pohyb      OUT NUMBER,
    p_id_platba     OUT NUMBER
  );

  PROCEDURE refund_order_to_account(
    p_id_ucet       IN  NUMBER,
    p_id_objednavka IN  NUMBER,
    p_castka        IN  NUMBER,
    p_id_pohyb      OUT NUMBER
  );

  PROCEDURE account_history(
    p_id_ucet IN NUMBER,
    p_cursor  OUT SYS_REFCURSOR
  );

  PROCEDURE account_history_range(
    p_id_ucet IN NUMBER,
    p_from    IN DATE,
    p_to      IN DATE,
    p_cursor  OUT SYS_REFCURSOR
  );
END "PKG_UCET";
/

create or replace PACKAGE BODY           "PKG_UCET" AS

  PROCEDURE create_account(
    p_id_uzivatel IN  NUMBER,
    p_out_id      OUT NUMBER
  ) AS
    v_dummy NUMBER;
  BEGIN
    SELECT 1 INTO v_dummy FROM UZIVATEL WHERE ID_Uzivatel = p_id_uzivatel;

    BEGIN
      SELECT ID_UCET INTO p_out_id FROM UCET WHERE ID_UZIVATEL = p_id_uzivatel;
      RAISE_APPLICATION_ERROR(-20060, 'Ucet pro uzivatele uz existuje');
    EXCEPTION
      WHEN NO_DATA_FOUND THEN NULL;
    END;

    INSERT INTO UCET (ID_UZIVATEL, ZUSTATEK)
    VALUES (p_id_uzivatel, 0)
    RETURNING ID_UCET INTO p_out_id;
  END create_account;

  PROCEDURE topup_account(
    p_id_ucet     IN  NUMBER,
    p_castka      IN  NUMBER,
    p_metoda      IN  VARCHAR2,
    p_cislo_karty IN  VARCHAR2 DEFAULT NULL,
    p_poznamka    IN  VARCHAR2 DEFAULT NULL,
    p_id_pohyb    OUT NUMBER
  ) AS
    v_zustatek UCET.ZUSTATEK%TYPE;
  BEGIN
    IF p_metoda NOT IN ('KARTA','HOTOVOST') THEN
      RAISE_APPLICATION_ERROR(-20061, 'Metoda musi byt KARTA nebo HOTOVOST');
    END IF;
    IF p_metoda = 'KARTA' AND p_cislo_karty IS NULL THEN
      RAISE_APPLICATION_ERROR(-20062, 'cislo karty je povinne pro KARTA');
    END IF;

    SELECT ZUSTATEK INTO v_zustatek FROM UCET WHERE ID_UCET = p_id_ucet FOR UPDATE;

    INSERT INTO POHYB_UCTU (ID_UCET, SMER, METODA, CASTKA, CISLOKARTY, POZNAMKA)
    VALUES (p_id_ucet, 'P', p_metoda, p_castka, p_cislo_karty, p_poznamka)
    RETURNING ID_POHYB INTO p_id_pohyb;

    UPDATE UCET SET ZUSTATEK = v_zustatek + p_castka WHERE ID_UCET = p_id_ucet;
  END topup_account;

  PROCEDURE pay_order_from_account(
    p_id_ucet       IN  NUMBER,
    p_id_objednavka IN  NUMBER,
    p_castka        IN  NUMBER,
    p_id_pohyb      OUT NUMBER,
    p_id_platba     OUT NUMBER
  ) AS
    v_zustatek UCET.ZUSTATEK%TYPE;
    v_dummy    NUMBER;
  BEGIN
    SELECT 1 INTO v_dummy FROM OBJEDNAVKA WHERE ID_Objednavka = p_id_objednavka;
    SELECT ZUSTATEK INTO v_zustatek FROM UCET WHERE ID_UCET = p_id_ucet FOR UPDATE;
    IF v_zustatek < p_castka THEN
      RAISE_APPLICATION_ERROR(-20063, 'Nedostatek prostredku na uctu');
    END IF;

    INSERT INTO POHYB_UCTU (ID_UCET, SMER, METODA, CASTKA, ID_OBJEDNAVKA, POZNAMKA)
    VALUES (p_id_ucet, 'D', 'OBJEDNAVKA', p_castka, p_id_objednavka, 'Platba objednavky '||p_id_objednavka)
    RETURNING ID_POHYB INTO p_id_pohyb;

    UPDATE UCET SET ZUSTATEK = v_zustatek - p_castka WHERE ID_UCET = p_id_ucet;

    INSERT INTO PLATBA (CASTKA, DATUM, ID_OBJEDNAVKA, PLATBATYP, ID_POHYB_UCTU)
    VALUES (p_castka, SYSDATE, p_id_objednavka, 'U', p_id_pohyb)
    RETURNING ID_PLATBA INTO p_id_platba;
  END pay_order_from_account;

  PROCEDURE refund_order_to_account(
    p_id_ucet       IN  NUMBER,
    p_id_objednavka IN  NUMBER,
    p_castka        IN  NUMBER,
    p_id_pohyb      OUT NUMBER
  ) AS
    v_zustatek UCET.ZUSTATEK%TYPE;
    v_dummy    NUMBER;
  BEGIN
    SELECT 1 INTO v_dummy FROM OBJEDNAVKA WHERE ID_Objednavka = p_id_objednavka;
    SELECT ZUSTATEK INTO v_zustatek FROM UCET WHERE ID_UCET = p_id_ucet FOR UPDATE;

    INSERT INTO POHYB_UCTU (ID_UCET, SMER, METODA, CASTKA, ID_OBJEDNAVKA, POZNAMKA)
    VALUES (p_id_ucet, 'P', 'REFUND', p_castka, p_id_objednavka, 'Refund objednavky '||p_id_objednavka)
    RETURNING ID_POHYB INTO p_id_pohyb;

    UPDATE UCET SET ZUSTATEK = v_zustatek + p_castka WHERE ID_UCET = p_id_ucet;
  END refund_order_to_account;

  PROCEDURE account_history(
    p_id_ucet IN NUMBER,
    p_cursor  OUT SYS_REFCURSOR
  ) AS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_POHYB, SMER, METODA, CASTKA, POZNAMKA, DATUM_VYTVORENI, ID_OBJEDNAVKA, CISLOKARTY
      FROM POHYB_UCTU
      WHERE ID_UCET = p_id_ucet
      ORDER BY DATUM_VYTVORENI DESC, ID_POHYB DESC;
  END account_history;

  PROCEDURE account_history_range(
    p_id_ucet IN NUMBER,
    p_from    IN DATE,
    p_to      IN DATE,
    p_cursor  OUT SYS_REFCURSOR
  ) AS
  BEGIN
    OPEN p_cursor FOR
      SELECT ID_POHYB, SMER, METODA, CASTKA, POZNAMKA, DATUM_VYTVORENI, ID_OBJEDNAVKA, CISLOKARTY
        FROM POHYB_UCTU
       WHERE ID_UCET = p_id_ucet
         AND (p_from IS NULL OR TRUNC(DATUM_VYTVORENI) >= TRUNC(p_from))
         AND (p_to   IS NULL OR TRUNC(DATUM_VYTVORENI) <= TRUNC(p_to))
       ORDER BY DATUM_VYTVORENI DESC, ID_POHYB DESC;
  END account_history_range;

END pkg_ucet;

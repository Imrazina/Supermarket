--------------------------------------------------------------------------------
-- Fronta + refund workflow pro zákaznické objednávky (ZAKAZNIK).
-- Samostatný skript, aby nekolidoval s AllObjednavka.sql.
--------------------------------------------------------------------------------

CREATE OR REPLACE PACKAGE pkg_customer_queue AS
  -- Fronta: otevřené objednávky bez obsluhy (status 1, ID_Obsluha IS NULL)
  PROCEDURE list_queue(p_cursor OUT SYS_REFCURSOR);
END pkg_customer_queue;
/

CREATE OR REPLACE PACKAGE BODY pkg_customer_queue AS
  PROCEDURE list_queue(p_cursor OUT SYS_REFCURSOR) IS
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
             o.POZNAMKA      AS poznamka
        FROM OBJEDNAVKA o
        JOIN STATUS s ON s.ID_STATUS = o.ID_STATUS
        JOIN SUPERMARKET sp ON sp.ID_Supermarket = o.ID_Supermarket
        LEFT JOIN UZIVATEL u ON u.ID_Uzivatel = o.ID_Uzivatel
       WHERE o.TYP_Objednavka = 'ZAKAZNIK'
         AND o.ID_Status = 1
         AND o.ID_Obsluha IS NULL
       ORDER BY o.DATUM DESC, o.ID_Objednavka DESC;
  END;
END pkg_customer_queue;
/

--------------------------------------------------------------------------------
-- Refund workflow (pending → approve/reject) pro zákaznické objednávky.
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_customer_refund AS
  c_refund_mark CONSTANT VARCHAR2(64) := '[REFUND_PENDING]';

  FUNCTION strip_refund_mark(p_note CLOB) RETURN CLOB;

  -- Seznam refundů čekajících na obsluhu konkrétního handlera
  PROCEDURE list_pending(p_handler_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);

  -- Zákazník požádá o refund (přidá značku do poznámky)
  -- p_out_code: 0 ok, -1 už čeká, -2 už refundováno, -3 nenalezeno/nepatří, -4 stav nedovoluje
  PROCEDURE request_refund(
    p_order_id IN NUMBER,
    p_email    IN VARCHAR2,
    p_out_code OUT NUMBER
  );

  -- Manažer schválí refund: provede refund a smaže značku
  -- p_out_code: 0 ok, -1 nic k refundu, -2 už vráceno, -3 nenalezeno, -5 chybí platba
  PROCEDURE approve_refund(
    p_order_id    IN NUMBER,
    p_out_code    OUT NUMBER
  );

  -- Manažer zamítne refund: jen smaže značku
  -- p_out_code: 0 ok, -1 nic k refundu, -3 nenalezeno
  PROCEDURE reject_refund(
    p_order_id    IN NUMBER,
    p_out_code    OUT NUMBER
  );
END pkg_customer_refund;
/

CREATE OR REPLACE PACKAGE BODY pkg_customer_refund AS

  FUNCTION strip_refund_mark(p_note CLOB) RETURN CLOB IS
  BEGIN
    IF p_note IS NULL THEN
      RETURN NULL;
    END IF;
    RETURN REPLACE(p_note, c_refund_mark, NULL);
  END;

  FUNCTION is_pending(p_note CLOB) RETURN BOOLEAN IS
  BEGIN
    RETURN p_note LIKE '%' || c_refund_mark || '%';
  END;

  PROCEDURE list_pending(p_handler_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
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
             ou.JMENO        AS obsluha_jmeno,
             ou.PRIJMENI     AS obsluha_prijmeni,
             o.POZNAMKA      AS poznamka,
             o.TYP_Objednavka AS typ_objednavka
        FROM OBJEDNAVKA o
        JOIN STATUS s ON s.ID_STATUS = o.ID_STATUS
        JOIN SUPERMARKET sp ON sp.ID_Supermarket = o.ID_Supermarket
        LEFT JOIN UZIVATEL u ON u.ID_Uzivatel = o.ID_Uzivatel
        LEFT JOIN UZIVATEL ou ON ou.ID_Uzivatel = o.ID_Obsluha
       WHERE o.TYP_Objednavka = 'ZAKAZNIK'
         AND o.POZNAMKA LIKE '%' || c_refund_mark || '%'
         AND (p_handler_id IS NULL OR o.ID_Obsluha = p_handler_id)
       ORDER BY o.DATUM DESC, o.ID_Objednavka DESC;
  END;

  PROCEDURE request_refund(
    p_order_id IN NUMBER,
    p_email    IN VARCHAR2,
    p_out_code OUT NUMBER
  ) IS
    v_status OBJEDNAVKA.ID_Status%TYPE;
    v_note   OBJEDNAVKA.POZNAMKA%TYPE;
    v_owner  OBJEDNAVKA.ID_Uzivatel%TYPE;
    v_has_refund NUMBER;
  BEGIN
    p_out_code := -3;

    IF p_order_id IS NULL OR p_email IS NULL THEN
      RETURN;
    END IF;

    BEGIN
      SELECT o.ID_Status, o.POZNAMKA, o.ID_Uzivatel
        INTO v_status, v_note, v_owner
        FROM OBJEDNAVKA o
        JOIN UZIVATEL u ON u.ID_Uzivatel = o.ID_Uzivatel
       WHERE o.ID_Objednavka = p_order_id
         AND LOWER(u.EMAIL) = LOWER(p_email)
       FOR UPDATE;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        p_out_code := -3; RETURN;
    END;

    SELECT COUNT(*)
      INTO v_has_refund
      FROM POHYB_UCTU pu
     WHERE pu.ID_Objednavka = p_order_id
       AND pu.METODA = 'REFUND';

    IF v_has_refund > 0 THEN
      p_out_code := -2; RETURN;
    END IF;
    IF is_pending(v_note) THEN
      p_out_code := -1; RETURN;
    END IF;
    IF v_status <> 5 THEN
      p_out_code := -4; RETURN; -- jen dokončené
    END IF;

    UPDATE OBJEDNAVKA
       SET POZNAMKA = NVL(v_note, '') || ' ' || c_refund_mark
     WHERE ID_Objednavka = p_order_id;

    p_out_code := 0;
  END;

  PROCEDURE approve_refund(
    p_order_id    IN NUMBER,
    p_out_code    OUT NUMBER
  ) IS
    v_status   OBJEDNAVKA.ID_Status%TYPE;
    v_note     OBJEDNAVKA.POZNAMKA%TYPE;
    v_owner    OBJEDNAVKA.ID_Uzivatel%TYPE;
    v_castka   POHYB_UCTU.CASTKA%TYPE;
    v_ucet_id  UCET.ID_UCET%TYPE;
    v_pohyb_id POHYB_UCTU.ID_POHYB%TYPE;
  BEGIN
    p_out_code := -3;

    IF p_order_id IS NULL THEN
      RETURN;
    END IF;

    BEGIN
      SELECT o.ID_Status, o.POZNAMKA, o.ID_Uzivatel
        INTO v_status, v_note, v_owner
        FROM OBJEDNAVKA o
       WHERE o.ID_Objednavka = p_order_id
       FOR UPDATE;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        p_out_code := -3; RETURN;
    END;

    IF NOT is_pending(v_note) THEN
      p_out_code := -1; RETURN;
    END IF;

    -- najdi platbu objednávky
    BEGIN
      SELECT SUM(pu.CASTKA)
        INTO v_castka
        FROM POHYB_UCTU pu
       WHERE pu.ID_Objednavka = p_order_id
         AND pu.SMER = 'D';
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        v_castka := NULL;
    END;

    IF v_castka IS NULL THEN
      p_out_code := -5; RETURN;
    END IF;

    -- zajisti účet pro vlastníka objednávky
    BEGIN
      SELECT ID_UCET INTO v_ucet_id FROM UCET WHERE ID_UZIVATEL = v_owner FOR UPDATE;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        INSERT INTO UCET (ID_UZIVATEL, ZUSTATEK)
        VALUES (v_owner, 0)
        RETURNING ID_UCET INTO v_ucet_id;
    END;

    -- refund pohyb
    pkg_ucet.refund_order_to_account(v_ucet_id, p_order_id, v_castka, v_pohyb_id);

    -- vyčisti značku a nastav případný storno stav (přepnout na 6 pokud byl <=4)
    UPDATE OBJEDNAVKA
       SET POZNAMKA = strip_refund_mark(v_note),
           ID_Status = CASE WHEN v_status BETWEEN 1 AND 4 THEN 6 ELSE v_status END
     WHERE ID_Objednavka = p_order_id;

    p_out_code := 0;
  END;

  PROCEDURE reject_refund(
    p_order_id    IN NUMBER,
    p_out_code    OUT NUMBER
  ) IS
    v_note OBJEDNAVKA.POZNAMKA%TYPE;
  BEGIN
    p_out_code := -3;
    IF p_order_id IS NULL THEN
      RETURN;
    END IF;

    BEGIN
      SELECT POZNAMKA
        INTO v_note
        FROM OBJEDNAVKA
       WHERE ID_Objednavka = p_order_id
       FOR UPDATE;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        p_out_code := -3; RETURN;
    END;

    IF NOT is_pending(v_note) THEN
      p_out_code := -1; RETURN;
    END IF;

    UPDATE OBJEDNAVKA
       SET POZNAMKA = strip_refund_mark(v_note)
     WHERE ID_Objednavka = p_order_id;

    p_out_code := 0;
  END;

END pkg_customer_refund;
/

--------------------------------------------------------------------------------
-- Doplňkový restock pro zákaznické objednávky (zvrácení rezervovaných kusů).
--------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE proc_restock_customer_items(
    p_order_id IN NUMBER
) AS
BEGIN
    IF p_order_id IS NULL THEN
        RETURN;
    END IF;
    FOR rec IN (
        SELECT ID_Zbozi, POCET
          FROM OBJEDNAVKA_ZBOZI
         WHERE ID_Objednavka = p_order_id
    ) LOOP
        UPDATE ZBOZI
           SET MNOZSTVI = NVL(MNOZSTVI,0) + NVL(rec.POCET,0)
         WHERE ID_Zbozi = rec.ID_Zbozi;
    END LOOP;
END;
/

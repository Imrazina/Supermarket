--------------------------------------------------------------------------------
-- Cashback za 5 objednávek (samostatná funkce, bez package)
-- Návratové kódy:
--   0  = OK
--  -1  = Nedostatečný počet objednávek
--  -2  = Cooldown (ještě nelze)
--  -3  = Uživatel/účet nenalezen
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_cashback_5orders(
    p_user_id      IN NUMBER,
    p_min_orders   IN NUMBER DEFAULT 5,
    p_cooldown_d   IN NUMBER DEFAULT 7,
    p_out_turnover OUT NUMBER,
    p_out_cashback OUT NUMBER,
    p_out_balance  OUT NUMBER
) RETURN NUMBER IS
    v_ucet_id       UCET.ID_UCET%TYPE;
    v_last_cashback DATE;
    v_balance       UCET.ZUSTATEK%TYPE;
    v_cnt           NUMBER;
    v_sum           NUMBER;
    v_cashback      NUMBER;
    v_from          DATE;
BEGIN
    -- Najdi účet uživatele (unicita UCET.ID_UZIVATEL) a zamkni pro update
    SELECT ID_UCET, NVL(ZUSTATEK, 0)
      INTO v_ucet_id, v_balance
      FROM UCET
     WHERE ID_UZIVATEL = p_user_id
     FOR UPDATE;

    -- Datum posledního cashbacku čteme z pohybů
    SELECT MAX(DATUM_VYTVORENI)
      INTO v_last_cashback
      FROM POHYB_UCTU
     WHERE ID_UCET = v_ucet_id
       AND METODA = 'CASHBACK';

    IF v_last_cashback IS NOT NULL AND (SYSDATE - v_last_cashback) < p_cooldown_d THEN
      RETURN -2;
    END IF;

    v_from := NVL(v_last_cashback, SYSDATE - 365);

    SELECT COUNT(*), NVL(SUM(p.castka), 0)
      INTO v_cnt, v_sum
      FROM PLATBA p
      JOIN OBJEDNAVKA o ON o.ID_OBJEDNAVKA = p.ID_OBJEDNAVKA
     WHERE o.ID_UZIVATEL = p_user_id
       AND o.datum >= v_from
       AND p.castka > 0;

    IF v_cnt < p_min_orders THEN
      RETURN -1;
    END IF;

    -- 2 % z obratu, min 5 Kč, max 200 Kč
    v_cashback := LEAST(GREATEST(v_sum * 0.02, 5), 200);

    INSERT INTO POHYB_UCTU (ID_POHYB, ID_UCET, SMER, METODA, CASTKA, POZNAMKA, DATUM_VYTVORENI)
    VALUES (SEQ_POHYB_UCTU_ID.NEXTVAL, v_ucet_id, 'P', 'CASHBACK', v_cashback, 'Cashback za ' || v_cnt || ' objednávek', SYSDATE);

    UPDATE UCET
       SET ZUSTATEK = NVL(ZUSTATEK, 0) + v_cashback
     WHERE ID_UCET = v_ucet_id
     RETURNING ZUSTATEK INTO p_out_balance;

    p_out_turnover := v_sum;
    p_out_cashback := v_cashback;
    RETURN 0;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RETURN -3;
    WHEN OTHERS THEN
      RAISE;
END fn_cashback_5orders;
/

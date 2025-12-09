--------------------------------------------------------------------
 -- TRIGGER: OBJEDNAVKA_ROLE_CHECK
 -- Popis:
 --   Ověřuje, že pro daný typ objednávky existuje uživatel
 --   v příslušné podřízené tabulce (ZAKAZNIK nebo DODAVATEL).
 --   Kontrola zajišťuje správné přiřazení objednávek podle rolí.
--------------------------------------------------------------------
CREATE OR REPLACE TRIGGER OBJEDNAVKA_ROLE_CHECK
BEFORE INSERT OR UPDATE ON OBJEDNAVKA
FOR EACH ROW
DECLARE
    v_count NUMBER;
BEGIN
    --------------------------------------------------------------------
    -- KONTROLA: TYP_OBJEDNAVKA = 'ZAKAZNIK'
    -- Uživatel musí existovat v tabulce ZAKAZNIK
    --------------------------------------------------------------------
    IF :NEW.TYP_OBJEDNAVKA = 'ZAKAZNIK' THEN
        SELECT COUNT(*) INTO v_count
        FROM ZAKAZNIK
        WHERE ID_UZIVATELU = :NEW.ID_UZIVATEL;

        IF v_count = 0 THEN
            RAISE_APPLICATION_ERROR(
                -20001,
                'Chyba: Pro TYP_OBJEDNAVKA = ZAKAZNIK musi ID_UZIVATEL existovat v tabulce ZAKAZNIK.'
            );
        END IF;
    END IF;
    
    --------------------------------------------------------------------
    -- KONTROLA: TYP_OBJEDNAVKA = 'DODAVATEL'
    -- Uživatel musí existovat v tabulce DODAVATEL
    --------------------------------------------------------------------
    IF :NEW.TYP_OBJEDNAVKA = 'DODAVATEL' THEN
        SELECT COUNT(*) INTO v_count
        FROM DODAVATEL
        WHERE ID_UZIVATELU = :NEW.ID_UZIVATEL;

        IF v_count = 0 THEN
            -- povolíme také systémového uživatele s rolí ADMIN (auto-objednávky)
            SELECT COUNT(*) INTO v_count
            FROM UZIVATEL u
            JOIN APP_ROLE r ON r.ID_Role = u.ID_Role
            WHERE u.ID_Uzivatel = :NEW.ID_UZIVATEL
              AND UPPER(r.nazev) = 'ADMIN';
        END IF;

        IF v_count = 0 THEN
            RAISE_APPLICATION_ERROR(
                -20002,
                'Chyba: Pro TYP_OBJEDNAVKA = DODAVATEL musi ID_UZIVATEL existovat v tabulce DODAVATEL nebo mit roli ADMIN.'
            );
        END IF;
    END IF;

END;
/

------------------------------------------------------------
-- PROCEDURA: PROC_CLAIM_SUPPLIER_ORDER
-- Popis:
--   Dodavatel si vezme volnou objednávku (typ DODAVATEL) ve stavu 1.
--   Volná objednávka musí mít vlastníka = ADMIN (automatické objednávky).
-- Výstup: p_out_code 0=OK, -1 není typ DODAVATEL, -2 špatný stav,
--         -3 není volný (owner není ADMIN), -4 nenalezeno
------------------------------------------------------------
CREATE OR REPLACE PROCEDURE proc_claim_supplier_order(
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
/

------------------------------------------------------------
-- PROCEDURA: PROC_SUPPLIER_SET_STATUS
-- Popis:
--   Dodavatel mění stav objednávky (2→3→4→5 nebo 2/3/4→6).
--   Při dokončení (5) doplní sklad a připíše výplatu dodavateli.
-- Výstup: p_out_code 0=OK, -1 zakázaný přechod, -2 není owner/typ,
--         -3 nenalezeno, -5 účet nenalezen
------------------------------------------------------------
CREATE OR REPLACE PROCEDURE proc_supplier_set_status(
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
/
--------------------------------------------------------------------
-- TEST
--------------------------------------------------------------------
-- PŘÍPRAVA
INSERT INTO UZIVATEL (ID_Uzivatel, jmeno, prijmeni, email, heslo, telefonniCislo, ID_Role) VALUES (9001, 'Anna', 'Shabossova', 'anna@test.cz', 'annaTest', '777123456', 3);
INSERT INTO ZAKAZNIK (ID_Uzivatelu, kartaVernosti) VALUES (9001, 'CARD-001');
-- PROJDE
INSERT INTO OBJEDNAVKA (ID_Objednavka, datum, ID_Status, typ_objednavka, ID_Uzivatel, ID_Supermarket) VALUES (10001, SYSDATE, 1, 'ZAKAZNIK', 9001, 1);
-- SELŽE (uživatel není dodavatel)
INSERT INTO OBJEDNAVKA (ID_Objednavka, datum, ID_Status, typ_objednavka, ID_Uzivatel, ID_Supermarket) VALUES (10002, SYSDATE, 1, 'DODAVATEL', 9001, 1);
-- DELETE
DELETE FROM UZIVATEL WHERE ID_Uzivatel = 9001;
DELETE FROM OBJEDNAVKA WHERE ID_Objednavka = 10001;



------------------------------------------------------------
-- GLOBAL TEMPORARY TABLE: SKLAD_CAPACITY_TMP
-- Popis:
--   Pomocná GTT tabulka pro výpočet kapacity skladů.
--   Uchovává pouze dočasná data vložená triggerem TRG_SKLAD_CAPACITY_BR.
--  Data se automaticky mažou po COMMIT/ROLLBACK.
------------------------------------------------------------
CREATE GLOBAL TEMPORARY TABLE SKLAD_CAPACITY_TMP (
    id_zbozi     NUMBER,
    id_sklad     NUMBER,
    mnozstvi     NUMBER
) ON COMMIT DELETE ROWS;

------------------------------------------------------------
-- TRIGGER: TRG_SKLAD_CAPACITY_BR
-- Popis:
--   BEFORE INSERT/UPDATE trigger ukládá nové množství zboží
--   do pomocné GTT tabulky pro následnou kontrolu kapacity.
------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_SKLAD_CAPACITY_BR
BEFORE INSERT OR UPDATE ON ZBOZI
FOR EACH ROW
BEGIN
    -- записать новые данные для проверки после UPDATE/INSERT
    INSERT INTO SKLAD_CAPACITY_TMP (id_zbozi, id_sklad, mnozstvi)
    VALUES (:NEW.ID_Zbozi, :NEW.SKLAD_ID_Sklad, :NEW.mnozstvi);
END;
/
------------------------------------------------------------
-- TRIGGER: TRG_SKLAD_CAPACITY
-- Popis:
--   AFTER INSERT/UPDATE trigger kontroluje, zda nové součty
--   množství ve skladu nepřekračují maximální kapacitu.
--   Kontroluje všechny sklady, které byly změnou dotčeny.
------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_SKLAD_CAPACITY
AFTER INSERT OR UPDATE ON ZBOZI
DECLARE
    CURSOR c IS
        SELECT DISTINCT id_sklad FROM SKLAD_CAPACITY_TMP;

    v_sklad NUMBER;
    v_capacity NUMBER;
    v_total NUMBER;
BEGIN
    -- проверяем каждый склад, который был затронут
    OPEN c;
    LOOP
        FETCH c INTO v_sklad;
        EXIT WHEN c%NOTFOUND;

        -- kapacita skladu
        SELECT kapacita
        INTO v_capacity
        FROM SKLAD
        WHERE ID_Sklad = v_sklad;

        -- celkové množství ve skladu
        SELECT NVL(SUM(mnozstvi),0)
        INTO v_total
        FROM ZBOZI
        WHERE SKLAD_ID_Sklad = v_sklad;

        -- pokud překročeno → chyba
        IF v_total > v_capacity THEN
            DELETE FROM SKLAD_CAPACITY_TMP;
            RAISE_APPLICATION_ERROR(
                -20001,
                'Sklad ' || v_sklad || ' je plny: prekrocena kapacita!'
            );
        END IF;

    END LOOP;
    CLOSE c;

    -- очистить временные данные после проверки
    DELETE FROM SKLAD_CAPACITY_TMP;
END;
/
--------------------------------------------------------------------
-- TEST
--------------------------------------------------------------------
-- PŘÍPRAVA SKLADU
INSERT INTO SKLAD (ID_Sklad, nazev, kapacita, telefonniCislo, ID_Supermarket) VALUES (5001, 'Test Sklad', 100, '123', 1);
-- PRVNÍ VLOŽENÍ – OK
INSERT INTO ZBOZI (ID_Zbozi, nazev, cena, mnozstvi, minMnozstvi, SKLAD_ID_Sklad, id_kategorie) VALUES (6001, 'Cukr', 20, 50, 10, 5001, 1);
-- DRUHÉ VLOŽENÍ – OK
INSERT INTO ZBOZI (ID_Zbozi, nazev, cena, mnozstvi, minMnozstvi, SKLAD_ID_Sklad, id_kategorie) VALUES (6002, 'Mouka', 25, 40, 10, 5001, 1);
-- PŘEKROČENÍ – MUSÍ FAILNOUT
INSERT INTO ZBOZI (ID_Zbozi, nazev, cena, mnozstvi, minMnozstvi, SKLAD_ID_Sklad, id_kategorie) VALUES (6003, 'Ryze', 30, 30, 10, 5001, 1);

DELETE FROM ZBOZI WHERE ID_Zbozi = 6001;
DELETE FROM ZBOZI WHERE ID_Zbozi = 6002;
DELETE FROM ZBOZI WHERE ID_Zbozi = 6003;
DELETE FROM SKLAD WHERE ID_Sklad = 5001;


------------------------------------------------------------
-- TRIGGER: TRG_PLATBA_ARC_CREATE
-- Popis:
--   Automaticky vytváří záznam v tabulce HOTOVOST nebo KARTA
--   podle typu platby uvedeného v tabulce PLATBA.
------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_PLATBA_ARC_CREATE
AFTER INSERT ON PLATBA
FOR EACH ROW
BEGIN
    --------------------------------------------------------------------
    -- Automatické vytvoření záznamu v tabulce HOTOVOST nebo KARTA
    --------------------------------------------------------------------
    IF :NEW.platbaTyp = 'H' THEN
        INSERT INTO HOTOVOST(ID_platba, prijato, vraceno)
        VALUES(:NEW.ID_platba, 0, 0);  -- prijato a vraceno zatím doplní jiný trigger
    ELSIF :NEW.platbaTyp = 'K' THEN
        INSERT INTO KARTA(ID_platba, cisloKarty)
        VALUES(:NEW.ID_platba, '0000-0000-0000-0000'); -- placeholder
    END IF;
END;
/
--------------------------------------------------------------------
-- TEST
--------------------------------------------------------------------
--PŘÍPRAVA
INSERT INTO OBJEDNAVKA (ID_Objednavka, datum, ID_Status, typ_objednavka, ID_Uzivatel, ID_Supermarket) VALUES (20001, SYSDATE, 1, 'ZAKAZNIK', 9001, 1);
INSERT INTO OBJEDNAVKA (ID_Objednavka, datum, ID_Status, typ_objednavka, ID_Uzivatel, ID_Supermarket) VALUES (20002, SYSDATE, 1, 'ZAKAZNIK', 9001, 1);
--HOTOVOST
INSERT INTO PLATBA (ID_platba, castka, datum, ID_Objednavka, platbaTyp) VALUES (30010, 100, SYSDATE, 20001, 'H');
SELECT * FROM HOTOVOST WHERE ID_platba = 30010;
-- KARTA
INSERT INTO PLATBA (ID_platba, castka, datum, ID_Objednavka, platbaTyp) VALUES (30011, 200, SYSDATE, 20002, 'K');
SELECT * FROM KARTA WHERE ID_platba = 30011;

DELETE FROM HOTOVOST WHERE ID_platba = 30010;
DELETE FROM PLATBA WHERE ID_platba = 30010;
DELETE FROM OBJEDNAVKA WHERE ID_Objednavka = 20001;


------------------------------------------------------------
-- PROCEDURA: PROC_CREATE_RESTOCK_ORDER
-- Popis:
--   Pokud zásoba spadne pod minimum, vytvoří “volnou” objednávku
--   pro dodavatele (typ DODAVATEL) s vlastníkem = ADMIN uživatel.
--   Novou objednávku vytváří jen pokud pro dané zboží a supermarket
--   neexistuje otevřená objednávka (status 1–4).
------------------------------------------------------------
------------------------------------------------------------
CREATE OR REPLACE PROCEDURE proc_create_restock_order(
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
/

------------------------------------------------------------
-- TRIGGER: TRG_ZBOZI_RESTOCK
-- Popis:
--   Při poklesu množství pod minimum volá proceduru, která
--   založí volnou objednávku pro dodavatele.
------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_ZBOZI_RESTOCK
AFTER UPDATE ON ZBOZI
FOR EACH ROW
WHEN (NEW.mnozstvi < NEW.minMnozstvi)
BEGIN
    proc_create_restock_order(
        :NEW.ID_Zbozi,
        :NEW.SKLAD_ID_SKLAD,
        NULL,
        :NEW.MINMNOZSTVI,
        :NEW.MNOZSTVI,
        :NEW.CENA
    );
END;
/
DELETE FROM KARTA WHERE ID_platba = 30011;
DELETE FROM PLATBA WHERE ID_platba = 30011;
DELETE FROM OBJEDNAVKA WHERE ID_Objednavka = 20002;




------------------------------------------------------------
-- TRIGGER: TRG_UZIVATEL_DEFAULT_ROLE
-- Popis:
--   Při vkládání nového uživatele automaticky přiřadí
--   výchozí roli (ID = 7), pokud nebyla zadána ručně.
------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_UZIVATEL_DEFAULT_ROLE
BEFORE INSERT ON UZIVATEL
FOR EACH ROW
BEGIN
    --------------------------------------------------------------------
    -- Pokud není role vyplněna, nastavíme roli NEW_USER (ID = 7)
    --------------------------------------------------------------------
    IF :NEW.ID_Role IS NULL THEN
        :NEW.ID_Role := 7;
    END IF;
END;
/
--------------------------------------------------------------------
-- TEST
--------------------------------------------------------------------
INSERT INTO UZIVATEL (ID_Uzivatel, jmeno, prijmeni, email, heslo, telefonniCislo) VALUES (9002, 'Test', 'Role', 'role@test.cz', 'testrole', '999');
SELECT ID_Role FROM UZIVATEL WHERE ID_Uzivatel = 9002;
DELETE FROM UZIVATEL WHERE ID_Uzivatel = 9002;



------------------------------------------------------------
-- TRIGGER: TRG_UZIVATEL_EMAIL_CHECK
-- Popis:
--   Kontroluje formát emailové adresy při vložení nebo úpravě
--   záznamu v tabulce UZIVATEL.
------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_UZIVATEL_EMAIL_CHECK
BEFORE INSERT OR UPDATE ON UZIVATEL
FOR EACH ROW
BEGIN
    --------------------------------------------------------------------
    -- Jednoduchá kontrola formátu emailu
    --------------------------------------------------------------------
    IF NOT REGEXP_LIKE(:NEW.email, '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
        RAISE_APPLICATION_ERROR(
            -20104,
            'Email ma neplatny format.'
        );
    END IF;
END;
/
--------------------------------------------------------------------
-- TEST
--------------------------------------------------------------------
-- OK
INSERT INTO UZIVATEL (ID_Uzivatel, jmeno, prijmeni, email, heslo, telefonniCislo, ID_Role) VALUES (9003, 'Ok', 'Email', 'ok@test.cz','okTest' , '123', 7);
-- CHYBA
INSERT INTO UZIVATEL (ID_Uzivatel, jmeno, prijmeni, email, heslo,  telefonniCislo, ID_Role) VALUES (9004, 'Bad', 'Email', 'wrong-email','wrongTest','123', 7);
DELETE FROM UZIVATEL WHERE ID_Uzivatel = 9003;
DELETE FROM UZIVATEL WHERE ID_Uzivatel = 9004;


------------------------------------------------------------
--------------------------------------------------------------------------------
-- TRIGGER: TRG_SUPERMARKET_ARCHIV_CREATE
-- Popis:
--   Po vložení nového supermarketu automaticky vytvoří strukturu složek
--   v tabulce ARCHIV:
--   <root>
--     └── <název supermarketu>
--           ├── Dokumenty
--           ├── Reporty
--           ├── Inventura
--           └── Log
--                ├── Zbozi
--                ├── Objednavky
--                ├── Platby
--                └── Ostatni
--------------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER TRG_SUPERMARKET_ARCHIV_CREATE
AFTER INSERT ON SUPERMARKET
FOR EACH ROW
DECLARE
    v_root_id NUMBER;
    v_sup_id NUMBER;
    v_log_id NUMBER;
BEGIN
    --------------------------------------------------------------------
    --  Najdeme kořenovou složku archivu
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    --  Vytvoříme složku supermarketu podle názvu
    --------------------------------------------------------------------
    INSERT INTO ARCHIV (ID_Archiv, Nazev, Popis, Parent_id)
    VALUES (
        SEQ_ARCHIV_ID.NEXTVAL,
        :NEW.NAZEV,                         -- Název supermarketu
        'Archiv pro supermarket ' || :NEW.NAZEV,
        v_root_id
    )
    RETURNING ID_Archiv INTO v_sup_id;

    --------------------------------------------------------------------
    --  Vytvoříme základní podsložky
    --------------------------------------------------------------------
    INSERT INTO ARCHIV VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Dokumenty', 'Dokumenty supermarketu', v_sup_id);
    INSERT INTO ARCHIV VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Reporty', 'Reporty a analýzy', v_sup_id);
    INSERT INTO ARCHIV VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Inventura', 'Inventurní data', v_sup_id);

    --------------------------------------------------------------------
    --  Vytvoříme složku Log (a zapamatujeme si její ID)
    --------------------------------------------------------------------
    INSERT INTO ARCHIV (ID_Archiv, Nazev, Popis, Parent_id)
    VALUES (
        SEQ_ARCHIV_ID.NEXTVAL,
        'Log',
        'Logy změn pro supermarket ' || :NEW.NAZEV,
        v_sup_id
    )
    RETURNING ID_Archiv INTO v_log_id;

    --------------------------------------------------------------------
    --  Podsložky Logu
    --------------------------------------------------------------------
    INSERT INTO ARCHIV VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Zbozi', 'Logy změn ZBOZI', v_log_id);
    INSERT INTO ARCHIV VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Objednavky', 'Logy změn OBJEDNAVKA', v_log_id);
    INSERT INTO ARCHIV VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Platby', 'Logy změn PLATBA', v_log_id);
    INSERT INTO ARCHIV VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Ostatni', 'Ostatní logy', v_log_id);

END;
/

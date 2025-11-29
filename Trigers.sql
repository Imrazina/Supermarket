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
            RAISE_APPLICATION_ERROR(
                -20002,
                'Chyba: Pro TYP_OBJEDNAVKA = DODAVATEL musi ID_UZIVATEL existovat v tabulce DODAVATEL.'
            );
        END IF;
    END IF;

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
-- TRIGGER: TRG_ZBOZI_MIN
-- Popis:
--   Automaticky vytváří objednávku na doplnění zboží,
--   pokud množství klesne pod minimální limit.
------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_ZBOZI_MIN
BEFORE UPDATE ON ZBOZI
FOR EACH ROW
DECLARE
    v_dodavatel NUMBER;
    v_supermarket NUMBER;
    v_new_order_id NUMBER;
    v_amount NUMBER;
BEGIN
    --------------------------------------------------------------------
    -- Kontrola minimálního množství
    --------------------------------------------------------------------
    IF :NEW.mnozstvi < :NEW.minMnozstvi THEN
        
        ----------------------------------------------------------------
        -- Najdeme dodavatele pro toto zboží
        ----------------------------------------------------------------
        SELECT ID_uzivatelu
        INTO v_dodavatel
        FROM ZBOZI_DODAVATEL
        WHERE ID_Zbozi = :NEW.ID_Zbozi
        FETCH FIRST 1 ROWS ONLY;
        
        ----------------------------------------------------------------
        -- Najdeme supermarket podle skladu
        ----------------------------------------------------------------
        SELECT ID_Supermarket
        INTO v_supermarket
        FROM SKLAD
        WHERE ID_Sklad = :NEW.SKLAD_ID_Sklad;
        
        ----------------------------------------------------------------
        -- Určíme množství k objednání
        ----------------------------------------------------------------
        v_amount := GREATEST(:NEW.minMnozstvi * 5, :NEW.minMnozstvi + 1);

        
        ----------------------------------------------------------------
        -- Vytvoříme novou objednávku typu DODAVATEL
        ----------------------------------------------------------------
        INSERT INTO OBJEDNAVKA (
            ID_Objednavka,
            datum,
            ID_Status,
            typ_objednavka,
            poznamka,
            ID_Uzivatel,
            ID_Supermarket
        ) VALUES (
            SEQ_OBJEDNAVKA_ID.NEXTVAL,
            SYSDATE,
            1,                     -- Status = Vytvorena
            'DODAVATEL',
            'Automatická objednávka doplnění zásob',
            v_dodavatel,
            v_supermarket
        )
        RETURNING ID_Objednavka INTO v_new_order_id;
        
        ----------------------------------------------------------------
        -- Přidáme položku do objednávky
        ----------------------------------------------------------------
        INSERT INTO OBJEDNAVKA_ZBOZI (
            pocet,
            ID_Objednavka,
            ID_Zbozi
        ) VALUES (
            v_amount,
            v_new_order_id,
            :NEW.ID_Zbozi
        );
        
        ----------------------------------------------------------------
        -- Informace pro administrátora přes LOG nebo zprávu
        ----------------------------------------------------------------
        INSERT INTO LOG (
            ID_Log, tabulkaNazev, operace, datumZmeny, idRekord, popis, ID_Archiv
        ) VALUES (
            SEQ_LOG_ID.NEXTVAL,
            'ZBOZI',
            'I',
            SYSDATE,
            v_new_order_id,
            'Automaticky vytvořena objednávka kvůli nízkému množství zásob.',
            1
        );
        
    END IF;
END;
/
--------------------------------------------------------------------
-- TEST
--------------------------------------------------------------------
-- PŘÍPRAVA ZBOŽÍ + DODAVATEL + SKLAD
INSERT INTO SKLAD (ID_Sklad, nazev, kapacita, telefonniCislo, ID_Supermarket) VALUES (5001, 'Test Sklad', 100, '123', 1);
INSERT INTO ZBOZI (ID_Zbozi, nazev, cena, mnozstvi, minMnozstvi, SKLAD_ID_Sklad, id_kategorie) VALUES (7001, 'Kava', 150, 20, 10, 5001, 1);
INSERT INTO ZBOZI_DODAVATEL (ID_Zbozi, ID_uzivatelu) VALUES (7001, 19);
-- UPDATE → pokles množství
UPDATE ZBOZI SET mnozstvi = 5 WHERE ID_Zbozi = 7001;
-- Ověření: automaticky vytvořená objednávka
SELECT * FROM OBJEDNAVKA WHERE typ_objednavka = 'DODAVATEL' ORDER BY datum DESC;
SELECT * FROM OBJEDNAVKA_ZBOZI WHERE ID_Zbozi = 7001;

DELETE FROM OBJEDNAVKA_ZBOZI WHERE ID_Zbozi = 7001;
DELETE FROM OBJEDNAVKA WHERE ID_Objednavka = 61;
DELETE FROM ZBOZI_DODAVATEL WHERE ID_Zbozi = 7001;
DELETE FROM ZBOZI WHERE ID_Zbozi = 7001;
DELETE FROM SKLAD WHERE ID_Sklad = 5001;


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


--------------------------------------------------------------------------------
-- TRIGGER: TRG_ZBOZI_LOG
-- POPIS:
--   Loguje změny v tabulce ZBOZI (INSERT/UPDATE/DELETE).
--   Zjišťuje supermarket podle skladu.
--   Log ukládá do:
--       <Supermarket> / Log / Zbozi
--------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_ZBOZI_LOG
AFTER INSERT OR UPDATE OR DELETE ON ZBOZI
FOR EACH ROW
DECLARE
    v_supermarket_id  NUMBER;
    v_root_id         NUMBER;
    v_archiv_super    NUMBER;
    v_archiv_log      NUMBER;
    v_archiv_zbozi    NUMBER;

    v_operace         CHAR(1);
    v_nova            VARCHAR2(4000);
    v_stara           VARCHAR2(4000);
    v_id_zbozi        NUMBER;      -- ID záznamu pro log
BEGIN
    --------------------------------------------------------------------
    -- 1) Typ operace
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
    ELSIF UPDATING THEN
        v_operace := 'U';
    ELSE
        v_operace := 'D';
    END IF;

    --------------------------------------------------------------------
    -- 2) Zjištění ID supermarketu podle skladu
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        SELECT ID_Supermarket
        INTO v_supermarket_id
        FROM SKLAD
        WHERE ID_Sklad = :NEW.SKLAD_ID_Sklad;
    ELSE
        SELECT ID_Supermarket
        INTO v_supermarket_id
        FROM SKLAD
        WHERE ID_Sklad = :OLD.SKLAD_ID_Sklad;
    END IF;

    --------------------------------------------------------------------
    -- 3) Najdeme ROOT (Hlavní Archiv) dynamicky
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 4) Najdeme složku supermarketu podle názvu
    --------------------------------------------------------------------
    SELECT a.ID_Archiv
    INTO v_archiv_super
    FROM ARCHIV a
    JOIN SUPERMARKET s ON s.NAZEV = a.NAZEV
    WHERE s.ID_Supermarket = v_supermarket_id
      AND a.Parent_id = v_root_id;

    --------------------------------------------------------------------
    -- 5) Najdeme složku Log
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_log
    FROM ARCHIV
    WHERE Parent_id = v_archiv_super
      AND Nazev = 'Log';

    --------------------------------------------------------------------
    -- 6) Najdeme podsložku Zbozi
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_zbozi
    FROM ARCHIV
    WHERE Parent_id = v_archiv_log
      AND Nazev = 'Zbozi';

    --------------------------------------------------------------------
    -- 7) NOVÁ data
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'nazev='      || :NEW.nazev ||
            '; cena='       || TO_CHAR(:NEW.cena) ||
            '; mnozstvi='   || TO_CHAR(:NEW.mnozstvi) ||
            '; minMnozstvi='|| TO_CHAR(:NEW.minMnozstvi) ||
            '; sklad='      || TO_CHAR(:NEW.SKLAD_ID_Sklad);
    END IF;

    --------------------------------------------------------------------
    -- 8) STARÁ data
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'nazev='      || :OLD.nazev ||
            '; cena='       || TO_CHAR(:OLD.cena) ||
            '; mnozstvi='   || TO_CHAR(:OLD.mnozstvi) ||
            '; minMnozstvi='|| TO_CHAR(:OLD.minMnozstvi) ||
            '; sklad='      || TO_CHAR(:OLD.SKLAD_ID_Sklad);
    END IF;

    --------------------------------------------------------------------
    -- 9) ID záznamu pro log (NELZE používat INSERTING v CASE uvnitř SQL)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_id_zbozi := :NEW.ID_Zbozi;
    ELSE
        v_id_zbozi := :OLD.ID_Zbozi;
    END IF;

    --------------------------------------------------------------------
    -- 10) Zápis logu
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log,
        tabulkaNazev,
        operace,
        datumZmeny,
        idRekord,
        novaData,
        staraData,
        popis,
        ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'ZBOZI',
        v_operace,
        SYSDATE,
        v_id_zbozi,
        v_nova,
        v_stara,
        'Log zmeny ZBOZI',
        v_archiv_zbozi
    );
END;
/
--------------------------------------------------------------------------------
-- TEST
--------------------------------------------------------------------------------
INSERT INTO ZBOZI (ID_Zbozi, nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, id_kategorie)VALUES (999, 'Test Produkt', 10, 5, 1, null, 6, 1);
UPDATE ZBOZI SET cena = 15 WHERE ID_Zbozi = 999;
DELETE FROM ZBOZI WHERE ID_Zbozi = 999;

SELECT *
FROM LOG
WHERE idRekord = 999
ORDER BY datumZmeny DESC;




--------------------------------------------------------------------------------
-- TRIGGER: TRG_OBJEDNAVKA_LOG
-- POPIS:
--   Loguje změny v tabulce OBJEDNAVKA (INSERT / UPDATE / DELETE).
--   Automaticky vyhledá archivní složku:
--       <Supermarket> / Log / Objednavka
--   a uloží do ní záznam o změně.
--------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_OBJEDNAVKA_LOG
AFTER INSERT OR UPDATE OR DELETE ON OBJEDNAVKA
FOR EACH ROW
DECLARE
    v_supermarket_id  NUMBER;
    v_root_id         NUMBER;
    v_archiv_super    NUMBER;
    v_archiv_log      NUMBER;
    v_archiv_obj      NUMBER;

    v_operace         CHAR(1);
    v_nova            VARCHAR2(4000);
    v_stara           VARCHAR2(4000);
    v_id              NUMBER;
BEGIN
    --------------------------------------------------------------------
    -- 1) Určení typu operace a ID záznamu
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
        v_id := :NEW.ID_Objednavka;
    ELSIF UPDATING THEN
        v_operace := 'U';
        v_id := :NEW.ID_Objednavka;
    ELSE
        v_operace := 'D';
        v_id := :OLD.ID_Objednavka;
    END IF;

    --------------------------------------------------------------------
    -- 2) Získání ID supermarketu
    --    (Objednavka vždy patří konkrétnímu supermarketu)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_supermarket_id := :NEW.ID_Supermarket;
    ELSE
        v_supermarket_id := :OLD.ID_Supermarket;
    END IF;

    --------------------------------------------------------------------
    -- 3) Najdeme ROOT archiv (hlavní kořen)
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 4) Najdeme složku supermarketu podle názvu
    --------------------------------------------------------------------
    SELECT a.ID_Archiv
    INTO v_archiv_super
    FROM ARCHIV a
    JOIN SUPERMARKET s ON s.NAZEV = a.NAZEV
    WHERE s.ID_Supermarket = v_supermarket_id
      AND a.Parent_id = v_root_id;

    --------------------------------------------------------------------
    -- 5) Najdeme složku "Log"
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_log
    FROM ARCHIV
    WHERE Parent_id = v_archiv_super
      AND Nazev = 'Log';

    --------------------------------------------------------------------
    -- 6) Najdeme podsložku "Objednavky"
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_obj
    FROM ARCHIV
    WHERE Parent_id = v_archiv_log
      AND Nazev = 'Objednavky';

    --------------------------------------------------------------------
    -- 7) NOVÁ data
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'datum='      || TO_CHAR(:NEW.datum, 'YYYY-MM-DD HH24:MI:SS')
            || '; status='  || :NEW.ID_Status
            || '; typ='     || :NEW.typ_objednavka
            || '; uzivatel='|| :NEW.ID_Uzivatel
            || '; supermarket=' || :NEW.ID_Supermarket;
    END IF;

    --------------------------------------------------------------------
    -- 8) STARÁ data
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'datum='      || TO_CHAR(:OLD.datum, 'YYYY-MM-DD HH24:MI:SS')
            || '; status='  || :OLD.ID_Status
            || '; typ='     || :OLD.typ_objednavka
            || '; uzivatel='|| :OLD.ID_Uzivatel
            || '; supermarket=' || :OLD.ID_Supermarket;
    END IF;

    --------------------------------------------------------------------
    -- 9) Zápis do LOG tabulky
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log,
        tabulkaNazev,
        operace,
        datumZmeny,
        idRekord,
        novaData,
        staraData,
        popis,
        ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'OBJEDNAVKA',
        v_operace,
        SYSDATE,
        v_id,
        v_nova,
        v_stara,
        'Log změny objednávky',
        v_archiv_obj
    );
END;
/
--------------------------------------------------------------------------------
-- TEST
--------------------------------------------------------------------------------
INSERT INTO OBJEDNAVKA (ID_Objednavka, datum, ID_Status, typ_objednavka, poznamka, ID_Uzivatel, ID_Supermarket) VALUES (1001, TO_DATE('2025-11-29 14:00', 'YYYY-MM-DD HH24:MI'), 1,'ZAKAZNIK', null, 22,1);
UPDATE OBJEDNAVKA SET ID_Status = 2 WHERE ID_Objednavka = 1001;
DELETE FROM OBJEDNAVKA WHERE ID_Objednavka = 1001;

SELECT *
FROM LOG
WHERE idRekord = 1001
ORDER BY datumZmeny DESC;






--------------------------------------------------------------------------------
-- TRIGGER: TRG_PLATBA_LOG
-- POPIS:
--   Loguje změny v tabulce PLATBA (INSERT / UPDATE / DELETE).
--   Automaticky vyhledá archivní složku:
--       <Supermarket> / Log / Platby
--   a uloží logovací záznam.
--------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_PLATBA_LOG
AFTER INSERT OR UPDATE OR DELETE ON PLATBA
FOR EACH ROW
DECLARE
    v_supermarket_id  NUMBER;
    v_root_id         NUMBER;
    v_archiv_super    NUMBER;
    v_archiv_log      NUMBER;
    v_archiv_platby   NUMBER;

    v_operace         CHAR(1);
    v_nova            VARCHAR2(4000);
    v_stara           VARCHAR2(4000);
    v_id              NUMBER;
BEGIN
    --------------------------------------------------------------------
    -- 1) Určení operace a ID záznamu
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
        v_id := :NEW.ID_platba;
    ELSIF UPDATING THEN
        v_operace := 'U';
        v_id := :NEW.ID_platba;
    ELSE
        v_operace := 'D';
        v_id := :OLD.ID_platba;
    END IF;

    --------------------------------------------------------------------
    -- 2) Zjištění supermarketu podle objednávky
    --    Platba patří objednávce → objednávka patří supermarketu
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        SELECT ID_Supermarket
        INTO v_supermarket_id
        FROM OBJEDNAVKA
        WHERE ID_Objednavka = :NEW.ID_Objednavka;
    ELSE
        SELECT ID_Supermarket
        INTO v_supermarket_id
        FROM OBJEDNAVKA
        WHERE ID_Objednavka = :OLD.ID_Objednavka;
    END IF;

    --------------------------------------------------------------------
    -- 3) ROOT archiv (hlavní kořen)
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 4) Složka supermarketu
    --------------------------------------------------------------------
    SELECT a.ID_Archiv
    INTO v_archiv_super
    FROM ARCHIV a
    JOIN SUPERMARKET s ON s.NAZEV = a.NAZEV
    WHERE s.ID_Supermarket = v_supermarket_id
      AND a.Parent_id = v_root_id;

    --------------------------------------------------------------------
    -- 5) Složka "Log"
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_log
    FROM ARCHIV
    WHERE Parent_id = v_archiv_super
      AND Nazev = 'Log';

    --------------------------------------------------------------------
    -- 6) Podsložka "Platby"
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_platby
    FROM ARCHIV
    WHERE Parent_id = v_archiv_log
      AND Nazev = 'Platby';

    --------------------------------------------------------------------
    -- 7) NOVÁ data
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'castka='   || TO_CHAR(:NEW.castka)
            || '; datum=' || TO_CHAR(:NEW.datum, 'YYYY-MM-DD HH24:MI:SS')
            || '; objednavka=' || :NEW.ID_Objednavka
            || '; typ='   || :NEW.platbaTyp;
    END IF;

    --------------------------------------------------------------------
    -- 8) STARÁ data
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'castka='   || TO_CHAR(:OLD.castka)
            || '; datum=' || TO_CHAR(:OLD.datum, 'YYYY-MM-DD HH24:MI:SS')
            || '; objednavka=' || :OLD.ID_Objednavka
            || '; typ='   || :OLD.platbaTyp;
    END IF;

    --------------------------------------------------------------------
    -- 9) Uložení logu do tabulky LOG
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log,
        tabulkaNazev,
        operace,
        datumZmeny,
        idRekord,
        novaData,
        staraData,
        popis,
        ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'PLATBA',
        v_operace,
        SYSDATE,
        v_id,
        v_nova,
        v_stara,
        'Log změny platby',
        v_archiv_platby
    );
END;
/
--------------------------------------------------------------------------------
-- TEST
--------------------------------------------------------------------------------
INSERT INTO OBJEDNAVKA (ID_Objednavka, datum, ID_Status, typ_objednavka, poznamka, ID_Uzivatel, ID_Supermarket) 
VALUES (2001, TO_DATE('2025-11-29 15:00', 'YYYY-MM-DD HH24:MI'), 1, 'ZAKAZNIK', NULL, 22, 1);

INSERT INTO PLATBA (ID_platba, castka, datum, ID_Objednavka, platbaTyp) 
VALUES (3001, 150.50, TO_DATE('2025-11-29 15:05', 'YYYY-MM-DD HH24:MI'),2001,'K');

UPDATE PLATBA SET castka = 200.00, platbaTyp = 'K' WHERE ID_platba = 3001; 
DELETE FROM KARTA WHERE ID_platba = 3001;
DELETE FROM PLATBA WHERE ID_platba = 3001;

SELECT *
FROM LOG
WHERE idRekord = 3001
ORDER BY datumZmeny DESC;

   
   
   
--------------------------------------------------------------------------------
-- TRIGGER: TRG_UZIVATEL_LOG
-- POPIS:
--   Loguje změny v tabulce UZIVATEL (INSERT / UPDATE / DELETE).
--   Archivní struktura:
--       <ROOT> / Uzivatele
--   Uživatel je globální entita → není přiřazen k supermarketu.
--------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_UZIVATEL_LOG
AFTER INSERT OR UPDATE OR DELETE ON UZIVATEL
FOR EACH ROW
DECLARE
    v_root_id      NUMBER;
    v_archiv_user  NUMBER;

    v_operace      CHAR(1);
    v_nova         VARCHAR2(4000);
    v_stara        VARCHAR2(4000);
    v_id           NUMBER;
BEGIN
    --------------------------------------------------------------------
    -- 1) Určení operace a ID záznamu
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
        v_id := :NEW.ID_Uzivatel;
    ELSIF UPDATING THEN
        v_operace := 'U';
        v_id := :NEW.ID_Uzivatel;
    ELSE
        v_operace := 'D';
        v_id := :OLD.ID_Uzivatel;
    END IF;

    --------------------------------------------------------------------
    -- 2) Najdeme ROOT archiv
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 3) Najdeme podsložku 'Uzivatele'
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_user
    FROM ARCHIV
    WHERE Parent_id = v_root_id
      AND Nazev = 'Uzivatele';

    --------------------------------------------------------------------
    -- 4) Nová data
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'jmeno='       || :NEW.jmeno
            || '; prijmeni=' || :NEW.prijmeni
            || '; email='    || :NEW.email
            || '; telefon='  || :NEW.telefonniCislo
            || '; role='     || :NEW.ID_Role;
    END IF;

    --------------------------------------------------------------------
    -- 5) Stará data
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'jmeno='       || :OLD.jmeno
            || '; prijmeni=' || :OLD.prijmeni
            || '; email='    || :OLD.email
            || '; telefon='  || :OLD.telefonniCislo
            || '; role='     || :OLD.ID_Role;
    END IF;

    --------------------------------------------------------------------
    -- 6) Zápis logu do tabulky LOG
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log,
        tabulkaNazev,
        operace,
        datumZmeny,
        idRekord,
        novaData,
        staraData,
        popis,
        ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'UZIVATEL',
        v_operace,
        SYSDATE,
        v_id,
        v_nova,
        v_stara,
        'Log změny uživatele',
        v_archiv_user
    );
END;
/
--------------------------------------------------------------------------------
-- TEST
--------------------------------------------------------------------------------
INSERT INTO UZIVATEL (ID_Uzivatel, jmeno, prijmeni, email, heslo, telefonniCislo, ID_Role) VALUES (5001, 'Anna', 'Shabossova', 'anna@test.cz', 'annaTest', '777123456', 7);
UPDATE UZIVATEL SET email = 'anna.updated@test.cz', ID_Role = 2 WHERE ID_Uzivatel = 5001;
DELETE FROM UZIVATEL WHERE ID_Uzivatel = 5001;

SELECT * 
FROM LOG 
WHERE idRekord = 5001 
ORDER BY datumZmeny DESC;



--------------------------------------------------------------------------------
-- TRIGGER: TRG_SKLAD_LOG
-- POPIS:
--   Loguje změny v tabulce SKLAD (INSERT / UPDATE / DELETE).
--   Archivní struktura:
--       <ROOT> / <Supermarket> / Log / Ostatni
--------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_SKLAD_LOG
AFTER INSERT OR UPDATE OR DELETE ON SKLAD
FOR EACH ROW
DECLARE
    v_supermarket_id  NUMBER;
    v_root_id         NUMBER;
    v_archiv_super    NUMBER;
    v_archiv_log      NUMBER;
    v_archiv_ostatni  NUMBER;

    v_operace         CHAR(1);
    v_nova            VARCHAR2(4000);
    v_stara           VARCHAR2(4000);
    v_id              NUMBER;
BEGIN
    --------------------------------------------------------------------
    -- 1) Určení typu operace a ID záznamu
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
        v_id := :NEW.ID_Sklad;

    ELSIF UPDATING THEN
        v_operace := 'U';
        v_id := :NEW.ID_Sklad;

    ELSE
        v_operace := 'D';
        v_id := :OLD.ID_Sklad;
    END IF;

    --------------------------------------------------------------------
    -- 2) Zjištění ID supermarketu
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_supermarket_id := :NEW.ID_Supermarket;
    ELSE
        v_supermarket_id := :OLD.ID_Supermarket;
    END IF;

    --------------------------------------------------------------------
    -- 3) Najdeme ROOT archiv
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 4) Najdeme složku supermarketu
    --------------------------------------------------------------------
    SELECT a.ID_Archiv
    INTO v_archiv_super
    FROM ARCHIV a
    JOIN SUPERMARKET s ON s.NAZEV = a.NAZEV
    WHERE s.ID_Supermarket = v_supermarket_id
      AND a.Parent_id = v_root_id;

    --------------------------------------------------------------------
    -- 5) Najdeme složku "Log"
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_log
    FROM ARCHIV
    WHERE Parent_id = v_archiv_super
      AND Nazev = 'Log';

    --------------------------------------------------------------------
    -- 6) Najdeme podsložku "Ostatni"
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_ostatni
    FROM ARCHIV
    WHERE Parent_id = v_archiv_log
      AND Nazev = 'Ostatni';

    --------------------------------------------------------------------
    -- 7) NOVÁ data
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'nazev='       || :NEW.nazev
            || '; kapacita=' || :NEW.kapacita
            || '; telefon='  || :NEW.telefonniCislo
            || '; supermarket=' || :NEW.ID_Supermarket;
    END IF;

    --------------------------------------------------------------------
    -- 8) STARÁ data
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'nazev='       || :OLD.nazev
            || '; kapacita=' || :OLD.kapacita
            || '; telefon='  || :OLD.telefonniCislo
            || '; supermarket=' || :OLD.ID_Supermarket;
    END IF;

    --------------------------------------------------------------------
    -- 9) Zápis logu
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log,
        tabulkaNazev,
        operace,
        datumZmeny,
        idRekord,
        novaData,
        staraData,
        popis,
        ID_Archiv
    )
    VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'SKLAD',
        v_operace,
        SYSDATE,
        v_id,
        v_nova,
        v_stara,
        'Log změny skladu',
        v_archiv_ostatni
    );
END;
/
--------------------------------------------------------------------------------
-- TEST
--------------------------------------------------------------------------------
INSERT INTO SKLAD (ID_Sklad, nazev, kapacita, telefonniCislo, ID_Supermarket) VALUES (9001,'Test Sklad', 500, '777999111', 1);
UPDATE SKLAD SET kapacita = 600, telefonniCislo = '777999222' WHERE ID_Sklad = 9001;
DELETE FROM SKLAD WHERE ID_Sklad = 9001;

SELECT *
FROM LOG
WHERE idRekord = 9001
ORDER BY datumZmeny DESC;


--------------------------------------------------------------------------------
-- TRIGGER: TRG_ZAKAZNIK_LOG
-- POPIS:
--   Loguje změny v podtypu ZAKAZNIK.
--   Uživatel je supertype, proto se změny ukládají do:
--       ROOT / Uzivatele
--------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_ZAKAZNIK_LOG
AFTER INSERT OR UPDATE OR DELETE ON ZAKAZNIK
FOR EACH ROW
DECLARE
    v_root_id     NUMBER;
    v_archiv_uz   NUMBER;

    v_operace     CHAR(1);
    v_nova        VARCHAR2(4000);
    v_stara       VARCHAR2(4000);
    v_id          NUMBER;
BEGIN
    --------------------------------------------------------------------
    -- 1) Operace + ID uživatele (supertype klíč)
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
        v_id := :NEW.ID_Uzivatelu;

    ELSIF UPDATING THEN
        v_operace := 'U';
        v_id := :NEW.ID_Uzivatelu;

    ELSE
        v_operace := 'D';
        v_id := :OLD.ID_Uzivatelu;
    END IF;

    --------------------------------------------------------------------
    -- 2) ROOT archiv
    --------------------------------------------------------------------
    SELECT ID_Archiv INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 3) podsložka Uzivatele
    --------------------------------------------------------------------
    SELECT ID_Archiv INTO v_archiv_uz
    FROM ARCHIV
    WHERE Parent_id = v_root_id
      AND Nazev = 'Uzivatele';

    --------------------------------------------------------------------
    -- 4) Nová data
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
            'kartaVernosti=' || :NEW.kartaVernosti;
    END IF;

    --------------------------------------------------------------------
    -- 5) Stará data
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
            'kartaVernosti=' || :OLD.kartaVernosti;
    END IF;

    --------------------------------------------------------------------
    -- 6) Zápis do LOG
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log, tabulkaNazev, operace, datumZmeny,
        idRekord, novaData, staraData, popis, ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'ZAKAZNIK',
        v_operace,
        SYSDATE,
        v_id,
        v_nova,
        v_stara,
        'Log změny zákazníka',
        v_archiv_uz
    );
END;
/
--------------------------------------------------------------------------------
-- TEST
--------------------------------------------------------------------------------
INSERT INTO UZIVATEL (ID_Uzivatel, jmeno, prijmeni, email, heslo, telefonniCislo, ID_Role) VALUES (9001, 'Anna', 'Shabossova', 'anna@test.cz', 'annaTest', '777123456', 3);
INSERT INTO ZAKAZNIK (ID_Uzivatelu, kartaVernosti) VALUES (9001, 'CARD-001');
UPDATE ZAKAZNIK SET kartaVernosti = 'CARD-002' WHERE ID_Uzivatelu = 9001;
DELETE FROM ZAKAZNIK WHERE ID_Uzivatelu = 9001;
DELETE FROM UZIVATEL WHERE ID_Uzivatel = 9001;

SELECT *
FROM LOG
WHERE idRekord = 9001
ORDER BY datumZmeny DESC;


--------------------------------------------------------------------------------
-- TRIGGER: TRG_ZAMESTNANEC_LOG
-- POPIS:
--   Loguje změny v podtypu ZAMESTNANEC.
--   Archivní cesta:
--       ROOT / Uzivatele
--------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_ZAMESTNANEC_LOG
AFTER INSERT OR UPDATE OR DELETE ON ZAMESTNANEC
FOR EACH ROW
DECLARE
    v_root_id    NUMBER;
    v_archiv_uz  NUMBER;

    v_operace    CHAR(1);
    v_nova       VARCHAR2(4000);
    v_stara      VARCHAR2(4000);
    v_id         NUMBER;
BEGIN
    --------------------------------------------------------------------
    -- 1) Operace + FK na UZIVATEL
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
        v_id := :NEW.ID_Uzivatelu;

    ELSIF UPDATING THEN
        v_operace := 'U';
        v_id := :NEW.ID_Uzivatelu;

    ELSE
        v_operace := 'D';
        v_id := :OLD.ID_Uzivatelu;
    END IF;

    --------------------------------------------------------------------
    -- 2) ROOT archiv
    --------------------------------------------------------------------
    SELECT ID_Archiv INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 3) podsložka Uzivatele
    --------------------------------------------------------------------
    SELECT ID_Archiv INTO v_archiv_uz
    FROM ARCHIV
    WHERE Parent_id = v_root_id
      AND Nazev = 'Uzivatele';

    --------------------------------------------------------------------
    -- 4) Nová data
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'pozice=' || :NEW.pozice
           || '; mzda=' || :NEW.mzda;
    END IF;

    --------------------------------------------------------------------
    -- 5) Stará data
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'pozice=' || :OLD.pozice
           || '; mzda=' || :OLD.mzda;
    END IF;

    --------------------------------------------------------------------
    -- 6) Zápis do LOG
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log, tabulkaNazev, operace, datumZmeny,
        idRekord, novaData, staraData, popis, ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'ZAMESTNANEC',
        v_operace,
        SYSDATE,
        v_id,
        v_nova,
        v_stara,
        'Log změny zaměstnance',
        v_archiv_uz
    );
END;
/
--------------------------------------------------------------------------------
-- TEST
--------------------------------------------------------------------------------
INSERT INTO UZIVATEL (ID_Uzivatel, jmeno, prijmeni, email, heslo, telefonniCislo, ID_Role) VALUES (9002, 'Anna', 'Shabossova', 'anna@test.cz', 'annaTest', '777123456', 5);
INSERT INTO ZAMESTNANEC (ID_Uzivatelu, mzda, datumnastupa, pozice) VALUES (9002, 32000, DATE '2025-10-30', 'Pokladní');
UPDATE ZAMESTNANEC SET mzda = 36000 WHERE ID_Uzivatelu = 9002;
DELETE FROM ZAMESTNANEC WHERE ID_Uzivatelu = 9002;
DELETE FROM UZIVATEL WHERE ID_Uzivatel = 9002;

SELECT *
FROM LOG
WHERE idRekord = 9002
ORDER BY datumZmeny DESC;


--------------------------------------------------------------------------------
-- TRIGGER: TRG_DODAVATEL_LOG
-- POPIS:
--   Loguje změny v podtypu DODAVATEL.
--   Archivní umístění:
--       ROOT / Uzivatele
--------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_DODAVATEL_LOG
AFTER INSERT OR UPDATE OR DELETE ON DODAVATEL
FOR EACH ROW
DECLARE
    v_root_id    NUMBER;
    v_archiv_uz  NUMBER;

    v_operace    CHAR(1);
    v_nova       VARCHAR2(4000);
    v_stara      VARCHAR2(4000);
    v_id         NUMBER;
BEGIN
    --------------------------------------------------------------------
    -- 1) Operace + ID UZIVATEL
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
        v_id := :NEW.ID_Uzivatelu;

    ELSIF UPDATING THEN
        v_operace := 'U';
        v_id := :NEW.ID_Uzivatelu;

    ELSE
        v_operace := 'D';
        v_id := :OLD.ID_Uzivatelu;
    END IF;

    --------------------------------------------------------------------
    -- 2) ROOT archiv
    --------------------------------------------------------------------
    SELECT ID_Archiv INTO v_root_id
    FROM ARCHIV WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 3) podsložka Uzivatele
    --------------------------------------------------------------------
    SELECT ID_Archiv INTO v_archiv_uz
    FROM ARCHIV
    WHERE Parent_id = v_root_id
      AND Nazev = 'Uzivatele';

    --------------------------------------------------------------------
    -- 4) Nová data
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'firma=' || :NEW.firma;
    END IF;

    --------------------------------------------------------------------
    -- 5) Stará data
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'firma=' || :OLD.firma;
    END IF;

    --------------------------------------------------------------------
    -- 6) zápis logu
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log, tabulkaNazev, operace, datumZmeny,
        idRekord, novaData, staraData, popis, ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'DODAVATEL',
        v_operace,
        SYSDATE,
        v_id,
        v_nova,
        v_stara,
        'Log změny dodavatele',
        v_archiv_uz
    );
END;
/
--------------------------------------------------------------------------------
-- TEST
--------------------------------------------------------------------------------
INSERT INTO UZIVATEL (ID_Uzivatel, jmeno, prijmeni, email, heslo, telefonniCislo, ID_Role) VALUES (9003, 'Anna', 'Shabossova', 'anna@test.cz', 'annaTest', '777123456', 2);
INSERT INTO DODAVATEL (ID_Uzivatelu, firma) VALUES (9003, 'FreshFoodz s.r.o.');
UPDATE DODAVATEL SET firma = 'FreshFoods GROUP' WHERE ID_Uzivatelu = 9003;
DELETE FROM DODAVATEL WHERE ID_Uzivatelu = 9003;
DELETE FROM UZIVATEL WHERE ID_Uzivatel = 9003;

SELECT *
FROM LOG
WHERE idRekord = 9003
ORDER BY datumZmeny DESC;
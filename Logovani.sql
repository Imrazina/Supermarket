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
    v_supermarket_id   NUMBER;
    v_root_id          NUMBER;
    v_archiv_super     NUMBER;
    v_archiv_log       NUMBER;
    v_archiv_zbozi     NUMBER;

    v_operace          CHAR(1);
    v_nova             VARCHAR2(4000);
    v_stara            VARCHAR2(4000);

    v_sklad_nazev_new  VARCHAR2(200);
    v_sklad_nazev_old  VARCHAR2(200);
    v_super_nazev      VARCHAR2(200);

    v_id_rekord        VARCHAR2(4000);  -- tady bude název zboží
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
    -- 2) Zjištění ID supermarketu + názvu skladu
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        SELECT ID_Supermarket, Nazev
        INTO v_supermarket_id, v_sklad_nazev_new
        FROM SKLAD
        WHERE ID_Sklad = :NEW.SKLAD_ID_Sklad;
    ELSE
        SELECT ID_Supermarket, Nazev
        INTO v_supermarket_id, v_sklad_nazev_old
        FROM SKLAD
        WHERE ID_Sklad = :OLD.SKLAD_ID_Sklad;
    END IF;

    --------------------------------------------------------------------
    -- 3) Název supermarketu
    --------------------------------------------------------------------
    SELECT Nazev
    INTO v_super_nazev
    FROM SUPERMARKET
    WHERE ID_Supermarket = v_supermarket_id;

    --------------------------------------------------------------------
    -- 4) Najdeme ROOT (Hlavní Archiv) dynamicky
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 5) Najdeme složku supermarketu podle názvu
    --------------------------------------------------------------------
    SELECT a.ID_Archiv
    INTO v_archiv_super
    FROM ARCHIV a
    JOIN SUPERMARKET s ON s.NAZEV = a.NAZEV
    WHERE s.ID_Supermarket = v_supermarket_id
      AND a.Parent_id = v_root_id;

    --------------------------------------------------------------------
    -- 6) Najdeme složku Log
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_log
    FROM ARCHIV
    WHERE Parent_id = v_archiv_super
      AND Nazev = 'Log';

    --------------------------------------------------------------------
    -- 7) Najdeme podsložku Zbozi
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_zbozi
    FROM ARCHIV
    WHERE Parent_id = v_archiv_log
      AND Nazev = 'Zbozi';

    --------------------------------------------------------------------
    -- 8) NOVÁ data (čitelné, bez ID)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'nazev='       || :NEW.nazev
            || '; cena='        || TO_CHAR(:NEW.cena)
            || '; mnozstvi='    || TO_CHAR(:NEW.mnozstvi)
            || '; minMnozstvi=' || TO_CHAR(:NEW.minMnozstvi)
            || '; sklad='       || v_sklad_nazev_new
            || '; supermarket=' || v_super_nazev;
    END IF;

    --------------------------------------------------------------------
    -- 9) STARÁ data (čitelné, bez ID)
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'nazev='       || :OLD.nazev
            || '; cena='        || TO_CHAR(:OLD.cena)
            || '; mnozstvi='    || TO_CHAR(:OLD.mnozstvi)
            || '; minMnozstvi=' || TO_CHAR(:OLD.minMnozstvi)
            || '; sklad='       || v_sklad_nazev_old
            || '; supermarket=' || v_super_nazev;
    END IF;

    --------------------------------------------------------------------
    -- 10) idRekord = název zboží (žádné ID)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_id_rekord := :NEW.nazev;
    ELSE
        v_id_rekord := :OLD.nazev;
    END IF;

    --------------------------------------------------------------------
    -- 11) Zápis logu
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
        v_id_rekord,   -- název zboží
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
    v_supermarket_id   NUMBER;
    v_root_id          NUMBER;
    v_archiv_super     NUMBER;
    v_archiv_log       NUMBER;
    v_archiv_obj       NUMBER;

    v_operace          CHAR(1);
    v_nova             VARCHAR2(4000);
    v_stara            VARCHAR2(4000);

    v_id_rekord        VARCHAR2(4000);   -- půjde do LOG.idRekord (VARCHAR2)
    v_super_nazev      VARCHAR2(200);
    v_status_nazev     VARCHAR2(200);
    v_uzivatel_jmeno   VARCHAR2(200);
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
    -- 2) Získání ID supermarketu (z NEW/OLD)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_supermarket_id := :NEW.ID_Supermarket;
    ELSE
        v_supermarket_id := :OLD.ID_Supermarket;
    END IF;

    --------------------------------------------------------------------
    -- 3) Název supermarketu
    --------------------------------------------------------------------
    SELECT Nazev
    INTO v_super_nazev
    FROM SUPERMARKET
    WHERE ID_Supermarket = v_supermarket_id;

    --------------------------------------------------------------------
    -- 4) Název statusu a uživatele (ČITELNÉ, ne ID)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        -- status objednávky
        SELECT Nazev
        INTO v_status_nazev
        FROM STATUS   -- TODO: tvoje tabulka pro status
        WHERE ID_Status = :NEW.ID_Status;

        -- uživatel (např. jméno + příjmení nebo login)
        SELECT jmeno || ' ' || prijmeni
        INTO v_uzivatel_jmeno
        FROM UZIVATEL           -- TODO: tvoje tabulka uživatelů
        WHERE ID_Uzivatel = :NEW.ID_Uzivatel;
    ELSE
        SELECT Nazev
        INTO v_status_nazev
        FROM STATUS
        WHERE ID_Status = :OLD.ID_Status;

        SELECT jmeno || ' ' || prijmeni
        INTO v_uzivatel_jmeno
        FROM UZIVATEL
        WHERE ID_Uzivatel = :OLD.ID_Uzivatel;
    END IF;

    --------------------------------------------------------------------
    -- 5) Najdeme ROOT archiv (hlavní kořen)
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 6) Archiv supermarketu podle názvu
    --------------------------------------------------------------------
    SELECT a.ID_Archiv
    INTO v_archiv_super
    FROM ARCHIV a
    JOIN SUPERMARKET s ON s.NAZEV = a.NAZEV
    WHERE s.ID_Supermarket = v_supermarket_id
      AND a.Parent_id = v_root_id;

    --------------------------------------------------------------------
    -- 7) Složka "Log"
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_log
    FROM ARCHIV
    WHERE Parent_id = v_archiv_super
      AND Nazev = 'Log';

    --------------------------------------------------------------------
    -- 8) Podsložka "Objednavky"
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_obj
    FROM ARCHIV
    WHERE Parent_id = v_archiv_log
      AND Nazev = 'Objednavky';

    --------------------------------------------------------------------
    -- 9) NOVÁ data – jen čitelné hodnoty, žádná ID
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'datum='       || TO_CHAR(:NEW.datum, 'YYYY-MM-DD HH24:MI:SS')
            || '; status='   || v_status_nazev
            || '; typ='      || :NEW.typ_objednavka
            || '; uzivatel=' || v_uzivatel_jmeno
            || '; supermarket=' || v_super_nazev;
    END IF;

    --------------------------------------------------------------------
    -- 10) STARÁ data – taky bez ID
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'datum='       || TO_CHAR(:OLD.datum, 'YYYY-MM-DD HH24:MI:SS')
            || '; status='   || v_status_nazev
            || '; typ='      || :OLD.typ_objednavka
            || '; uzivatel=' || v_uzivatel_jmeno
            || '; supermarket=' || v_super_nazev;
    END IF;

    --------------------------------------------------------------------
    -- 11) idRekord – jméno uživatele (žádné ID)
    --------------------------------------------------------------------
    v_id_rekord := v_uzivatel_jmeno;

    --------------------------------------------------------------------
    -- 12) Zápis do LOG tabulky
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
        v_id_rekord,             -- jméno uživatele místo ID
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
    v_supermarket_id   NUMBER;
    v_root_id          NUMBER;
    v_archiv_super     NUMBER;
    v_archiv_log       NUMBER;
    v_archiv_platby    NUMBER;

    v_operace          CHAR(1);
    v_nova             VARCHAR2(4000);
    v_stara            VARCHAR2(4000);

    v_id_rekord        VARCHAR2(4000);   
    v_super_nazev      VARCHAR2(200);
    v_obj_datum        DATE;
    v_obj_typ          VARCHAR2(100);
    v_uzivatel_jmeno   VARCHAR2(200);
BEGIN
    --------------------------------------------------------------------
    -- 1) Určení operace
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
    ELSIF UPDATING THEN
        v_operace := 'U';
    ELSE
        v_operace := 'D';
    END IF;

    --------------------------------------------------------------------
    -- 2) Zjištění supermarketu + info o objednávce + uživatel
    --    (vezmeme info z OBJEDNAVKA, ale NEpoužijeme její ID do logu)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        SELECT o.ID_Supermarket,
               o.datum,
               o.typ_objednavka,
               u.jmeno || ' ' || u.prijmeni
        INTO  v_supermarket_id,
              v_obj_datum,
              v_obj_typ,
              v_uzivatel_jmeno
        FROM OBJEDNAVKA o
        JOIN UZIVATEL u ON u.ID_Uzivatel = o.ID_Uzivatel
        WHERE o.ID_Objednavka = :NEW.ID_Objednavka;
    ELSE
        SELECT o.ID_Supermarket,
               o.datum,
               o.typ_objednavka,
               u.jmeno || ' ' || u.prijmeni
        INTO  v_supermarket_id,
              v_obj_datum,
              v_obj_typ,
              v_uzivatel_jmeno
        FROM OBJEDNAVKA o
        JOIN UZIVATEL u ON u.ID_Uzivatel = o.ID_Uzivatel
        WHERE o.ID_Objednavka = :OLD.ID_Objednavka;
    END IF;

    --------------------------------------------------------------------
    -- 3) Název supermarketu
    --------------------------------------------------------------------
    SELECT Nazev
    INTO v_super_nazev
    FROM SUPERMARKET
    WHERE ID_Supermarket = v_supermarket_id;

    --------------------------------------------------------------------
    -- 4) Najdeme ROOT archiv
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 5) Složka supermarketu
    --------------------------------------------------------------------
    SELECT a.ID_Archiv
    INTO v_archiv_super
    FROM ARCHIV a
    JOIN SUPERMARKET s ON s.NAZEV = a.NAZEV
    WHERE s.ID_Supermarket = v_supermarket_id
      AND a.Parent_id = v_root_id;

    --------------------------------------------------------------------
    -- 6) Složka "Log"
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_log
    FROM ARCHIV
    WHERE Parent_id = v_archiv_super
      AND Nazev = 'Log';

    --------------------------------------------------------------------
    -- 7) Podsložka "Platby"
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_platby
    FROM ARCHIV
    WHERE Parent_id = v_archiv_log
      AND Nazev = 'Platby';

    --------------------------------------------------------------------
    -- 8) NOVÁ data – čitelné, bez ID
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'castka='       || TO_CHAR(:NEW.castka)
            || '; datum='     || TO_CHAR(:NEW.datum, 'YYYY-MM-DD HH24:MI:SS')
            || '; objednavka='|| v_obj_typ || ' (' || v_uzivatel_jmeno || ')'
            || '; supermarket=' || v_super_nazev
            || '; typ='       || :NEW.platbaTyp;
    END IF;

    --------------------------------------------------------------------
    -- 9) STARÁ data – taky bez ID
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'castka='       || TO_CHAR(:OLD.castka)
            || '; datum='     || TO_CHAR(:OLD.datum, 'YYYY-MM-DD HH24:MI:SS')
            || '; objednavka='|| v_obj_typ || ' (' || v_uzivatel_jmeno || ')'
            || '; supermarket=' || v_super_nazev
            || '; typ='       || :OLD.platbaTyp;
    END IF;

    --------------------------------------------------------------------
    -- 10) idRekord – čitelný identifikátor platby (žádné ID)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_id_rekord :=
            'PLATBA ' ||
            TO_CHAR(:NEW.datum, 'YYYY-MM-DD HH24:MI') ||
            ' / ' || v_super_nazev;
    ELSE
        v_id_rekord :=
            'PLATBA ' ||
            TO_CHAR(:OLD.datum, 'YYYY-MM-DD HH24:MI') ||
            ' / ' || v_super_nazev;
    END IF;

    --------------------------------------------------------------------
    -- 11) Uložení logu
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
        v_id_rekord,
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
DELETE FROM OBJEDNAVKA WHERE ID_Objednavka = 2001;

SELECT *
FROM LOG
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

    v_id_rekord        VARCHAR2(4000); 
    v_role_nazev_new   VARCHAR2(200);
    v_role_nazev_old   VARCHAR2(200);
BEGIN
    --------------------------------------------------------------------
    -- 1) Určení operace
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
    ELSIF UPDATING THEN
        v_operace := 'U';
    ELSE
        v_operace := 'D';
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
    -- 4) Názvy rolí (místo ID_Role)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        SELECT Nazev
        INTO v_role_nazev_new
        FROM APP_ROLE   -- TODO: tvoje tabulka s rolemi
        WHERE ID_Role = :NEW.ID_Role;
    END IF;

    IF UPDATING OR DELETING THEN
        SELECT Nazev
        INTO v_role_nazev_old
        FROM APP_ROLE
        WHERE ID_Role = :OLD.ID_Role;
    END IF;

    --------------------------------------------------------------------
    -- 5) Nová data – čitelné, bez ID
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'jmeno='       || :NEW.jmeno
            || '; prijmeni=' || :NEW.prijmeni
            || '; email='    || :NEW.email
            || '; telefon='  || :NEW.telefonniCislo
            || '; role='     || v_role_nazev_new;
    END IF;

    --------------------------------------------------------------------
    -- 6) Stará data – taky bez ID
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'jmeno='       || :OLD.jmeno
            || '; prijmeni=' || :OLD.prijmeni
            || '; email='    || :OLD.email
            || '; telefon='  || :OLD.telefonniCislo
            || '; role='     || v_role_nazev_old;
    END IF;

    --------------------------------------------------------------------
    -- 7) idRekord = jméno uživatele (žádné ID)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_id_rekord := :NEW.jmeno || ' ' || :NEW.prijmeni;
    ELSE
        v_id_rekord := :OLD.jmeno || ' ' || :OLD.prijmeni;
    END IF;

    --------------------------------------------------------------------
    -- 8) Zápis logu do tabulky LOG
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
        v_id_rekord,              -- jméno uživatele místo ID
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
INSERT INTO UZIVATEL (ID_Uzivatel, jmeno, prijmeni, email, heslo, telefonniCislo, ID_Role) VALUES (5001, 'Anna', 'Kirik', 'anna@test.czk', 'annaTest', '7771234536', 7);
UPDATE UZIVATEL SET email = 'anna.updated@test.cz', ID_Role = 2 WHERE ID_Uzivatel = 5001;
DELETE FROM UZIVATEL WHERE ID_Uzivatel = 5001;

SELECT * 
FROM LOG 
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

    v_id_rekord       VARCHAR2(4000);   
    v_super_nazev     VARCHAR2(200);
BEGIN
    --------------------------------------------------------------------
    -- 1) Určení typu operace
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
    ELSIF UPDATING THEN
        v_operace := 'U';
    ELSE
        v_operace := 'D';
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
    -- 3) Název supermarketu
    --------------------------------------------------------------------
    SELECT Nazev
    INTO v_super_nazev
    FROM SUPERMARKET
    WHERE ID_Supermarket = v_supermarket_id;

    --------------------------------------------------------------------
    -- 4) Najdeme ROOT archiv
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 5) Najdeme složku supermarketu
    --------------------------------------------------------------------
    SELECT a.ID_Archiv
    INTO v_archiv_super
    FROM ARCHIV a
    JOIN SUPERMARKET s ON s.NAZEV = a.NAZEV
    WHERE s.ID_Supermarket = v_supermarket_id
      AND a.Parent_id = v_root_id;

    --------------------------------------------------------------------
    -- 6) Najdeme složku "Log"
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_log
    FROM ARCHIV
    WHERE Parent_id = v_archiv_super
      AND Nazev = 'Log';

    --------------------------------------------------------------------
    -- 7) Najdeme podsložku "Ostatni"
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_ostatni
    FROM ARCHIV
    WHERE Parent_id = v_archiv_log
      AND Nazev = 'Ostatni';

    --------------------------------------------------------------------
    -- 8) NOVÁ data – bez ID, jen názvy
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'nazev='        || :NEW.nazev
            || '; kapacita='  || :NEW.kapacita
            || '; telefon='   || :NEW.telefonniCislo
            || '; supermarket=' || v_super_nazev;
    END IF;

    --------------------------------------------------------------------
    -- 9) STARÁ data – taky bez ID
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'nazev='        || :OLD.nazev
            || '; kapacita='  || :OLD.kapacita
            || '; telefon='   || :OLD.telefonniCislo
            || '; supermarket=' || v_super_nazev;
    END IF;

    --------------------------------------------------------------------
    -- 10) idRekord = název skladu (žádné ID)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_id_rekord := :NEW.nazev;
    ELSE
        v_id_rekord := :OLD.nazev;
    END IF;

    --------------------------------------------------------------------
    -- 11) Zápis logu
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
        v_id_rekord,              -- název skladu místo ID
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
    v_root_id        NUMBER;
    v_archiv_uz      NUMBER;

    v_operace        CHAR(1);
    v_nova           VARCHAR2(4000);
    v_stara          VARCHAR2(4000);

    v_id_rekord      VARCHAR2(4000);
    v_uzivatel_jmeno VARCHAR2(200);
    v_id_uzivatel    NUMBER;
BEGIN
    --------------------------------------------------------------------
    -- 1) Operace
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
    ELSIF UPDATING THEN
        v_operace := 'U';
    ELSE
        v_operace := 'D';
    END IF;

    --------------------------------------------------------------------
    -- 2) Zjistíme ID_Uzivatel ze supertypu
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_id_uzivatel := :NEW.ID_Uzivatelu;
    ELSE
        v_id_uzivatel := :OLD.ID_Uzivatelu;
    END IF;

    --------------------------------------------------------------------
    -- 3) Načteme jméno uživatele (žádné ID v logu)
    --------------------------------------------------------------------
    SELECT jmeno || ' ' || prijmeni
    INTO v_uzivatel_jmeno
    FROM UZIVATEL
    WHERE ID_Uzivatel = v_id_uzivatel;

    --------------------------------------------------------------------
    -- 4) ROOT archiv
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 5) podsložka 'Uzivatele'
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_uz
    FROM ARCHIV
    WHERE Parent_id = v_root_id
      AND Nazev = 'Uzivatele';

    --------------------------------------------------------------------
    -- 6) Nová data (čitelné, bez ID)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'uzivatel='      || v_uzivatel_jmeno
            || '; kartaVernosti=' || :NEW.kartaVernosti;
    END IF;

    --------------------------------------------------------------------
    -- 7) Stará data (čitelné, bez ID)
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'uzivatel='      || v_uzivatel_jmeno
            || '; kartaVernosti=' || :OLD.kartaVernosti;
    END IF;

    --------------------------------------------------------------------
    -- 8) idRekord = jméno uživatele (žádné ID)
    --------------------------------------------------------------------
    v_id_rekord := v_uzivatel_jmeno;

    --------------------------------------------------------------------
    -- 9) Zápis do LOG
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
        'ZAKAZNIK',
        v_operace,
        SYSDATE,
        v_id_rekord,              -- jméno uživatele místo ID
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
    v_root_id        NUMBER;
    v_archiv_uz      NUMBER;

    v_operace        CHAR(1);
    v_nova           VARCHAR2(4000);
    v_stara          VARCHAR2(4000);

    v_id_rekord      VARCHAR2(4000);
    v_uzivatel_jmeno VARCHAR2(200);
    v_id_uzivatel    NUMBER;
BEGIN
    --------------------------------------------------------------------
    -- 1) Operace
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
    ELSIF UPDATING THEN
        v_operace := 'U';
    ELSE
        v_operace := 'D';
    END IF;

    --------------------------------------------------------------------
    -- 2) Zjistíme ID_Uzivatel ze ZAMESTNANEC
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_id_uzivatel := :NEW.ID_Uzivatelu;
    ELSE
        v_id_uzivatel := :OLD.ID_Uzivatelu;
    END IF;

    --------------------------------------------------------------------
    -- 3) Načteme jméno uživatele (zaměstnance) z UZIVATEL
    --------------------------------------------------------------------
    SELECT jmeno || ' ' || prijmeni
    INTO v_uzivatel_jmeno
    FROM UZIVATEL
    WHERE ID_Uzivatel = v_id_uzivatel;

    --------------------------------------------------------------------
    -- 4) ROOT archiv
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 5) podsložka 'Uzivatele'
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_uz
    FROM ARCHIV
    WHERE Parent_id = v_root_id
      AND Nazev = 'Uzivatele';

    --------------------------------------------------------------------
    -- 6) Nová data (čitelné, bez ID)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'zamestnanec=' || v_uzivatel_jmeno
           || '; pozice='    || :NEW.pozice
           || '; mzda='      || :NEW.mzda;
    END IF;

    --------------------------------------------------------------------
    -- 7) Stará data (čitelné, bez ID)
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'zamestnanec=' || v_uzivatel_jmeno
           || '; pozice='    || :OLD.pozice
           || '; mzda='      || :OLD.mzda;
    END IF;

    --------------------------------------------------------------------
    -- 8) idRekord = jméno zaměstnance (žádné ID)
    --------------------------------------------------------------------
    v_id_rekord := v_uzivatel_jmeno;

    --------------------------------------------------------------------
    -- 9) Zápis do LOG
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log, tabulkaNazev, operace, datumZmeny,
        idRekord, novaData, staraData, popis, ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'ZAMESTNANEC',
        v_operace,
        SYSDATE,
        v_id_rekord,              -- jméno místo ID
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
    v_root_id        NUMBER;
    v_archiv_uz      NUMBER;

    v_operace        CHAR(1);
    v_nova           VARCHAR2(4000);
    v_stara          VARCHAR2(4000);

    v_id_rekord      VARCHAR2(4000);
    v_uzivatel_jmeno VARCHAR2(200);
    v_id_uzivatel    NUMBER;
BEGIN
    --------------------------------------------------------------------
    -- 1) Operace
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
    ELSIF UPDATING THEN
        v_operace := 'U';
    ELSE
        v_operace := 'D';
    END IF;

    --------------------------------------------------------------------
    -- 2) Zjistíme ID_Uzivatel ze DODAVATEL
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_id_uzivatel := :NEW.ID_Uzivatelu;
    ELSE
        v_id_uzivatel := :OLD.ID_Uzivatelu;
    END IF;

    --------------------------------------------------------------------
    -- 3) Načteme jméno uživatele z UZIVATEL
    --------------------------------------------------------------------
    SELECT jmeno || ' ' || prijmeni
    INTO v_uzivatel_jmeno
    FROM UZIVATEL
    WHERE ID_Uzivatel = v_id_uzivatel;

    --------------------------------------------------------------------
    -- 4) ROOT archiv
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 5) podsložka 'Uzivatele'
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_uz
    FROM ARCHIV
    WHERE Parent_id = v_root_id
      AND Nazev = 'Uzivatele';

    --------------------------------------------------------------------
    -- 6) Nová data (čitelné, bez ID)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'dodavatel=' || :NEW.firma
           || '; uzivatel=' || v_uzivatel_jmeno;
    END IF;

    --------------------------------------------------------------------
    -- 7) Stará data (čitelné, bez ID)
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'dodavatel=' || :OLD.firma
           || '; uzivatel=' || v_uzivatel_jmeno;
    END IF;

    --------------------------------------------------------------------
    -- 8) idRekord = název firmy (žádné ID)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_id_rekord := :NEW.firma;
    ELSE
        v_id_rekord := :OLD.firma;
    END IF;

    --------------------------------------------------------------------
    -- 9) zápis logu
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log, tabulkaNazev, operace, datumZmeny,
        idRekord, novaData, staraData, popis, ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'DODAVATEL',
        v_operace,
        SYSDATE,
        v_id_rekord,              -- firma místo ID
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



--------------------------------------------------------------------------------
-- TRIGGER: TRG_APP_PRAVO_LOG
-- POPIS:
--   Loguje změny v tabulce APP_PRAVO (definice práv systému).
--   Nezapisuje žádné ID (bezpečné logování).
--   Archivní umístění:
--       ROOT / Global Log
--------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_APP_PRAVO_LOG
AFTER INSERT OR UPDATE OR DELETE ON PRAVO
FOR EACH ROW
DECLARE
    v_operace     CHAR(1);
    v_nova        VARCHAR2(4000);
    v_stara       VARCHAR2(4000);
    v_id_rekord   VARCHAR2(200);
    v_archiv_id   NUMBER;
BEGIN
    --------------------------------------------------------------------
    -- 1) Určení typu operace
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
    ELSIF UPDATING THEN
        v_operace := 'U';
    ELSE
        v_operace := 'D';
    END IF;

    --------------------------------------------------------------------
    -- 2) Archivní složka Global Log
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_id
    FROM ARCHIV
    WHERE Nazev = 'Global Log';

    --------------------------------------------------------------------
    -- 3) Nová data (jen čitelné hodnoty, žádná ID)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'kod='   || :NEW.KOD
           || '; nazev=' || :NEW.NAZEV
           || '; popis=' || SUBSTR(:NEW.POPIS, 1, 500);
    END IF;

    --------------------------------------------------------------------
    -- 4) Stará data (jen čitelné hodnoty)
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'kod='   || :OLD.KOD
           || '; nazev=' || :OLD.NAZEV
           || '; popis=' || SUBSTR(:OLD.POPIS, 1, 500);
    END IF;

    --------------------------------------------------------------------
    -- 5) idRekord = KOD práva (bez ID)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_id_rekord := :NEW.KOD;
    ELSE
        v_id_rekord := :OLD.KOD;
    END IF;

    --------------------------------------------------------------------
    -- 6) Zápis logu
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log, tabulkaNazev, operace, datumZmeny,
        idRekord, novaData, staraData, popis, ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'PRAVO',
        v_operace,
        SYSDATE,
        v_id_rekord,
        v_nova,
        v_stara,
        'Log změny práva',
        v_archiv_id
    );
END;
/
INSERT INTO PRAVO (ID_PRAVO, NAZEV, KOD, POPIS)
VALUES (100, 'Editace zboží', 'EDIT_ZBOZI', 'Právo umožňuje editovat zboží');
SELECT tabulkaNazev, operace, idRekord, novaData, staraData
FROM LOG
WHERE tabulkaNazev = 'PRAVO'
ORDER BY ID_Log DESC FETCH FIRST 1 ROW ONLY;


--------------------------------------------------------------------------------
-- TRIGGER: TRG_APP_ROLE_LOG
-- POPIS:
--   Loguje změny v tabulce APP_ROLE (uživatelské role).
--   Nepoužívá ID – loguje pouze názvy rolí.
--   Archivní umístění:
--       ROOT / Global Log
--------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_APP_ROLE_LOG
AFTER INSERT OR UPDATE OR DELETE ON APP_ROLE
FOR EACH ROW
DECLARE
    v_operace     CHAR(1);
    v_nova        VARCHAR2(4000);
    v_stara       VARCHAR2(4000);
    v_id_rekord   VARCHAR2(200);
    v_archiv_id   NUMBER;
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
    -- 2) Archivní složka Global Log
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_id
    FROM ARCHIV
    WHERE Nazev = 'Global Log';

    --------------------------------------------------------------------
    -- 3) Nová data (pouze čitelné hodnoty)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova := 'nazev=' || :NEW.NAZEV;
    END IF;

    --------------------------------------------------------------------
    -- 4) Stará data
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara := 'nazev=' || :OLD.NAZEV;
    END IF;

    --------------------------------------------------------------------
    -- 5) idRekord = název role
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_id_rekord := :NEW.NAZEV;
    ELSE
        v_id_rekord := :OLD.NAZEV;
    END IF;

    --------------------------------------------------------------------
    -- 6) Zápis do LOG
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log, tabulkaNazev, operace, datumZmeny,
        idRekord, novaData, staraData, popis, ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'APP_ROLE',
        v_operace,
        SYSDATE,
        v_id_rekord,
        v_nova,
        v_stara,
        'Log změny role',
        v_archiv_id
    );
END;
/

--------------------------------------------------------------------------------
-- TRIGGER: TRG_APP_ROLE_PRAVO_LOG
-- POPIS:
--   Loguje změny v propojení ROLE ↔ PRAVO (m:n vztah).
--   Do logu se zapisují pouze názvy rolí a kódy práv (bez ID).
--   Archivní umístění:
--       ROOT / Global Log
--------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_APP_ROLE_PRAVO_LOG
AFTER INSERT OR UPDATE OR DELETE ON APP_ROLE_PRAVO
FOR EACH ROW
DECLARE
    v_operace     CHAR(1);
    v_nova        VARCHAR2(4000);
    v_stara       VARCHAR2(4000);
    v_id_rekord   VARCHAR2(4000);

    v_archiv_id   NUMBER;
    v_role_nazev  VARCHAR2(200);
    v_pravo_kod   VARCHAR2(200);
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
    -- 2) Archivní složka GlobalLog
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_id
    FROM ARCHIV
    WHERE Nazev = 'Global Log';

    --------------------------------------------------------------------
    -- 3) Načtení názvu role (bez ID)
    --------------------------------------------------------------------
    SELECT NAZEV
    INTO v_role_nazev
    FROM APP_ROLE
    WHERE ID_ROLE = NVL(:NEW.ID_ROLE, :OLD.ID_ROLE);

    --------------------------------------------------------------------
    -- 4) Načtení kódu práva (bez ID)
    --------------------------------------------------------------------
    SELECT KOD
    INTO v_pravo_kod
    FROM PRAVO
    WHERE ID_PRAVO = NVL(:NEW.ID_PRAVO, :OLD.ID_PRAVO);

    --------------------------------------------------------------------
    -- 5) Nová data (role + právo)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'role='  || v_role_nazev
           || '; pravo=' || v_pravo_kod;
    END IF;

    --------------------------------------------------------------------
    -- 6) Stará data (role + právo)
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'role='  || v_role_nazev
           || '; pravo=' || v_pravo_kod;
    END IF;

    --------------------------------------------------------------------
    -- 7) idRekord = kombinace role + pravo (bez ID)
    --------------------------------------------------------------------
    v_id_rekord :=
          'role='  || v_role_nazev
       || '; pravo=' || v_pravo_kod;

    --------------------------------------------------------------------
    -- 8) Zápis logu
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log, tabulkaNazev, operace, datumZmeny,
        idRekord, novaData, staraData, popis, ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'APP_ROLE_PRAVO',
        v_operace,
        SYSDATE,
        v_id_rekord,
        v_nova,
        v_stara,
        'Log změny přiřazení práva k roli',
        v_archiv_id
    );
END;
/

--------------------------------------------------------------------------------
-- TRIGGER: TRG_NOTIFIKACE_LOG
-- POPIS:
--   Loguje změny v tabulce NOTIFIKACE.
--   Loguje pouze čitelné údaje (bez ID).
--   Archivní umístění:
--       ROOT / Global Log
--------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_NOTIFIKACE_LOG
AFTER INSERT OR UPDATE OR DELETE ON NOTIFIKACE
FOR EACH ROW
DECLARE
    v_operace    CHAR(1);
    v_nova       VARCHAR2(4000);
    v_stara      VARCHAR2(4000);
    v_id_rekord  VARCHAR2(4000);
    v_archiv_id  NUMBER;
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
    -- 2) Archivní složka Global Log
    --------------------------------------------------------------------
    SELECT ID_Archiv INTO v_archiv_id
    FROM ARCHIV WHERE NAZEV = 'Global Log';

    --------------------------------------------------------------------
    -- 3) Nová data (bez ID)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'authtoken=' || :NEW.AUTHTOKEN
           || '; endpoint=' || :NEW.ENDPOINT
           || '; p256dh='   || :NEW.P256DH
           || '; adresat='  || :NEW.ADRESAT;
    END IF;

    --------------------------------------------------------------------
    -- 4) Stará data (bez ID)
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'authtoken=' || :OLD.AUTHTOKEN
           || '; endpoint=' || :OLD.ENDPOINT
           || '; p256dh='   || :OLD.P256DH
           || '; adresat='  || :OLD.ADRESAT;
    END IF;

    --------------------------------------------------------------------
    -- 5) idRekord – použijeme adresáta (jedinečný údaj)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_id_rekord := :NEW.ADRESAT;
    ELSE
        v_id_rekord := :OLD.ADRESAT;
    END IF;

    --------------------------------------------------------------------
    -- 6) Zápis do LOG
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log, tabulkaNazev, operace, datumZmeny,
        idRekord, novaData, staraData, popis, ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'NOTIFIKACE',
        v_operace,
        SYSDATE,
        v_id_rekord,
        v_nova,
        v_stara,
        'Log změn notifikací',
        v_archiv_id
    );
END;
/

--------------------------------------------------------------------------------
-- TRIGGER: TRG_OBEC_LOG
-- POPIS:
--   Loguje změny v tabulce MESTO (PSČ, název, kraj).
--   Archivní umístění:
--       ROOT / Global Log
--------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_OBEC_LOG
AFTER INSERT OR UPDATE OR DELETE ON MESTO
FOR EACH ROW
DECLARE
    v_operace    CHAR(1);
    v_nova       VARCHAR2(4000);
    v_stara      VARCHAR2(4000);
    v_id_rekord  VARCHAR2(20);
    v_archiv_id  NUMBER;
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
    -- 2) Archivní složka Global Log
    --------------------------------------------------------------------
    SELECT ID_Archiv INTO v_archiv_id
    FROM ARCHIV WHERE NAZEV = 'Global Log';

    --------------------------------------------------------------------
    -- 3) Nová data
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'psc='   || :NEW.PSC
           || '; nazev=' || :NEW.NAZEV
           || '; kraj='  || :NEW.KRAJ;
    END IF;

    --------------------------------------------------------------------
    -- 4) Stará data
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'psc='   || :OLD.PSC
           || '; nazev=' || :OLD.NAZEV
           || '; kraj='  || :OLD.KRAJ;
    END IF;

    --------------------------------------------------------------------
    -- 5) idRekord = PSC
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_id_rekord := :NEW.PSC;
    ELSE
        v_id_rekord := :OLD.PSC;
    END IF;

    --------------------------------------------------------------------
    -- 6) Zápis do LOG
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log, tabulkaNazev, operace, datumZmeny,
        idRekord, novaData, staraData, popis, ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'OBEC',
        v_operace,
        SYSDATE,
        v_id_rekord,
        v_nova,
        v_stara,
        'Log změn obcí (PSČ)',
        v_archiv_id
    );
END;
/

--------------------------------------------------------------------------------
-- TRIGGER: TRG_KATEGORIE_ZBOZI_LOG
-- POPIS:
--   Loguje změny v číselníku kategorií zboží.
--   Loguje pouze název a popis (bez ID).
--   Archivní umístění:
--       ROOT / Global Log
--------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_KATEGORIE_ZBOZI_LOG
AFTER INSERT OR UPDATE OR DELETE ON KATEGORIE_ZBOZI
FOR EACH ROW
DECLARE
    v_operace    CHAR(1);
    v_nova       VARCHAR2(4000);
    v_stara      VARCHAR2(4000);
    v_id_rekord  VARCHAR2(200);
    v_archiv_id  NUMBER;
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
    -- 2) Archivní složka Global Log
    --------------------------------------------------------------------
    SELECT ID_Archiv INTO v_archiv_id
    FROM ARCHIV WHERE NAZEV = 'Global Log';

    --------------------------------------------------------------------
    -- 3) Nová data
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'nazev=' || :NEW.NAZEV
           || '; popis=' || :NEW.POPIS;
    END IF;

    --------------------------------------------------------------------
    -- 4) Stará data
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'nazev=' || :OLD.NAZEV
           || '; popis=' || :OLD.POPIS;
    END IF;

    --------------------------------------------------------------------
    -- 5) idRekord = název kategorie
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_id_rekord := :NEW.NAZEV;
    ELSE
        v_id_rekord := :OLD.NAZEV;
    END IF;

    --------------------------------------------------------------------
    -- 6) Zápis do LOG
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log, tabulkaNazev, operace, datumZmeny,
        idRekord, novaData, staraData, popis, ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'KATEGORIE_ZBOZI',
        v_operace,
        SYSDATE,
        v_id_rekord,
        v_nova,
        v_stara,
        'Log změn kategorií zboží',
        v_archiv_id
    );
END;
/

--------------------------------------------------------------------------------
-- TRIGGER: TRG_ADRESA_LOG
-- POPIS:
--   Loguje změny v tabulce ADRESA.
--   Do logu se zapisují pouze čitelné hodnoty (ulice, čísla, PSC).
--   Žádná ID nejsou zapisována.
--   Archivní umístění:
--       ROOT / Global Log
--------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_ADRESA_LOG
AFTER INSERT OR UPDATE OR DELETE ON ADRESA
FOR EACH ROW
DECLARE
    v_operace       CHAR(1);
    v_nova          VARCHAR2(4000);
    v_stara         VARCHAR2(4000);
    v_id_rekord     VARCHAR2(4000);
    v_archiv_id     NUMBER;
BEGIN
    --------------------------------------------------------------------
    -- 1) Typ prováděné operace
    --------------------------------------------------------------------
    IF INSERTING THEN
        v_operace := 'I';
    ELSIF UPDATING THEN
        v_operace := 'U';
    ELSE
        v_operace := 'D';
    END IF;

    --------------------------------------------------------------------
    -- 2) Archivní složka Global Log
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_archiv_id
    FROM ARCHIV
    WHERE NAZEV = 'Global Log';

    --------------------------------------------------------------------
    -- 3) Nová data (bez ID)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_nova :=
              'ulice='              || :NEW.ULICE
           || '; cisloPopisne='     || :NEW.CISLOPOPISNE
           || '; cisloOrientacni='  || :NEW.CISLOORIENTACNI
           || '; psc='              || :NEW.MESTO_PSC;
    END IF;

    --------------------------------------------------------------------
    -- 4) Stará data (bez ID)
    --------------------------------------------------------------------
    IF UPDATING OR DELETING THEN
        v_stara :=
              'ulice='              || :OLD.ULICE
           || '; cisloPopisne='     || :OLD.CISLOPOPISNE
           || '; cisloOrientacni='  || :OLD.CISLOORIENTACNI
           || '; psc='              || :OLD.MESTO_PSC;
    END IF;

    --------------------------------------------------------------------
    -- 5) idRekord – jednoznačný text adresy (ulice + číslo)
    --------------------------------------------------------------------
    IF INSERTING OR UPDATING THEN
        v_id_rekord :=
              :NEW.ULICE || ' '
           || :NEW.CISLOPOPISNE || '/' || :NEW.CISLOORIENTACNI;
    ELSE
        v_id_rekord :=
              :OLD.ULICE || ' '
           || :OLD.CISLOPOPISNE || '/' || :OLD.CISLOORIENTACNI;
    END IF;

    --------------------------------------------------------------------
    -- 6) Zápis do LOG
    --------------------------------------------------------------------
    INSERT INTO LOG (
        ID_Log, tabulkaNazev, operace, datumZmeny,
        idRekord, novaData, staraData, popis, ID_Archiv
    ) VALUES (
        SEQ_LOG_ID.NEXTVAL,
        'ADRESA',
        v_operace,
        SYSDATE,
        v_id_rekord,
        v_nova,
        v_stara,
        'Log změny adresy',
        v_archiv_id
    );
END;
/


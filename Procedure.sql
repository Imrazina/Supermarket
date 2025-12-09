--------------------------------------------------------------------------------
-- PROCEDURA: PROC_INIT_ARCHIV_SUPERMARKETU
-- Popis:
--   Vytvoří archivní složky pro všechny existující supermarkety,
--   které dosud nemají vytvořenou větev v archivu.
--------------------------------------------------------------------------------

CREATE OR REPLACE PROCEDURE PROC_INIT_ARCHIV_SUPERMARKETU
AS
    v_root_id NUMBER;
    v_sup_id NUMBER;
    v_log_id NUMBER;
BEGIN
    --------------------------------------------------------------------
    -- 1) Najdeme kořen archivu
    --------------------------------------------------------------------
    SELECT ID_Archiv
    INTO v_root_id
    FROM ARCHIV
    WHERE Parent_id IS NULL;

    --------------------------------------------------------------------
    -- 2) Pro každý supermarket, který ještě nemá složku v archivu
    --------------------------------------------------------------------
    FOR s IN (
        SELECT ID_Supermarket, NAZEV
        FROM SUPERMARKET
        WHERE NAZEV NOT IN (
            SELECT Nazev FROM ARCHIV WHERE Parent_id = v_root_id
        )
    )
    LOOP
        ----------------------------------------------------------------
        -- Vytvoříme složku supermarketu
        ----------------------------------------------------------------
        INSERT INTO ARCHIV (ID_Archiv, Nazev, Popis, Parent_id)
        VALUES (
            SEQ_ARCHIV_ID.NEXTVAL,
            s.NAZEV,
            'Archiv pro supermarket ' || s.NAZEV,
            v_root_id
        )
        RETURNING ID_Archiv INTO v_sup_id;

        ----------------------------------------------------------------
        -- Základní podsložky
        ----------------------------------------------------------------
        INSERT INTO ARCHIV VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Dokumenty', 'Dokumenty', v_sup_id);
        INSERT INTO ARCHIV VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Reporty', 'Reporty', v_sup_id);
        INSERT INTO ARCHIV VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Inventura', 'Inventura', v_sup_id);

        ----------------------------------------------------------------
        -- Složka Log
        ----------------------------------------------------------------
        INSERT INTO ARCHIV (ID_Archiv, Nazev, Popis, Parent_id)
        VALUES (
            SEQ_ARCHIV_ID.NEXTVAL,
            'Log',
            'Logy supermarketu ' || s.NAZEV,
            v_sup_id
        )
        RETURNING ID_Archiv INTO v_log_id;

        ----------------------------------------------------------------
        -- Podsložky logu
        ----------------------------------------------------------------
        INSERT INTO ARCHIV VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Zbozi', 'Logy ZBOZI', v_log_id);
        INSERT INTO ARCHIV VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Objednavky', 'Logy OBJEDNAVKA', v_log_id);
        INSERT INTO ARCHIV VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Platby', 'Logy PLATBA', v_log_id);
        INSERT INTO ARCHIV VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Ostatni', 'Ostatní logy', v_log_id);

    END LOOP;
END;
/

--------------------------------------------------------------------------------
-- PACKAGE: PKG_APP_CRUD
-- Popis:
--   Jednotná procedura pro INSERT/UPDATE/DELETE nad whitelisted tabulkami
--   (bez LOG a bez SOUBOR kvůli BLOBu). Vstupem je název entity, akce,
--   klíče a JSON payload s hodnotami sloupců.
--   Při INSERT vrací vygenerovaný klíč v p_out_key1 (a p_out_key2 pro
--   složené PK).
-- Poznámky:
--   - Používej INS/UPD/DEL v p_action.
--   - JSON musí obsahovat očekávané klíče (viz jednotlivé větve CASE).
--   - LOG není povolen, SOUBOR má BLOB, proto není v routingu.
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE PKG_APP_CRUD AS
  PROCEDURE edit(
    p_entity    IN  VARCHAR2,   -- např. 'UZIVATEL','ZBOZI','OBJEDNAVKA_ZBOZI'
    p_action    IN  VARCHAR2,   -- 'INS','UPD','DEL'
    p_key1      IN  VARCHAR2 DEFAULT NULL, -- hlavní PK (např. ID_*)
    p_key2      IN  VARCHAR2 DEFAULT NULL, -- druhý PK pro složené klíče
    p_payload   IN  CLOB     DEFAULT NULL, -- JSON data pro INS/UPD
    p_out_code  OUT NUMBER,                -- 0 = OK, jinak SQLCODE
    p_out_msg   OUT VARCHAR2,              -- zpráva
    p_out_key1  OUT VARCHAR2,              -- vrácený klíč/PK1
    p_out_key2  OUT VARCHAR2               -- vrácený PK2 (u složených PK)
  );
END PKG_APP_CRUD;
/

--------------------------------------------------------------------------------
-- PROCEDURA: PROC_CREATE_PLATBA
-- Popis:
--   Bezpečně vytvoří platbu a odpovídající detail (KARTA nebo HOTOVOST)
--   v jednom volání. Obchází ARC triggery pomocí PKG_ARC_CTRL.skip_arc,
--   ale po vložení je znovu zapíná.
--------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE PROC_CREATE_PLATBA(
    p_objednavka_id IN PLATBA.ID_Objednavka%TYPE,
    p_typ           IN PLATBA.platbaTyp%TYPE,         -- 'H' nebo 'K'
    p_castka        IN PLATBA.castka%TYPE,
    p_datum         IN PLATBA.datum%TYPE DEFAULT SYSDATE,
    p_cislo_karty   IN KARTA.cisloKarty%TYPE DEFAULT NULL,
    p_prijato       IN HOTOVOST.prijato%TYPE DEFAULT NULL,
    p_vraceno       IN HOTOVOST.vraceno%TYPE DEFAULT NULL,
    p_out_code      OUT NUMBER,
    p_out_msg       OUT VARCHAR2,
    p_out_id        OUT PLATBA.ID_platba%TYPE
)
AS
    v_typ   CHAR(2);
    v_count NUMBER;
BEGIN
    p_out_code := 0;
    p_out_msg  := 'OK';
    p_out_id   := NULL;

    v_typ := UPPER(TRIM(p_typ));
    IF v_typ NOT IN ('H','K') THEN
        raise_application_error(-20030, 'platbaTyp musí být H nebo K');
    END IF;

    -- Ověř objednávku a že ještě nemá platbu
    SELECT 1 INTO v_count FROM OBJEDNAVKA WHERE ID_Objednavka = p_objednavka_id;
    SELECT COUNT(*) INTO v_count FROM PLATBA WHERE ID_Objednavka = p_objednavka_id;
    IF v_count > 0 THEN
        raise_application_error(-20031, 'Objednávka už má platbu');
    END IF;

    -- Dočasně přeskoč ARC kontroly na PLATBA
    PKG_ARC_CTRL.set_skip_arc(TRUE);

    INSERT INTO PLATBA (castka, datum, ID_Objednavka, platbaTyp)
    VALUES (p_castka, p_datum, p_objednavka_id, v_typ)
    RETURNING ID_platba INTO p_out_id;

    IF v_typ = 'K' THEN
        IF p_cislo_karty IS NULL THEN
            raise_application_error(-20032, 'cisloKarty je povinné pro platbaTyp=K');
        END IF;
        INSERT INTO KARTA (ID_platba, cisloKarty)
        VALUES (p_out_id, p_cislo_karty);
    ELSE
        IF p_prijato IS NULL THEN
            raise_application_error(-20033, 'prijato je povinné pro platbaTyp=H');
        END IF;
        INSERT INTO HOTOVOST (ID_platba, prijato, vraceno)
        VALUES (p_out_id, p_prijato, NVL(p_vraceno, p_prijato - p_castka));
    END IF;

    -- Zapni ARC kontroly zpět
    PKG_ARC_CTRL.set_skip_arc(FALSE);

EXCEPTION
    WHEN OTHERS THEN
        PKG_ARC_CTRL.set_skip_arc(FALSE);
        p_out_code := SQLCODE;
        p_out_msg  := SQLERRM;
END;
/

--------------------------------------------------------------------------------
-- PROCEDURA: PROC_DELETE_OBJEDNAVKA_CASCADE
-- Popis:
--   Smaze objednavku vcetne vazanych plateb a polozek. Poradi mazani
--   respektuje FK: nejdrive KARTA/HOTOVOST, pote PLATBA, POHYB_UCTU,
--   OBJEDNAVKA_ZBOZI a nakonec OBJEDNAVKA.
--------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE PROC_DELETE_OBJEDNAVKA_CASCADE(
    p_id IN OBJEDNAVKA.ID_Objednavka%TYPE
)
AS
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
END;
/

CREATE OR REPLACE PACKAGE BODY PKG_APP_CRUD AS
  PROCEDURE edit(
    p_entity    IN  VARCHAR2,
    p_action    IN  VARCHAR2,
    p_key1      IN  VARCHAR2 DEFAULT NULL,
    p_key2      IN  VARCHAR2 DEFAULT NULL,
    p_payload   IN  CLOB     DEFAULT NULL,
    p_out_code  OUT NUMBER,
    p_out_msg   OUT VARCHAR2,
    p_out_key1  OUT VARCHAR2,
    p_out_key2  OUT VARCHAR2
  ) IS
    v_entity VARCHAR2(50) := UPPER(TRIM(p_entity));
    v_action VARCHAR2(3)  := UPPER(TRIM(p_action));
    v_k1     VARCHAR2(100) := TRIM(p_key1);
    v_k2     VARCHAR2(100) := TRIM(p_key2);
    v_num    NUMBER;
  BEGIN
    p_out_key1 := NULL;
    p_out_key2 := NULL;

    IF v_action NOT IN ('INS','UPD','DEL') THEN
      RAISE_APPLICATION_ERROR(-20000, 'p_action musí být INS/UPD/DEL');
    END IF;

    CASE v_entity
      WHEN 'ADRESA' THEN
        IF v_action = 'INS' THEN
          INSERT INTO ADRESA (ulice, cisloPopisne, Mesto_PSC, cisloOrientacni)
          VALUES (
            json_value(p_payload, '$.ulice'),
            json_value(p_payload, '$.cisloPopisne'),
            json_value(p_payload, '$.Mesto_PSC'),
            json_value(p_payload, '$.cisloOrientacni')
          ) RETURNING ID_Adresa INTO v_num;
          p_out_key1 := TO_CHAR(v_num);
        ELSIF v_action = 'UPD' THEN
          UPDATE ADRESA
             SET ulice = json_value(p_payload, '$.ulice'),
                 cisloPopisne = json_value(p_payload, '$.cisloPopisne'),
                 Mesto_PSC = json_value(p_payload, '$.Mesto_PSC'),
                 cisloOrientacni = json_value(p_payload, '$.cisloOrientacni')
           WHERE ID_Adresa = TO_NUMBER(v_k1);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        ELSE
          DELETE FROM ADRESA WHERE ID_Adresa = TO_NUMBER(v_k1);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        END IF;

      WHEN 'MESTO' THEN
        IF v_action = 'INS' THEN
          INSERT INTO Mesto (PSC, nazev, kraj)
          VALUES (
            json_value(p_payload, '$.PSC'),
            json_value(p_payload, '$.nazev'),
            json_value(p_payload, '$.kraj')
          );
          p_out_key1 := json_value(p_payload, '$.PSC');
        ELSIF v_action = 'UPD' THEN
          UPDATE Mesto
             SET nazev = json_value(p_payload, '$.nazev'),
                 kraj = json_value(p_payload, '$.kraj')
           WHERE PSC = v_k1;
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        ELSE
          DELETE FROM Mesto WHERE PSC = v_k1;
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        END IF;

      WHEN 'KATEGORIE_ZBOZI' THEN
        IF v_action = 'INS' THEN
          INSERT INTO Kategorie_zbozi (nazev, popis)
          VALUES (
            json_value(p_payload, '$.nazev'),
            json_value(p_payload, '$.popis')
          ) RETURNING ID_Kategorie INTO v_num;
          p_out_key1 := TO_CHAR(v_num);
        ELSIF v_action = 'UPD' THEN
          UPDATE Kategorie_zbozi
             SET nazev = json_value(p_payload, '$.nazev'),
                 popis = json_value(p_payload, '$.popis')
           WHERE ID_Kategorie = TO_NUMBER(v_k1);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        ELSE
          DELETE FROM Kategorie_zbozi WHERE ID_Kategorie = TO_NUMBER(v_k1);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        END IF;

      WHEN 'APP_ROLE' THEN
        IF v_action = 'INS' THEN
          INSERT INTO APP_ROLE (nazev) VALUES (json_value(p_payload, '$.nazev'))
          RETURNING ID_Role INTO v_num;
          p_out_key1 := TO_CHAR(v_num);
        ELSIF v_action = 'UPD' THEN
          UPDATE APP_ROLE
             SET nazev = json_value(p_payload, '$.nazev')
           WHERE ID_Role = TO_NUMBER(v_k1);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        ELSE
          DELETE FROM APP_ROLE WHERE ID_Role = TO_NUMBER(v_k1);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        END IF;

      WHEN 'PRAVO' THEN
        IF v_action = 'INS' THEN
          INSERT INTO PRAVO (nazev, kod, popis)
          VALUES (
            json_value(p_payload, '$.nazev'),
            json_value(p_payload, '$.kod'),
            json_value(p_payload, '$.popis')
          ) RETURNING ID_Pravo INTO v_num;
          p_out_key1 := TO_CHAR(v_num);
        ELSIF v_action = 'UPD' THEN
          UPDATE PRAVO
             SET nazev = json_value(p_payload, '$.nazev'),
                 kod = json_value(p_payload, '$.kod'),
                 popis = json_value(p_payload, '$.popis')
           WHERE ID_Pravo = TO_NUMBER(v_k1);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        ELSE
          DELETE FROM PRAVO WHERE ID_Pravo = TO_NUMBER(v_k1);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        END IF;

      WHEN 'APP_ROLE_PRAVO' THEN
        IF v_action = 'INS' THEN
          INSERT INTO APP_ROLE_PRAVO (ID_Pravo, ID_Role)
          VALUES (
            json_value(p_payload, '$.ID_Pravo' RETURNING NUMBER),
            json_value(p_payload, '$.ID_Role' RETURNING NUMBER)
          );
          p_out_key1 := json_value(p_payload, '$.ID_Pravo');
          p_out_key2 := json_value(p_payload, '$.ID_Role');
        ELSIF v_action = 'UPD' THEN
          UPDATE APP_ROLE_PRAVO
             SET ID_Pravo = json_value(p_payload, '$.ID_Pravo' RETURNING NUMBER),
                 ID_Role = json_value(p_payload, '$.ID_Role' RETURNING NUMBER)
           WHERE ID_Pravo = TO_NUMBER(v_k1)
             AND ID_Role  = TO_NUMBER(v_k2);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
          p_out_key2 := v_k2;
        ELSE
          DELETE FROM APP_ROLE_PRAVO
           WHERE ID_Pravo = TO_NUMBER(v_k1)
             AND ID_Role  = TO_NUMBER(v_k2);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
          p_out_key2 := v_k2;
        END IF;

      WHEN 'UZIVATEL' THEN
        RAISE_APPLICATION_ERROR(-20050, 'UZIVATEL upravuj jen přes speciální procedury (např. PROC_CHANGE_USER_ROLE)');

      WHEN 'DODAVATEL' THEN
        RAISE_APPLICATION_ERROR(-20050, 'DODAVATEL upravuj jen přes specializovanou proceduru');

      WHEN 'ZAKAZNIK' THEN
        RAISE_APPLICATION_ERROR(-20050, 'ZAKAZNIK upravuj jen přes specializovanou proceduru');

      WHEN 'ZAMESTNANEC' THEN
        RAISE_APPLICATION_ERROR(-20050, 'ZAMESTNANEC upravuj jen přes specializovanou proceduru');

      WHEN 'SUPERMARKET' THEN
        RAISE_APPLICATION_ERROR(-20050, 'SUPERMARKET upravuj jen přes specializovanou proceduru');

      WHEN 'SKLAD' THEN
        RAISE_APPLICATION_ERROR(-20050, 'SKLAD upravuj jen přes specializovanou proceduru');

      WHEN 'ZBOZI' THEN
        RAISE_APPLICATION_ERROR(-20050, 'ZBOZI upravuj jen přes specializovanou proceduru');

      WHEN 'ZBOZI_DODAVATEL' THEN
        RAISE_APPLICATION_ERROR(-20050, 'ZBOZI_DODAVATEL upravuj jen přes specializovanou proceduru');

      WHEN 'STATUS' THEN
        IF v_action = 'INS' THEN
          INSERT INTO STATUS (nazev)
          VALUES (json_value(p_payload, '$.nazev'))
          RETURNING ID_Status INTO v_num;
          p_out_key1 := TO_CHAR(v_num);
        ELSIF v_action = 'UPD' THEN
          UPDATE STATUS
             SET nazev = json_value(p_payload, '$.nazev')
           WHERE ID_Status = TO_NUMBER(v_k1);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        ELSE
          DELETE FROM STATUS WHERE ID_Status = TO_NUMBER(v_k1);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        END IF;

      WHEN 'OBJEDNAVKA' THEN
        RAISE_APPLICATION_ERROR(-20050, 'OBJEDNAVKA upravuj jen přes specializovanou proceduru');

      WHEN 'OBJEDNAVKA_ZBOZI' THEN
        RAISE_APPLICATION_ERROR(-20050, 'OBJEDNAVKA_ZBOZI upravuj jen přes specializovanou proceduru');

      WHEN 'PLATBA' THEN
        RAISE_APPLICATION_ERROR(-20050, 'PLATBA/KARTA/HOTOVOST řeš přes PROC_CREATE_PLATBA');

      WHEN 'KARTA' THEN
        RAISE_APPLICATION_ERROR(-20050, 'PLATBA/KARTA/HOTOVOST řeš přes PROC_CREATE_PLATBA');

      WHEN 'HOTOVOST' THEN
        RAISE_APPLICATION_ERROR(-20050, 'PLATBA/KARTA/HOTOVOST řeš přes PROC_CREATE_PLATBA');

      WHEN 'NOTIFIKACE' THEN
        IF v_action = 'INS' THEN
          INSERT INTO Notifikace (ID_Notifikace, ID_Zprava, authToken, endPoint, p256dh, adresat)
          VALUES (
            json_value(p_payload, '$.ID_Notifikace' RETURNING NUMBER),
            json_value(p_payload, '$.ID_Zprava' RETURNING NUMBER),
            json_value(p_payload, '$.authToken'),
            json_value(p_payload, '$.endPoint'),
            json_value(p_payload, '$.p256dh'),
            json_value(p_payload, '$.adresat')
          );
          p_out_key1 := json_value(p_payload, '$.ID_Notifikace');
          p_out_key2 := json_value(p_payload, '$.ID_Zprava');
        ELSIF v_action = 'UPD' THEN
          UPDATE Notifikace
             SET authToken = json_value(p_payload, '$.authToken'),
                 endPoint = json_value(p_payload, '$.endPoint'),
                 p256dh = json_value(p_payload, '$.p256dh'),
                 adresat = json_value(p_payload, '$.adresat')
           WHERE ID_Notifikace = TO_NUMBER(v_k1)
             AND ID_Zprava = TO_NUMBER(v_k2);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
          p_out_key2 := v_k2;
        ELSE
          DELETE FROM Notifikace
           WHERE ID_Notifikace = TO_NUMBER(v_k1)
             AND ID_Zprava = TO_NUMBER(v_k2);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
          p_out_key2 := v_k2;
        END IF;

      WHEN 'ZPRAVA' THEN
        IF v_action = 'INS' THEN
          INSERT INTO ZPRAVA (zprava, datumZasilani, prijimac_ID, odesilatel_ID)
          VALUES (
            json_value(p_payload, '$.zprava'),
            TO_DATE(json_value(p_payload, '$.datumZasilani'), 'YYYY-MM-DD'),
            json_value(p_payload, '$.prijimac_ID' RETURNING NUMBER),
            json_value(p_payload, '$.odesilatel_ID' RETURNING NUMBER)
          ) RETURNING ID_Zprava INTO v_num;
          p_out_key1 := TO_CHAR(v_num);
        ELSIF v_action = 'UPD' THEN
          UPDATE ZPRAVA
             SET zprava = json_value(p_payload, '$.zprava'),
                 datumZasilani = TO_DATE(json_value(p_payload, '$.datumZasilani'), 'YYYY-MM-DD'),
                 prijimac_ID = json_value(p_payload, '$.prijimac_ID' RETURNING NUMBER),
                 odesilatel_ID = json_value(p_payload, '$.odesilatel_ID' RETURNING NUMBER)
           WHERE ID_Zprava = TO_NUMBER(v_k1);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        ELSE
          DELETE FROM ZPRAVA WHERE ID_Zprava = TO_NUMBER(v_k1);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        END IF;

      WHEN 'ARCHIV' THEN
        IF v_action = 'INS' THEN
          INSERT INTO ARCHIV (nazev, popis, parent_id)
          VALUES (
            json_value(p_payload, '$.nazev'),
            json_value(p_payload, '$.popis'),
            json_value(p_payload, '$.parent_id' RETURNING NUMBER)
          ) RETURNING ID_Archiv INTO v_num;
          p_out_key1 := TO_CHAR(v_num);
        ELSIF v_action = 'UPD' THEN
          UPDATE ARCHIV
             SET nazev = json_value(p_payload, '$.nazev'),
                 popis = json_value(p_payload, '$.popis'),
                 parent_id = json_value(p_payload, '$.parent_id' RETURNING NUMBER)
           WHERE ID_Archiv = TO_NUMBER(v_k1);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        ELSE
          DELETE FROM ARCHIV WHERE ID_Archiv = TO_NUMBER(v_k1);
          IF SQL%ROWCOUNT = 0 THEN RAISE NO_DATA_FOUND; END IF;
          p_out_key1 := v_k1;
        END IF;

      WHEN 'SOUBOR' THEN
        RAISE_APPLICATION_ERROR(-20020, 'SOUBOR není podporován touto procedurou (BLOB obsah řeš separátně).');

      WHEN 'LOG' THEN
        RAISE_APPLICATION_ERROR(-20021, 'LOG je read-only a nelze měnit touto procedurou.');

      ELSE
        RAISE_APPLICATION_ERROR(-20022, 'Nepovolená entita: ' || v_entity);
    END CASE;

    p_out_code := 0;
    p_out_msg := 'OK';
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      p_out_code := -20011;
      p_out_msg := 'Záznam nenalezen';
    WHEN OTHERS THEN
      p_out_code := SQLCODE;
      p_out_msg := SQLERRM;
  END edit;
END PKG_APP_CRUD;
/


BEGIN
    PROC_INIT_ARCHIV_SUPERMARKETU;
END;
/

--------------------------------------------------------------------------------
-- PROCEDURA: PROC_CHANGE_USER_ROLE
-- Popis:
--   Bezpečně změní roli uživatele a přesune/odstraní záznamy v tabulkách
--   DODAVATEL / ZAKAZNIK / ZAMESTNANEC podle nové role (zaměstnanec = role 4/5/6).
--------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE PROC_CHANGE_USER_ROLE(
    p_user_id        IN UZIVATEL.ID_Uzivatel%TYPE,
    p_new_role_id    IN APP_ROLE.ID_Role%TYPE,
    p_firma          IN DODAVATEL.firma%TYPE DEFAULT NULL,
    p_karta          IN ZAKAZNIK.kartaVernosti%TYPE DEFAULT NULL,
    p_mzda           IN ZAMESTNANEC.mzda%TYPE DEFAULT NULL,
    p_datum_nastupa  IN ZAMESTNANEC.datumNastupa%TYPE DEFAULT NULL,
    p_pozice         IN ZAMESTNANEC.pozice%TYPE DEFAULT NULL
)
AS
    c_role_dodavatel CONSTANT NUMBER := 2;
    c_role_zakaznik  CONSTANT NUMBER := 3;
    -- Zaměstnanecké role:
    c_role_zamestnanec_min CONSTANT NUMBER := 4;
    c_role_zamestnanec_max CONSTANT NUMBER := 6;

    v_old_role   APP_ROLE.ID_Role%TYPE;
    v_role_exist NUMBER;
    v_zbozi_cnt  NUMBER;
    v_is_old_emp BOOLEAN;
    v_is_new_emp BOOLEAN;
BEGIN
    --------------------------------------------------------------------
    -- Načti a zamkni uživatele
    --------------------------------------------------------------------
    SELECT ID_Role
    INTO v_old_role
    FROM UZIVATEL
    WHERE ID_Uzivatel = p_user_id
    FOR UPDATE;

    IF v_old_role = p_new_role_id THEN
        RETURN;
    END IF;

    --------------------------------------------------------------------
    -- Ověř platnost nové role
    --------------------------------------------------------------------
    SELECT 1 INTO v_role_exist FROM APP_ROLE WHERE ID_Role = p_new_role_id;

    v_is_old_emp := v_old_role BETWEEN c_role_zamestnanec_min AND c_role_zamestnanec_max;
    v_is_new_emp := p_new_role_id BETWEEN c_role_zamestnanec_min AND c_role_zamestnanec_max;

    --------------------------------------------------------------------
    -- Ověř závislosti 
    --------------------------------------------------------------------
    IF v_old_role = c_role_dodavatel THEN
        SELECT COUNT(*) INTO v_zbozi_cnt FROM ZBOZI_DODAVATEL WHERE ID_uzivatelu = p_user_id;
        IF v_zbozi_cnt > 0 THEN
            raise_application_error(-20001, 'Nelze změnit roli: dodavatel má přiřazené zboží (záznamy v ZBOZI_DODAVATEL).');
        END IF;
    END IF;

    --------------------------------------------------------------------
    -- Odstraň záznamy staré role
    --------------------------------------------------------------------
    IF v_old_role = c_role_dodavatel THEN
        DELETE FROM DODAVATEL WHERE ID_uzivatelu = p_user_id;
    ELSIF v_old_role = c_role_zakaznik THEN
        DELETE FROM ZAKAZNIK WHERE ID_uzivatelu = p_user_id;
    ELSIF v_is_old_emp THEN
        DELETE FROM ZAMESTNANEC WHERE ID_uzivatelu = p_user_id;
    END IF;

    --------------------------------------------------------------------
    -- Nastav novou roli na uživateli
    --------------------------------------------------------------------
    UPDATE UZIVATEL
    SET ID_Role = p_new_role_id
    WHERE ID_Uzivatel = p_user_id;

    --------------------------------------------------------------------
    -- Vytvoř záznam nové role
    --------------------------------------------------------------------
    IF p_new_role_id = c_role_dodavatel THEN
        IF p_firma IS NULL THEN
            raise_application_error(-20002, 'Parametr FIRMA je povinný pro roli dodavatel.');
        END IF;
        INSERT INTO DODAVATEL (ID_uzivatelu, firma)
        VALUES (p_user_id, p_firma);
    ELSIF p_new_role_id = c_role_zakaznik THEN
        INSERT INTO ZAKAZNIK (ID_uzivatelu, kartaVernosti)
        VALUES (p_user_id, p_karta);
    ELSIF v_is_new_emp THEN
        IF p_mzda IS NULL OR p_datum_nastupa IS NULL OR p_pozice IS NULL THEN
            raise_application_error(-20003, 'Parametry mzda, datum_nastupa a pozice jsou povinné pro zaměstnanecké role (4/5/6).');
        END IF;
        INSERT INTO ZAMESTNANEC (ID_uzivatelu, mzda, datumNastupa, pozice)
        VALUES (p_user_id, p_mzda, p_datum_nastupa, p_pozice);
    END IF;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        raise_application_error(-20004, 'Uživatel nebo role neexistuje.');
    WHEN DUP_VAL_ON_INDEX THEN
        raise_application_error(-20005, 'Narušení unikátního omezení při zakládání záznamu nové role.');
    WHEN OTHERS THEN
        RAISE;
END;
/

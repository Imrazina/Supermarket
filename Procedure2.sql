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
    p_pozice         IN ZAMESTNANEC.pozice%TYPE DEFAULT NULL,
    p_force          IN NUMBER DEFAULT 0  -- 1 = drop závislosti, jinak jen upozorni
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
    v_warn_msg   VARCHAR2(4000);
BEGIN
    --------------------------------------------------------------------
    -- Načti a zamkni uživatele
    --------------------------------------------------------------------
    SAVEPOINT sp_role_change;
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
    -- Ověř závislosti / vyčištění ZBOZI_DODAVATEL, pokud nová role není dodavatel
    --------------------------------------------------------------------
    IF p_new_role_id <> c_role_dodavatel THEN
        SELECT COUNT(*) INTO v_zbozi_cnt FROM ZBOZI_DODAVATEL WHERE ID_uzivatelu = p_user_id;
        IF v_zbozi_cnt > 0 THEN
            v_warn_msg := 'Dodavatel má přiřazené zboží (ZBOZI_DODAVATEL: ' || v_zbozi_cnt || ' záznamů).';
            IF p_force = 0 THEN
                raise_application_error(-20001, v_warn_msg || ' Nastav p_force=1 pro odstranění závislostí.');
            ELSE
                DELETE FROM ZBOZI_DODAVATEL WHERE ID_uzivatelu = p_user_id;
            END IF;
        END IF;
    END IF;

    --------------------------------------------------------------------
    -- Odstraň záznamy staré role
    --------------------------------------------------------------------
    IF p_new_role_id <> c_role_dodavatel THEN
        DELETE FROM DODAVATEL WHERE ID_uzivatelu = p_user_id;
        -- kontrola, že dodavatel i vazby zmizely
        SELECT COUNT(*) INTO v_zbozi_cnt FROM ZBOZI_DODAVATEL WHERE ID_uzivatelu = p_user_id;
        IF v_zbozi_cnt > 0 THEN
            raise_application_error(-20016, 'Nelze odstranit vazby dodavatele (zbozi_dodavatel zůstalo).');
        END IF;
        SELECT COUNT(*) INTO v_zbozi_cnt FROM DODAVATEL WHERE ID_uzivatelu = p_user_id;
        IF v_zbozi_cnt > 0 THEN
            raise_application_error(-20017, 'Nelze odstranit dodavatele (řádek v DODAVATEL zůstává).');
        END IF;
    END IF;
    IF p_new_role_id <> c_role_zakaznik THEN
        DELETE FROM ZAKAZNIK WHERE ID_uzivatelu = p_user_id;
    END IF;
    IF NOT (p_new_role_id BETWEEN c_role_zamestnanec_min AND c_role_zamestnanec_max) THEN
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
        ROLLBACK TO sp_role_change;
        raise_application_error(-20004, 'Uživatel nebo role neexistuje.');
    WHEN DUP_VAL_ON_INDEX THEN
        ROLLBACK TO sp_role_change;
        raise_application_error(-20005, 'Narušení unikátního omezení při zakládání záznamu nové role.');
    WHEN OTHERS THEN
        ROLLBACK TO sp_role_change;
        raise_application_error(
            -20099,
            'PROC_CHANGE_USER_ROLE failed (user_id=' || p_user_id ||
            ', new_role=' || p_new_role_id ||
            ', force=' || p_force || '): ' || SQLERRM
        );
END;
/

select sys_context('USERENV','SESSION_USER') as whoami from dual;
select argument_name, position
from user_arguments
where object_name = 'PROC_CHANGE_USER_ROLE'
order by position;

select text
from user_source
where name='PROC_CHANGE_USER_ROLE'
order by line;

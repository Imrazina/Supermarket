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


BEGIN
    PROC_INIT_ARCHIV_SUPERMARKETU;
END;
/


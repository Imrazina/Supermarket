--------------------------------------------------------------------------------
-- Měsíční reporty peněženek (UCET/POHYB_UCTU) do ARCHIV/REPORTS jako CSV.
-- Spouští se procedurou, případně plánovaným jobem 1× měsíčně.
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
-- Jednorázově zajistí složku REPORTS pod ROOT.
--------------------------------------------------------------------------------
DECLARE
    v_root    NUMBER;
    v_reports NUMBER;
BEGIN
    SELECT ID_ARCHIV INTO v_root FROM ARCHIV WHERE PARENT_ID IS NULL;

    BEGIN
        SELECT MIN(ID_ARCHIV) INTO v_reports
          FROM ARCHIV
         WHERE PARENT_ID = v_root
           AND NAZEV = 'Reporty Uctu';
        IF v_reports IS NULL THEN
            RAISE NO_DATA_FOUND;
        END IF;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            INSERT INTO ARCHIV (ID_ARCHIV, NAZEV, PARENT_ID)
            VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Reporty Uctu', v_root)
            RETURNING ID_ARCHIV INTO v_reports;
    END;
END;
/

--------------------------------------------------------------------------------
-- Procedura: vygeneruje CSV pro účty, které mají v období nějaký pohyb.
-- Parametry: pokud nejsou dodány, bere se předchozí měsíc.
--------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE proc_monthly_account_reports(
    p_year  IN NUMBER DEFAULT NULL,
    p_month IN NUMBER DEFAULT NULL
) AS
    v_start      DATE;
    v_end        DATE;
    v_reports    NUMBER;
    v_owner      NUMBER;
    v_file_id    NUMBER;
    v_csv        CLOB;
    v_blob       BLOB;
BEGIN
    -- perioda
    IF p_year IS NULL OR p_month IS NULL THEN
        v_start := TRUNC(ADD_MONTHS(SYSDATE, -1), 'MM');
    ELSE
        v_start := TRUNC(TO_DATE(p_year || LPAD(p_month, 2, '0'), 'YYYYMM'), 'MM');
    END IF;
    v_end := ADD_MONTHS(v_start, 1);

    -- složka REPORTS / Reporty Uctu pod ROOT
    BEGIN
        SELECT MIN(a.ID_ARCHIV)
          INTO v_reports
          FROM ARCHIV a
          JOIN (SELECT ID_ARCHIV FROM ARCHIV WHERE PARENT_ID IS NULL) r ON r.ID_ARCHIV = a.PARENT_ID
         WHERE a.NAZEV = 'Reporty Uctu';
        IF v_reports IS NULL THEN
            RAISE NO_DATA_FOUND;
        END IF;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            -- fallback: vytvoř REPORTS, pokud tam není ani jedno
            DECLARE
                v_root NUMBER;
            BEGIN
                SELECT ID_ARCHIV INTO v_root FROM ARCHIV WHERE PARENT_ID IS NULL;
                INSERT INTO ARCHIV (ID_ARCHIV, NAZEV, PARENT_ID)
                VALUES (SEQ_ARCHIV_ID.NEXTVAL, 'Reporty Uctu', v_root)
                RETURNING ID_ARCHIV INTO v_reports;
            END;
    END;

    -- vlastník souboru = první ADMIN
    SELECT MIN(u.ID_Uzivatel)
      INTO v_owner
      FROM UZIVATEL u
      JOIN APP_ROLE r ON r.ID_Role = u.ID_Role
     WHERE UPPER(r.NAZEV) = 'ADMIN';

    FOR acc IN (
        SELECT u.ID_Ucet, uz.EMAIL
          FROM UCET u
          JOIN UZIVATEL uz ON uz.ID_Uzivatel = u.ID_Uzivatel
         WHERE EXISTS (
               SELECT 1
                 FROM POHYB_UCTU p
                WHERE p.ID_Ucet = u.ID_Ucet
                  AND p.DATUM_VYTVORENI >= v_start
                  AND p.DATUM_VYTVORENI <  v_end
         )
    ) LOOP
        v_csv := 'datum;smer;metoda;castka;poznamka;objednavka;cislo_karty' || CHR(10);

        FOR m IN (
            SELECT TO_CHAR(DATUM_VYTVORENI, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS ts,
                   SMER, METODA, CASTKA, POZNAMKA,
                   NVL2(ID_Objednavka, 'PO-' || ID_Objednavka, '') AS objed,
                   CISLOKARTY
              FROM POHYB_UCTU
             WHERE ID_Ucet = acc.ID_Ucet
               AND DATUM_VYTVORENI >= v_start
               AND DATUM_VYTVORENI <  v_end
             ORDER BY DATUM_VYTVORENI
        ) LOOP
            v_csv := v_csv
                || m.ts || ';'
                || m.SMER || ';'
                || m.METODA || ';'
                || TO_CHAR(m.CASTKA, 'FM9999990D99') || ';'
                || NVL(REPLACE(m.POZNAMKA, ';', ' '), '') || ';'
                || m.objed || ';'
                || NVL(m.CISLOKARTY, '') || CHR(10);
        END LOOP;

        -- CLOB -> BLOB UTF8
        DBMS_LOB.CREATETEMPORARY(v_blob, TRUE);
        DBMS_LOB.WRITEAPPEND(
            v_blob,
            UTL_RAW.LENGTH(UTL_I18N.STRING_TO_RAW(v_csv, 'AL32UTF8')),
            UTL_I18N.STRING_TO_RAW(v_csv, 'AL32UTF8')
        );

        INSERT INTO SOUBOR (
            ID_SOUBOR, NAZEV, TYP, PRIPONA, OBSAH,
            DATUMNAHRANI, DATUMMODIFIKACE, POPIS,
            ID_UZIVATELU, ID_ARCHIV
        ) VALUES (
            SEQ_SOUBOR_ID.NEXTVAL,
            'report_ucet_' || acc.ID_Ucet || '_' || TO_CHAR(v_start, 'YYYYMM'),
            'text/csv',
            'csv',
            v_blob,
            SYSDATE,
            SYSDATE,
            'Mesicni report pohybu uctu ' || acc.EMAIL || ' za ' || TO_CHAR(v_start, 'YYYY-MM'),
            v_owner,
            v_reports
        )
        RETURNING ID_SOUBOR INTO v_file_id;

        DBMS_LOB.FREETEMPORARY(v_blob);
    END LOOP;
END;
/

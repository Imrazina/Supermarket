--------------------------------------------------------------------------------
-- FUNKCE: hodnoceni_zbozi
-- Popis:
--   Vrací rating zboží na základě jeho podílu na celkových prodejích.
--   Pokud je zboží pod minimálním množstvím, rating se navýší (HOT ITEM).
-- Parametry:
--   p_id_zbozi  - ID zboží
-- Návratová hodnota:
--   Číslo reprezentující procentuální rating zboží
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hodnoceni_zbozi(
    p_id_zbozi INTEGER
) RETURN NUMBER
IS
    v_prodeje_zbozi NUMBER := 0;
    v_prodeje_total NUMBER := 0;
    v_mnozstvi NUMBER := 0;
    v_min NUMBER := 0;
    rating NUMBER := 0;
BEGIN
    --------------------------------------------------------------------
    -- Získáme počet prodaných kusů tohoto zboží
    --------------------------------------------------------------------
    SELECT NVL(SUM(pocet), 0)
    INTO v_prodeje_zbozi
    FROM OBJEDNAVKA_ZBOZI
    WHERE ID_Zbozi = p_id_zbozi;

    --------------------------------------------------------------------
    -- Získáme celkové množství všech prodejů
    --------------------------------------------------------------------
    SELECT NVL(SUM(pocet), 0)
    INTO v_prodeje_total
    FROM OBJEDNAVKA_ZBOZI;

    IF v_prodeje_total = 0 THEN
        RETURN 0;
    END IF;

    --------------------------------------------------------------------
    -- Získáme skladová data pro dané zboží
    --------------------------------------------------------------------
    SELECT mnozstvi, minMnozstvi
    INTO v_mnozstvi, v_min
    FROM ZBOZI
    WHERE ID_Zbozi = p_id_zbozi;

    --------------------------------------------------------------------
    -- Výpočet základního ratingu podle podílu na prodejích
    --------------------------------------------------------------------
    rating := (v_prodeje_zbozi / v_prodeje_total) * 100;

    --------------------------------------------------------------------
    -- Pokud je zboží pod minimálním množstvím, označíme jej jako "HOT"
    --------------------------------------------------------------------
    IF v_mnozstvi < v_min THEN
        rating := rating + 10;
    END IF;

    RETURN ROUND(rating, 2);
END;
/


--------------------------------------------------------------------------------
-- FUNKCE: profil_kpi
-- Popis:
--   Vrátí JSON s rychlými KPI podle role uživatele (ADMIN/ZAMESTNANEC/ZAKAZNIK/DODAVATEL).
--   Využívá unread_messages a last_message_summary.
-- Parametry:
--   p_user - ID uživatele
-- Návratová hodnota:
--   CLOB JSON s poli: role, unread, lastMessage, metrics (dle role)
--------------------------------------------------------------------------------
-- profil_kpi odstraněno na požádání

--------------------------------------------------------------------------------
-- FUNKCE: unread_messages
-- Popis:
--   Počet "nepřečtených" zpráv: příchozí po poslední vlastní odeslané zprávě
--   (tabulka nemá flag přečteno, takže je to praktický aproximant).
-- Parametry:
--   p_user - ID příjemce
-- Návratová hodnota:
--   Číslo s počtem zpráv
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION unread_messages(
    p_user INTEGER
) RETURN NUMBER
IS
    v_last_sent DATE := DATE '1970-01-01';
    v_unread NUMBER := 0;
BEGIN
    --------------------------------------------------------------------
    -- Kdy uživatel naposledy sám psal (bereme to jako hranici přečtení)
    --------------------------------------------------------------------
    SELECT NVL(MAX(datumZasilani), DATE '1970-01-01')
    INTO v_last_sent
    FROM ZPRAVA
    WHERE odesilatel_ID = p_user;

    --------------------------------------------------------------------
    -- Příchozí zprávy po této hranici
    --------------------------------------------------------------------
    SELECT COUNT(*)
    INTO v_unread
    FROM ZPRAVA
    WHERE prijimac_ID = p_user
      AND datumZasilani > v_last_sent;

    RETURN v_unread;
END;
/


--------------------------------------------------------------------------------
-- FUNKCE: last_message_summary
-- Popis:
--   Vrátí poslední příchozí zprávu pro uživatele (odesílatel, čas, text).
-- Parametry:
--   p_user - ID příjemce
-- Návratová hodnota:
--   Řetězec s datem, ID odesílatele a zkráceným textem zprávy
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION last_message_summary(
    p_user INTEGER
) RETURN VARCHAR2
IS
    v_sender_name VARCHAR2(255);
    v_time DATE;
    v_text CLOB;
    v_out VARCHAR2(4000);
BEGIN
    SELECT COALESCE(
               TRIM(u.jmeno || ' ' || u.prijmeni),
               u.email,
               'ID ' || z.odesilatel_ID
           ),
           z.datumZasilani,
           z.zprava
    INTO v_sender_name, v_time, v_text
    FROM (
        SELECT odesilatel_ID, datumZasilani, zprava
        FROM ZPRAVA
        WHERE prijimac_ID = p_user
        ORDER BY datumZasilani DESC
    ) z
    LEFT JOIN UZIVATEL u ON u.ID_Uzivatel = z.odesilatel_ID
    WHERE ROWNUM = 1;

    v_out := TO_CHAR(v_time, 'YYYY-MM-DD HH24:MI') || ' | od ' || v_sender_name || ': ' || DBMS_LOB.SUBSTR(v_text, 200, 1);
    RETURN v_out;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 'Žádné zprávy';
END;
/



--------------------------------------------------------------------------------
-- FUNKCE: typ_zakaznika
-- Popis:
--   Na základě počtu objednávek vrací úroveň zákazníka:
--   Bronze, Silver, Gold nebo Platinum.
-- Parametry:
--   p_id_uziv - ID uživatele
-- Návratová hodnota:
--   Textový název úrovně zákazníka
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION typ_zakaznika(
    p_id_uziv INTEGER
) RETURN VARCHAR2
IS
    v_pocet NUMBER := 0;
BEGIN
    --------------------------------------------------------------------
    -- Získáme počet objednávek daného zákazníka
    --------------------------------------------------------------------
    SELECT COUNT(*)
    INTO v_pocet
    FROM OBJEDNAVKA
    WHERE ID_Uzivatel = p_id_uziv;

    --------------------------------------------------------------------
    -- Klasifikace zákazníka podle počtu objednávek
    --------------------------------------------------------------------
    IF v_pocet > 20 THEN
        RETURN 'Platinum';
    ELSIF v_pocet >= 5 THEN
        RETURN 'Gold';
    ELSIF v_pocet >= 2 THEN
        RETURN 'Silver';
    ELSE
        RETURN 'Bronze';
    END IF;
END;
/



--------------------------------------------------------------------------------
-- FUNKCE: trend_kategorie
-- Popis:
--   Porovnává prodeje za posledních 30 dní s předchozím obdobím.
--   Vrací slovní hodnocení trendu: HOT, RISING, STABLE, FALLING, DEAD.
-- Parametry:
--   p_id_kategorie - ID kategorie zboží
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trend_kategorie(
    p_id_kategorie INTEGER
) RETURN VARCHAR2
IS
    v_last30 NUMBER := 0;
    v_prev30 NUMBER := 0;
    trend NUMBER := 0;
BEGIN
    --------------------------------------------------------------------
    -- Prodeje za posledních 30 dní
    --------------------------------------------------------------------
    SELECT NVL(SUM(oz.pocet), 0)
    INTO v_last30
    FROM OBJEDNAVKA_ZBOZI oz
    JOIN ZBOZI z ON z.ID_Zbozi = oz.ID_Zbozi
    JOIN OBJEDNAVKA o ON o.ID_Objednavka = oz.ID_Objednavka
    WHERE z.ID_Kategorie = p_id_kategorie
      AND o.datum >= SYSDATE - 30;

    --------------------------------------------------------------------
    -- Prodeje za předchozích 30 dní
    --------------------------------------------------------------------
    SELECT NVL(SUM(oz.pocet), 0)
    INTO v_prev30
    FROM OBJEDNAVKA_ZBOZI oz
    JOIN ZBOZI z ON z.ID_Zbozi = oz.ID_Zbozi
    JOIN OBJEDNAVKA o ON o.ID_Objednavka = oz.ID_Objednavka
    WHERE z.ID_Kategorie = p_id_kategorie
      AND o.datum BETWEEN SYSDATE - 60 AND SYSDATE - 31;

    --------------------------------------------------------------------
    -- Pokud nejsou žádná data, jedná se o mrtvou kategorii
    --------------------------------------------------------------------
    IF v_last30 = 0 AND v_prev30 = 0 THEN
        RETURN 'DEAD';
    END IF;

    --------------------------------------------------------------------
    -- Výpočet růstu v procentech
    --------------------------------------------------------------------
    IF v_prev30 = 0 THEN
        trend := 100;
    ELSE
        trend := ((v_last30 - v_prev30) / v_prev30) * 100;
    END IF;

    --------------------------------------------------------------------
    -- Klasifikace podle hodnoty trendu
    --------------------------------------------------------------------
    IF trend >= 50 THEN
        RETURN 'HOT';
    ELSIF trend >= 10 THEN
        RETURN 'RISING';
    ELSIF trend > -10 THEN
        RETURN 'STABLE';
    ELSIF trend > -50 THEN
        RETURN 'FALLING';
    ELSE
        RETURN 'DEAD';
    END IF;
END;
/


--------------------------------------------------------------------------------
-- FUNKCE: vypocet_zisku_supermarketu
-- Popis:
--   Vypočítá čistý zisk supermarketu na základě tržeb a nákladů.
--   Náklady jsou modelovány podle typu kategorie zboží.
-- Parametry:
--   p_id_supermarket - ID supermarketu
-- Návratová hodnota:
--   Číslo reprezentující čistý zisk
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION vypocet_zisku_supermarketu(
    p_id_supermarket INTEGER
) RETURN NUMBER
IS
    v_prijem NUMBER := 0;
    v_naklady NUMBER := 0;
BEGIN
    --------------------------------------------------------------------
    -- Výpočet příjmů z prodejů
    --------------------------------------------------------------------
    SELECT NVL(SUM(z.cena * oz.pocet), 0)
    INTO v_prijem
    FROM OBJEDNAVKA_ZBOZI oz
    JOIN OBJEDNAVKA o ON o.ID_Objednavka = oz.ID_Objednavka
    JOIN ZBOZI z ON z.ID_Zbozi = oz.ID_Zbozi
    WHERE o.ID_Supermarket = p_id_supermarket;

    --------------------------------------------------------------------
    -- Výpočet nákladů podle kategorie zboží
    --------------------------------------------------------------------
    SELECT NVL(SUM(
        CASE
            WHEN k.nazev LIKE '%maso%' OR k.nazev LIKE '%chlaz%' 
                THEN (z.cena * 0.5 + z.mnozstvi * 0.3)
            WHEN k.nazev LIKE '%napoj%' OR k.nazev LIKE '%voda%' 
                THEN (z.cena * 0.3 + z.mnozstvi * 0.2)
            ELSE (z.cena * 0.2 + z.mnozstvi * 0.1)
        END
    ), 0)
    INTO v_naklady
    FROM ZBOZI z
    JOIN Kategorie_zbozi k ON k.ID_Kategorie = z.ID_Kategorie
    JOIN SKLAD s ON s.ID_Sklad = z.SKLAD_ID_Sklad
    WHERE s.ID_Supermarket = p_id_supermarket;

    RETURN ROUND(v_prijem - v_naklady, 2);
END;
/

--------------------------------------------------------------------------------
-- FUNKCE: riziko_skladu
-- Popis:
--   Vyhodnotí rizikovost skladu na základě podílu položek,
--   které mají nižší množství než minMnozstvi.
-- Parametry:
--   p_id_sklad - ID skladu
-- Návratová hodnota:
--   Text popisující úroveň rizika
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION riziko_skladu(
    p_id_sklad INTEGER
) RETURN VARCHAR2
IS
    v_total NUMBER := 0;
    v_low NUMBER := 0;
    ratio NUMBER := 0;
BEGIN
    --------------------------------------------------------------------
    -- Celkový počet položek ve skladu
    --------------------------------------------------------------------
    SELECT COUNT(*) INTO v_total
    FROM ZBOZI
    WHERE SKLAD_ID_Sklad = p_id_sklad;

    IF v_total = 0 THEN
        RETURN 'CRITICAL';
    END IF;

    --------------------------------------------------------------------
    -- Počet položek pod minimálním množstvím
    --------------------------------------------------------------------
    SELECT COUNT(*)
    INTO v_low
    FROM ZBOZI
    WHERE SKLAD_ID_Sklad = p_id_sklad
      AND mnozstvi < minMnozstvi;

    ratio := (v_low / v_total) * 100;

    --------------------------------------------------------------------
    -- Klasifikace rizikovosti
    --------------------------------------------------------------------
    IF ratio >= 20 THEN
        RETURN 'CRITICAL';
    ELSIF ratio >= 10 THEN
        RETURN 'HIGH RISK';
    ELSIF ratio >= 5 THEN
        RETURN 'MEDIUM RISK';
    ELSE
        RETURN 'LOW RISK';
    END IF;
END;
/

--------------------------------------------------------------------------------
-- Balíček pro platby a pohyby na účtu.
-- Obsahuje tvorbu platby (hotovost/karta/účet), evidenci pohybu a doplnění
-- pomocných tabulek HOTOVOST/KARTA.
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_platba AS
  -- Vytvoří platbu a případně pohyb na účtu (typ U). Vrací ID platby a ID pohybu.
  -- p_typ: H=hotovost, K=karta, U=účet (odečet z účtu).
  PROCEDURE create_platba(
    p_objednavka_id IN NUMBER,
    p_castka        IN NUMBER,
    p_typ           IN VARCHAR2,
    p_ucet_id       IN NUMBER DEFAULT NULL,
    p_cislo_karty   IN VARCHAR2 DEFAULT NULL,
    p_prijato       IN NUMBER DEFAULT NULL,
    p_vraceno       IN NUMBER DEFAULT NULL,
    p_pohyb_id      OUT NUMBER,
    p_platba_id     OUT NUMBER
  );
  -- Vrátí seznam plateb, volitelně filtrovaný dle typu (H/K/U); NULL = všechny.
  PROCEDURE list_platby(p_typ IN VARCHAR2, p_cursor OUT SYS_REFCURSOR);
  -- Vrátí seznam podporovaných typů plateb (kód + popis).
  PROCEDURE list_typy(p_cursor OUT SYS_REFCURSOR);
END pkg_platba;
/

CREATE OR REPLACE PACKAGE BODY pkg_platba AS

  -- Interní pomocná procedura pro zápis pohybu na účtu a úpravu zůstatku.
  PROCEDURE add_pohyb(
    p_ucet_id   IN NUMBER,
    p_smer      IN CHAR,
    p_metoda    IN VARCHAR2,
    p_castka    IN NUMBER,
    p_poznamka  IN VARCHAR2,
    p_obj_id    IN NUMBER,
    p_cislo     IN VARCHAR2,
    p_pohyb_id  OUT NUMBER
  ) IS
    v_delta NUMBER;
  BEGIN
    IF p_smer NOT IN ('P','D') THEN
      RAISE_APPLICATION_ERROR(-20091, 'Neplatný směr pohybu.');
    END IF;
    IF p_castka IS NULL OR p_castka <= 0 THEN
      RAISE_APPLICATION_ERROR(-20092, 'Castka musí být kladná.');
    END IF;

    v_delta := CASE WHEN p_smer = 'P' THEN p_castka ELSE -p_castka END;

    INSERT INTO POHYB_UCTU (ID_POHYB, ID_UCET, SMER, METODA, CASTKA, POZNAMKA, ID_OBJEDNAVKA, CISLOKARTY)
    VALUES (SEQ_POHYB_UCTU_ID.NEXTVAL, p_ucet_id, p_smer, p_metoda, p_castka, p_poznamka, p_obj_id, p_cislo)
    RETURNING ID_POHYB INTO p_pohyb_id;

    UPDATE UCET
       SET ZUSTATEK = NVL(ZUSTATEK,0) + v_delta
     WHERE ID_UCET = p_ucet_id;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20093, 'Účet nebyl nalezen.');
    END IF;
  END add_pohyb;

  PROCEDURE upsert_hotovost(p_platba_id IN NUMBER, p_prijato IN NUMBER, p_vraceno IN NUMBER) IS
  BEGIN
    UPDATE HOTOVOST SET PRIJATO = p_prijato, VRACENO = p_vraceno WHERE ID_PLATBA = p_platba_id;
    IF SQL%ROWCOUNT = 0 THEN
      INSERT INTO HOTOVOST(ID_PLATBA, PRIJATO, VRACENO) VALUES (p_platba_id, p_prijato, p_vraceno);
    END IF;
  END;

  PROCEDURE upsert_karta(p_platba_id IN NUMBER, p_cislo_karty IN VARCHAR2) IS
  BEGIN
    UPDATE KARTA SET CISLOKARTY = p_cislo_karty WHERE ID_PLATBA = p_platba_id;
    IF SQL%ROWCOUNT = 0 THEN
      INSERT INTO KARTA(ID_PLATBA, CISLOKARTY) VALUES (p_platba_id, p_cislo_karty);
    END IF;
  END;

  PROCEDURE create_platba(
    p_objednavka_id IN NUMBER,
    p_castka        IN NUMBER,
    p_typ           IN VARCHAR2,
    p_ucet_id       IN NUMBER,
    p_cislo_karty   IN VARCHAR2,
    p_prijato       IN NUMBER,
    p_vraceno       IN NUMBER,
    p_pohyb_id      OUT NUMBER,
    p_platba_id     OUT NUMBER
  ) IS
    v_typ VARCHAR2(1);
  BEGIN
    v_typ := UPPER(SUBSTR(p_typ, 1, 1));
    IF v_typ NOT IN ('H','K','U') THEN
      RAISE_APPLICATION_ERROR(-20090, 'Neplatný typ platby (H/K/U).');
    END IF;

    INSERT INTO PLATBA(ID_PLATBA, CASTKA, DATUM, ID_OBJEDNAVKA, PLATBATYP, ID_POHYB_UCTU)
    VALUES (SEQ_PLATBA_ID.NEXTVAL, p_castka, SYSDATE, p_objednavka_id, v_typ, NULL)
    RETURNING ID_PLATBA INTO p_platba_id;

    p_pohyb_id := NULL;

    IF v_typ = 'U' THEN
      IF p_ucet_id IS NULL THEN
        RAISE_APPLICATION_ERROR(-20094, 'Pro typ U je nutné předat ID účtu.');
      END IF;
      add_pohyb(
        p_ucet_id   => p_ucet_id,
        p_smer      => 'D',
        p_metoda    => 'OBJEDNAVKA',
        p_castka    => p_castka,
        p_poznamka  => 'Objednavka ' || p_objednavka_id,
        p_obj_id    => p_objednavka_id,
        p_cislo     => p_cislo_karty,
        p_pohyb_id  => p_pohyb_id
      );
      UPDATE PLATBA SET ID_POHYB_UCTU = p_pohyb_id WHERE ID_PLATBA = p_platba_id;
    ELSIF v_typ = 'H' THEN
      upsert_hotovost(p_platba_id, p_prijato, p_vraceno);
    ELSIF v_typ = 'K' THEN
      upsert_karta(p_platba_id, p_cislo_karty);
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END create_platba;

  PROCEDURE list_platby(p_typ IN VARCHAR2, p_cursor OUT SYS_REFCURSOR) IS
    v_typ VARCHAR2(1) := CASE WHEN p_typ IS NULL THEN NULL ELSE UPPER(SUBSTR(p_typ,1,1)) END;
  BEGIN
    OPEN p_cursor FOR
      SELECT p.ID_PLATBA      AS id,
             p.CASTKA         AS castka,
             p.DATUM          AS datum,
             p.ID_OBJEDNAVKA  AS objednavka_id,
             p.PLATBATYP      AS platba_typ,
             p.ID_POHYB_UCTU  AS pohyb_id,
             h.PRIJATO        AS hotovost_prijato,
             h.VRACENO        AS hotovost_vraceno,
             k.CISLOKARTY     AS cislo_karty
        FROM PLATBA p
        LEFT JOIN HOTOVOST h ON h.ID_PLATBA = p.ID_PLATBA
        LEFT JOIN KARTA k ON k.ID_PLATBA = p.ID_PLATBA
       WHERE v_typ IS NULL OR p.PLATBATYP = v_typ
    ORDER BY p.DATUM DESC, p.ID_PLATBA DESC;
  END list_platby;

  PROCEDURE list_typy(p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT kód,
             CASE kód
               WHEN 'H' THEN 'Hotově'
               WHEN 'K' THEN 'Karta'
               WHEN 'U' THEN 'Účet'
               ELSE kód
             END AS popis
        FROM (SELECT 'H' AS kód FROM dual
              UNION ALL SELECT 'K' FROM dual
              UNION ALL SELECT 'U' FROM dual);
  END list_typy;

END pkg_platba;
/

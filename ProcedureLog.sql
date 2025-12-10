--------------------------------------------------------------------------------
-- Balíček pro LOG – čtení a zápis auditních záznamů.
-- Všechny výpisy vracejí i cestu v archivu.
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_log AS
  -- Nejnovější záznamy s cestou archivu (omezeno na p_limit, default 50).
  PROCEDURE list_recent(p_limit IN NUMBER DEFAULT 50, p_cursor OUT SYS_REFCURSOR);
  -- Filtrovaný výpis podle archivu, tabulky a operace (omezeno na p_limit, max 500).
  PROCEDURE list_filtered(
    p_archiv_id IN NUMBER,
    p_table     IN VARCHAR2,
    p_op        IN VARCHAR2,
    p_limit     IN NUMBER DEFAULT 100,
    p_cursor    OUT SYS_REFCURSOR
  );
  -- Detail logu podle ID.
  PROCEDURE get_log(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  -- Vloží nebo aktualizuje záznam logu; při vložení doplní ID ze sekvence.
  PROCEDURE upsert_log(
    p_id         IN OUT NUMBER,
    p_tabulka    IN VARCHAR2,
    p_operace    IN VARCHAR2,
    p_staradata  IN CLOB,
    p_novadata   IN CLOB,
    p_datum      IN DATE DEFAULT SYSDATE,
    p_id_rekord  IN VARCHAR2,
    p_popis      IN CLOB,
    p_archiv_id  IN NUMBER
  );
  -- Smazání záznamu logu (chyba, pokud neexistuje).
  PROCEDURE delete_log(p_id IN NUMBER);
END pkg_log;
/

CREATE OR REPLACE PACKAGE BODY pkg_log AS

  PROCEDURE list_recent(p_limit IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    v_limit NUMBER := LEAST(GREATEST(NVL(p_limit, 50), 1), 500);
  BEGIN
    OPEN p_cursor FOR
      SELECT *
        FROM (
          SELECT q.*, ROW_NUMBER() OVER (ORDER BY datumZmeny DESC, idLog DESC) AS rn
            FROM (
              WITH cesta AS (
                SELECT id_archiv,
                       SYS_CONNECT_BY_PATH(nazev, '/') AS path_full
                  FROM ARCHIV
                 START WITH parent_id IS NULL
               CONNECT BY PRIOR id_archiv = parent_id
              )
              SELECT l.ID_LOG          AS idLog,
                     l.TABULKANAZEV    AS tableName,
                     l.OPERACE         AS operation,
                     l.DATUMZMENY      AS datumZmeny,
                     CAST(l.POPIS AS VARCHAR2(4000)) AS popis,
                     DBMS_LOB.SUBSTR(l.NOVADATA, 4000, 1) AS novaData,
                     DBMS_LOB.SUBSTR(l.STARADATA, 4000, 1) AS staraData,
                     l.IDREKORD        AS idRekord,
                     COALESCE(c.path_full, a.NAZEV) AS archivPath,
                     l.ID_ARCHIV       AS archivId
                FROM LOG l
                JOIN ARCHIV a ON a.ID_ARCHIV = l.ID_ARCHIV
                LEFT JOIN cesta c ON c.id_archiv = l.ID_ARCHIV
            ) q
        )
       WHERE rn <= v_limit;
  END list_recent;

  PROCEDURE list_filtered(
    p_archiv_id IN NUMBER,
    p_table     IN VARCHAR2,
    p_op        IN VARCHAR2,
    p_limit     IN NUMBER,
    p_cursor    OUT SYS_REFCURSOR
  ) IS
    v_limit NUMBER := LEAST(GREATEST(NVL(p_limit, 100), 1), 500);
  BEGIN
    OPEN p_cursor FOR
      SELECT *
        FROM (
          SELECT q.*, ROW_NUMBER() OVER (ORDER BY datumZmeny DESC, idLog DESC) AS rn
            FROM (
              WITH cesta AS (
                SELECT id_archiv,
                       SYS_CONNECT_BY_PATH(nazev, '/') AS path_full
                  FROM ARCHIV
                 START WITH parent_id IS NULL
               CONNECT BY PRIOR id_archiv = parent_id
              )
              SELECT l.ID_LOG          AS idLog,
                     l.TABULKANAZEV    AS tableName,
                     l.OPERACE         AS operation,
                     l.DATUMZMENY      AS datumZmeny,
                     CAST(l.POPIS AS VARCHAR2(4000)) AS popis,
                     DBMS_LOB.SUBSTR(l.NOVADATA, 4000, 1) AS novaData,
                     DBMS_LOB.SUBSTR(l.STARADATA, 4000, 1) AS staraData,
                     l.IDREKORD        AS idRekord,
                     COALESCE(c.path_full, a.NAZEV) AS archivPath,
                     l.ID_ARCHIV       AS archivId
                FROM LOG l
                JOIN ARCHIV a ON a.ID_ARCHIV = l.ID_ARCHIV
                LEFT JOIN cesta c ON c.id_archiv = l.ID_ARCHIV
               WHERE (p_archiv_id IS NULL OR l.ID_ARCHIV = p_archiv_id)
                 AND (p_table IS NULL OR l.TABULKANAZEV = p_table)
                 AND (p_op IS NULL OR l.OPERACE = p_op)
            ) q
        )
       WHERE rn <= v_limit;
  END list_filtered;

  PROCEDURE get_log(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_cursor FOR
      SELECT l.ID_LOG,
             l.TABULKANAZEV,
             l.OPERACE,
             l.STARADATA,
             l.NOVADATA,
             l.DATUMZMENY,
             l.IDREKORD,
             l.POPIS,
             l.ID_ARCHIV
        FROM LOG l
       WHERE l.ID_LOG = p_id;
  END get_log;

  PROCEDURE upsert_log(
    p_id         IN OUT NUMBER,
    p_tabulka    IN VARCHAR2,
    p_operace    IN VARCHAR2,
    p_staradata  IN CLOB,
    p_novadata   IN CLOB,
    p_datum      IN DATE,
    p_id_rekord  IN VARCHAR2,
    p_popis      IN CLOB,
    p_archiv_id  IN NUMBER
  ) IS
  BEGIN
    IF p_id IS NULL THEN
      SELECT SEQ_LOG_ID.NEXTVAL INTO p_id FROM dual;
      INSERT INTO LOG (ID_LOG, TABULKANAZEV, OPERACE, STARADATA, NOVADATA, DATUMZMENY, IDREKORD, POPIS, ID_ARCHIV)
      VALUES (p_id, p_tabulka, p_operace, p_staradata, p_novadata, NVL(p_datum, SYSDATE), p_id_rekord, p_popis, p_archiv_id);
    ELSE
      UPDATE LOG
         SET TABULKANAZEV = p_tabulka,
             OPERACE      = p_operace,
             STARADATA    = p_staradata,
             NOVADATA     = p_novadata,
             DATUMZMENY   = NVL(p_datum, SYSDATE),
             IDREKORD     = p_id_rekord,
             POPIS        = p_popis,
             ID_ARCHIV    = p_archiv_id
       WHERE ID_LOG = p_id;
      IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20097, 'Log nebyl nalezen');
      END IF;
    END IF;
  END upsert_log;

  PROCEDURE delete_log(p_id IN NUMBER) IS
  BEGIN
    DELETE FROM LOG WHERE ID_LOG = p_id;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20098, 'Log nebyl nalezen');
    END IF;
  END delete_log;

END pkg_log;
/

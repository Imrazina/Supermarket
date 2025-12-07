--------------------------------------------------------
--  File created - воскресенье-декабря-07-2025   
--------------------------------------------------------
--------------------------------------------------------
--  DDL for Package PKG_ZBOZI_DODAVATEL
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE PACKAGE "ST72855"."PKG_ZBOZI_DODAVATEL" AS
  PROCEDURE list_by_zbozi(p_zbozi_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE list_by_dodavatel(p_dod_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE add_rel(p_zbozi_id IN NUMBER, p_dod_id IN NUMBER);
  PROCEDURE delete_rel(p_zbozi_id IN NUMBER, p_dod_id IN NUMBER);
END pkg_zbozi_dodavatel;

/
--------------------------------------------------------
--  DDL for Package PKG_AUTH
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE PACKAGE "ST72855"."PKG_AUTH" AS
  FUNCTION email_exists(p_email IN VARCHAR2) RETURN NUMBER;
  FUNCTION phone_exists(p_phone IN VARCHAR2) RETURN NUMBER;
END pkg_auth;

/
--------------------------------------------------------
--  DDL for Package PKG_STATUS
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE PACKAGE "ST72855"."PKG_STATUS" AS
  PROCEDURE list_status(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_status(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
END pkg_status;

/
--------------------------------------------------------
--  DDL for Package PKG_LOCATION
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE PACKAGE "ST72855"."PKG_LOCATION" AS
  PROCEDURE mesto_list(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE mesto_get(p_psc IN VARCHAR2, p_cursor OUT SYS_REFCURSOR);

  PROCEDURE adresa_get(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE adresa_save(
    p_id     IN NUMBER,
    p_ulice  IN VARCHAR2,
    p_cpop   IN VARCHAR2,
    p_corient IN VARCHAR2,
    p_psc    IN VARCHAR2,
    p_out_id OUT NUMBER
  );
  PROCEDURE adresa_delete(p_id IN NUMBER);
END pkg_location;

/
--------------------------------------------------------
--  DDL for Package PKG_ROLE
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE PACKAGE "ST72855"."PKG_ROLE" AS
  PROCEDURE list_roles(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_by_id(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_by_name(p_name IN VARCHAR2, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE save_role(p_id IN NUMBER, p_name IN VARCHAR2, p_out_id OUT NUMBER);
  PROCEDURE delete_role(p_id IN NUMBER);
END pkg_role;

/
--------------------------------------------------------
--  DDL for Package PKG_ZBOZI
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE PACKAGE "ST72855"."PKG_ZBOZI" AS
  PROCEDURE list_zbozi(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_zbozi(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  -- Úprava množství o delta (kladné i záporné), vyhodí chybu pokud záznam neexistuje.
  PROCEDURE update_mnozstvi(p_id IN NUMBER, p_delta IN NUMBER);
  PROCEDURE save_zbozi(
    p_id            IN NUMBER,
    p_nazev         IN VARCHAR2,
    p_popis         IN VARCHAR2,
    p_cena          IN NUMBER,
    p_mnozstvi      IN NUMBER,
    p_minmnozstvi   IN NUMBER,
    p_id_kategorie  IN NUMBER,
    p_id_sklad      IN NUMBER,
    p_out_id        OUT NUMBER
  );
  PROCEDURE delete_zbozi(p_id IN NUMBER);
END pkg_zbozi;

/
--------------------------------------------------------
--  DDL for Package PKG_SUPERMARKET
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE PACKAGE "ST72855"."PKG_SUPERMARKET" AS
  PROCEDURE list_supermarket(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_supermarket(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE save_supermarket(p_id IN NUMBER, p_nazev IN VARCHAR2, p_telefon IN VARCHAR2, p_email IN VARCHAR2, p_id_adresa IN NUMBER, p_out_id OUT NUMBER);
  PROCEDURE delete_supermarket(p_id IN NUMBER);
END pkg_supermarket;

/
--------------------------------------------------------
--  DDL for Package PKG_USER
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE PACKAGE "ST72855"."PKG_USER" AS
  PROCEDURE get_by_email(p_email IN VARCHAR2, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_by_id(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE list_all(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_by_phone(p_phone IN VARCHAR2, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_by_role(p_role IN VARCHAR2, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE email_used(p_email IN VARCHAR2, p_self_id IN NUMBER, p_used OUT NUMBER);
  PROCEDURE phone_used(p_phone IN VARCHAR2, p_self_id IN NUMBER, p_used OUT NUMBER);
  PROCEDURE create_user(
    p_jmeno    IN VARCHAR2,
    p_prijmeni IN VARCHAR2,
    p_email    IN VARCHAR2,
    p_heslo    IN VARCHAR2,
    p_phone    IN VARCHAR2,
    p_role_id  IN NUMBER,
    p_id       OUT NUMBER
  );
  PROCEDURE update_core(
    p_id       IN NUMBER,
    p_jmeno    IN VARCHAR2,
    p_prijmeni IN VARCHAR2,
    p_email    IN VARCHAR2,
    p_heslo    IN VARCHAR2,
    p_phone    IN VARCHAR2,
    p_role_id  IN NUMBER
  );
  PROCEDURE delete_user(p_id IN NUMBER);
END pkg_user;

/
--------------------------------------------------------
--  DDL for Package PKG_OBJEDNAVKA_ZBOZI
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE PACKAGE "ST72855"."PKG_OBJEDNAVKA_ZBOZI" AS
  PROCEDURE list_by_objednavka(p_obj_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE add_item(p_obj_id IN NUMBER, p_zbozi_id IN NUMBER, p_pocet IN NUMBER);
  PROCEDURE update_item(p_obj_id IN NUMBER, p_zbozi_id IN NUMBER, p_pocet IN NUMBER);
  PROCEDURE delete_item(p_obj_id IN NUMBER, p_zbozi_id IN NUMBER);
END pkg_objednavka_zbozi;

/
--------------------------------------------------------
--  DDL for Package PKG_PERSON
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE PACKAGE "ST72855"."PKG_PERSON" AS
  -- Zamestnanec
  PROCEDURE employee_get(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE employee_list(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE employee_positions(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE employee_save(
    p_id     IN NUMBER,
    p_mzda   IN NUMBER,
    p_datum  IN DATE,
    p_pozice IN VARCHAR2
  );
  PROCEDURE employee_delete(p_id IN NUMBER);

  -- Zakaznik
  PROCEDURE customer_get(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE customer_list(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE customer_save(p_id IN NUMBER, p_karta IN VARCHAR2);
  PROCEDURE customer_delete(p_id IN NUMBER);

  -- Dodavatel
  PROCEDURE supplier_get(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE supplier_list(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE supplier_save(p_id IN NUMBER, p_firma IN VARCHAR2);
  PROCEDURE supplier_delete(p_id IN NUMBER);
END pkg_person;

/
--------------------------------------------------------
--  DDL for Package PKG_PLATBA
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE PACKAGE "ST72855"."PKG_PLATBA" AS
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
--------------------------------------------------------
--  DDL for Package PKG_OBJEDNAVKA
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE PACKAGE "ST72855"."PKG_OBJEDNAVKA" AS
  PROCEDURE list_objednavky(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE list_by_user(p_user_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_objednavka(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE save_objednavka(
    p_id            IN NUMBER,
    p_datum         IN DATE,
    p_status_id     IN NUMBER,
    p_user_id       IN NUMBER,
    p_supermarket_id IN NUMBER,
    p_poznamka      IN CLOB,
    p_typ           IN VARCHAR2,
    p_out_id        OUT NUMBER
  );
  PROCEDURE delete_objednavka(p_id IN NUMBER);
END pkg_objednavka;

/
--------------------------------------------------------
--  DDL for Package PKG_ARCHIVE
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE PACKAGE "ST72855"."PKG_ARCHIVE" AS
  PROCEDURE get_tree(p_cursor OUT SYS_REFCURSOR);

  PROCEDURE get_files(
    p_archive_id IN NUMBER,
    p_q          IN VARCHAR2,
    p_size       IN NUMBER,
    p_cursor     OUT SYS_REFCURSOR
  );

  PROCEDURE get_file_data(
    p_file_id IN NUMBER,
    p_name    OUT VARCHAR2,
    p_ext     OUT VARCHAR2,
    p_type    OUT VARCHAR2,
    p_blob    OUT BLOB
  );

  PROCEDURE save_file(
    p_archive_id  IN NUMBER,
    p_owner_email IN VARCHAR2,
    p_filename    IN VARCHAR2,
    p_mime        IN VARCHAR2,
    p_blob        IN BLOB,
    p_new_id      OUT NUMBER
  );

  PROCEDURE update_file_data(
    p_file_id IN NUMBER,
    p_blob    IN BLOB
  );

  PROCEDURE update_file_descr(
    p_file_id IN NUMBER,
    p_descr   IN VARCHAR2
  );

  PROCEDURE delete_file(p_file_id IN NUMBER);
END pkg_archive;

/
--------------------------------------------------------
--  DDL for Package PKG_SKLAD
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE PACKAGE "ST72855"."PKG_SKLAD" AS
  PROCEDURE list_sklady(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_sklad(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE save_sklad(
    p_id            IN NUMBER,
    p_nazev         IN VARCHAR2,
    p_kapacita      IN NUMBER,
    p_telefon       IN VARCHAR2,
    p_id_supermarket IN NUMBER,
    p_out_id        OUT NUMBER
  );
  PROCEDURE delete_sklad(p_id IN NUMBER);
END pkg_sklad;

/
--------------------------------------------------------
--  DDL for Package PKG_KATEGORIE
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE PACKAGE "ST72855"."PKG_KATEGORIE" AS
  PROCEDURE list_kategorie(p_cursor OUT SYS_REFCURSOR);
  PROCEDURE get_kategorie(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
  PROCEDURE save_kategorie(p_id IN NUMBER, p_nazev IN VARCHAR2, p_popis IN VARCHAR2, p_out_id OUT NUMBER);
  PROCEDURE delete_kategorie(p_id IN NUMBER);
END pkg_kategorie;

/

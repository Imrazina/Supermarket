------------------------------------------------------------
-- 1) APP_ROLE
------------------------------------------------------------
INSERT INTO APP_ROLE (nazev) VALUES ('ADMIN');
INSERT INTO APP_ROLE (nazev) VALUES ('DODAVATEL');
INSERT INTO APP_ROLE (nazev) VALUES ('ZAKAZNIK');
INSERT INTO APP_ROLE (nazev) VALUES ('MANAZER');
INSERT INTO APP_ROLE (nazev) VALUES ('ANALYTIK');
INSERT INTO APP_ROLE (nazev) VALUES ('SUPERVIZOR');

------------------------------------------------------------
-- 2) PRAVO 
------------------------------------------------------------
INSERT INTO PRAVO (nazev, kod, popis) 
VALUES ('Просмотр товаров', 'VIEW_PRODUCTS', 'Umožňuje zobrazit zboží.');

INSERT INTO PRAVO (nazev, kod, popis) 
VALUES ('Úprava zboží', 'EDIT_PRODUCTS', 'Umožňuje upravit ceny, množství a popisy.');

INSERT INTO PRAVO (nazev, kod, popis) 
VALUES ('Zobrazení objednávek', 'VIEW_ORDERS', 'Umožňuje zobrazit objednávky.');

INSERT INTO PRAVO (nazev, kod, popis) 
VALUES ('Úprava objednávek', 'EDIT_ORDERS', 'Umožňuje měnit stav a položky objednávek.');

INSERT INTO PRAVO (nazev, kod, popis) 
VALUES ('Vytvoření objednávky', 'CREATE_ORDERS', 'Umožňuje zákazníkům vytvářet objednávky.');

INSERT INTO PRAVO (nazev, kod, popis) 
VALUES ('Zobrazení skladů', 'VIEW_WAREHOUSE', 'Umožňuje prohlížet sklady, zásoby a množství.');

INSERT INTO PRAVO (nazev, kod, popis) 
VALUES ('Zobrazení archivu', 'VIEW_ARCHIVE', 'Umožňuje přístup k archivům.');

INSERT INTO PRAVO (nazev, kod, popis) 
VALUES ('Správa uživatelů', 'MANAGE_USERS', 'Umožňuje spravovat uživatelské účty.');

INSERT INTO PRAVO (nazev, kod, popis) 
VALUES ('Správa dodavatelů', 'MANAGE_SUPPLIERS', 'Umožňuje spravovat dodavatele a jejich údaje.');

INSERT INTO PRAVO (nazev, kod, popis) 
VALUES ('Plná administrace', 'FULL_ADMIN', 'Plné oprávnění ke všem funkcím systému.');


------------------------------------------------------------
-- 3) APP_ROLE_PRAVO 
------------------------------------------------------------
-- ADMIN 
INSERT INTO APP_ROLE_PRAVO SELECT p.ID_Pravo, r.ID_Role
FROM PRAVO p, APP_ROLE r
WHERE r.nazev = 'ADMIN';

-- DODAVATEL 
INSERT INTO APP_ROLE_PRAVO 
SELECT p.ID_Pravo, r.ID_Role
FROM PRAVO p
JOIN APP_ROLE r ON r.nazev = 'DODAVATEL'
WHERE p.kod IN ('VIEW_PRODUCTS', 'VIEW_WAREHOUSE', 'MANAGE_SUPPLIERS');

-- ZAKAZNIK
INSERT INTO APP_ROLE_PRAVO 
SELECT p.ID_Pravo, r.ID_Role
FROM PRAVO p
JOIN APP_ROLE r ON r.nazev = 'ZAKAZNIK'
WHERE p.kod IN ('VIEW_PRODUCTS', 'CREATE_ORDERS', 'VIEW_ORDERS');

-- MANAZER
INSERT INTO APP_ROLE_PRAVO 
SELECT p.ID_Pravo, r.ID_Role
FROM PRAVO p
JOIN APP_ROLE r ON r.nazev = 'MANAZER'
WHERE p.kod IN ('MANAGE_USERS', 'MANAGE_SUPPLIERS', 'VIEW_WAREHOUSE', 'VIEW_ORDERS');

-- ANALYTIK
INSERT INTO APP_ROLE_PRAVO 
SELECT p.ID_Pravo, r.ID_Role
FROM PRAVO p
JOIN APP_ROLE r ON r.nazev = 'ANALYTIK'
WHERE p.kod IN ('VIEW_ARCHIVE', 'VIEW_WAREHOUSE', 'VIEW_ORDERS', 'VIEW_PRODUCTS');

-- SUPERVIZOR
INSERT INTO APP_ROLE_PRAVO 
SELECT p.ID_Pravo, r.ID_Role
FROM PRAVO p
JOIN APP_ROLE r ON r.nazev = 'SUPERVIZOR'
WHERE p.kod IN ('VIEW_PRODUCTS', 'EDIT_PRODUCTS', 'VIEW_WAREHOUSE');


------------------------------------------------------------
-- 4) MESTO 
------------------------------------------------------------
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('11000', 'Praha 1', 'Hlavní město Praha');
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('12000', 'Praha 2', 'Hlavní město Praha');
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('13000', 'Praha 3', 'Hlavní město Praha');
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('14000', 'Praha 4', 'Hlavní město Praha');
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('17000', 'Praha 7', 'Hlavní město Praha');

INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('53009', 'Pardubice', 'Pardubický kraj');
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('50002', 'Hradec Králové', 'Královéhradecký kraj');
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('60200', 'Brno', 'Jihomoravský kraj');
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('30100', 'Plzeň', 'Plzeňský kraj');
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('70200', 'Ostrava', 'Moravskoslezský kraj');

INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('46001', 'Liberec', 'Liberecký kraj');
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('37001', 'České Budějovice', 'Jihočeský kraj');
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('77900', 'Olomouc', 'Olomoucký kraj');
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('40001', 'Ústí nad Labem', 'Ústecký kraj');
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('41501', 'Teplice', 'Ústecký kraj');

INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('58601', 'Jihlava', 'Kraj Vysočina');
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('69002', 'Břeclav', 'Jihomoravský kraj');
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('29301', 'Mladá Boleslav', 'Středočeský kraj');
INSERT INTO MESTO (PSC, nazev, kraj) VALUES ('72802', 'Karviná', 'Moravskoslezský kraj');


------------------------------------------------------------
-- 2) ADRESA
------------------------------------------------------------

-- PRAHA (20)
INSERT INTO ADRESA (ulice, cisloPopisne, cisloOrientacni, Mesto_PSC)
VALUES ('Vodičkova', '28', '5', '11000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Národní', '33', '12', '11000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Jungmannova', '24', '4', '11000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Nekázanka', '11', '2', '11000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Politických vězňů', '13', '3', '11000');

INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Ječná', '15', '7', '12000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Legerova', '45', '9', '12000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Sokolská', '68', '3', '12000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Záhřebská', '22', '5', '12000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Rumunská', '12', '8', '12000');

INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Seifertova', '82', '3', '13000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Ondříčkova', '26', '11', '13000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Bořivojova', '104', '9', '13000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Kubelíkova', '37', '2', '13000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Chvalova', '8', '1', '13000');

INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Budějovická', '123', '8', '14000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Na Pankráci', '1724', '34', '14000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Jeremenkova', '88', '6', '14000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Antala Staška', '18', '3', '14000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Na Strži', '65', '4', '14000');

-- PRAHA 7 (5)
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Strossmayerovo náměstí', '5', '2', '17000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Dukelských hrdinů', '12', '6', '17000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Kostelní', '42', '11', '17000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('U Průhonu', '19', '8', '17000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Jankovcova', '53', '7', '17000');

------------------------------------------------------------
-- BRNO (10)
------------------------------------------------------------
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Kounicova', '67', '10', '60200');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Česká', '19', '2', '60200');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Veveří', '112', '3', '60200');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Úvoz', '45', '1', '60200');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Lidická', '88', '14', '60200');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Tábor', '23', '7', '60200');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Bayerova', '9', '2', '60200');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Masarykova', '12', '5', '60200');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Hybešova', '61', '8', '60200');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Husova', '13', '6', '60200');

------------------------------------------------------------
-- PLZEŇ (10)
------------------------------------------------------------
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Klatovská tř.', '122', '4', '30100');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Americká', '32', '6', '30100');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Sukova', '13', '2', '30100');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Rokycanská', '117', '19', '30100');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('U Prazdroje', '7', '1', '30100');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Borská', '45', '3', '30100');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Na Roudné', '9', '4', '30100');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Tylova', '18', '2', '30100');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Kollárova', '11', '6', '30100');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Bílá Hora', '65', '8', '30100');

------------------------------------------------------------
-- HRADEC KRÁLOVÉ (10)
------------------------------------------------------------
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Karla IV.', '291', '3', '50002');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Gočárova třída', '1105', '18', '50002');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Střelecká', '578', '9', '50002');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Šimkova', '1224', '5', '50002');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Československé armády', '21', '6', '50002');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Mostecká', '78', '3', '50002');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Brněnská', '456', '14', '50002');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Smetanovo nábřeží', '3', '1', '50002');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Havlíčkova', '17', '2', '50002');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Labská kotlina', '1014', '9', '50002');

------------------------------------------------------------
-- PARDUBICE (10)
------------------------------------------------------------
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Studentská', '95', '3', '53009');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('třída Míru', '62', '11', '53009');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Sukova třída', '155', '14', '53009');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Na Spravedlnosti', '147', '7', '53009');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Hradecká', '81', '9', '53009');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Polabiny I', '450', '12', '53009');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Polabiny II', '312', '4', '53009');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Teplého', '52', '6', '53009');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('17. listopadu', '121', '8', '53009');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Železniční', '27', '2', '53009');

------------------------------------------------------------
-- OLOMOUC (5)
------------------------------------------------------------
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Horní náměstí', '23', '9', '77900');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Litovelská', '77', '14', '77900');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Holická', '55', '3', '77900');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Foerstrova', '10', '2', '77900');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Wolkerova', '120', '7', '77900');

------------------------------------------------------------
-- ÚSTÍ NAD LABEM (5)
------------------------------------------------------------
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Masarykova', '312', '12', '40001');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Hrnčířská', '55', '7', '40001');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Revoluční', '18', '4', '40001');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Velká Hradební', '121', '9', '40001');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Dlouhá', '3', '1', '40001');

------------------------------------------------------------
-- KARVINÁ (5)
------------------------------------------------------------
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Fryštátská', '212', '5', '72802');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Nám. TGM', '98', '3', '72802');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Borovského', '14', '1', '72802');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('U Bažantnice', '45', '7', '72802');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Havířská', '8', '2', '72802');

------------------------------------------------------------
-- MLADÁ BOLESLAV (5)
------------------------------------------------------------
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Jaselská', '14', '4', '29301');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Laurinova', '23', '1', '29301');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Václavkova', '9', '2', '29301');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Jičínská', '62', '8', '29301');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Tyršova', '15', '5', '29301');



------------------------------------------------------------
-- ADMIN (1)
------------------------------------------------------------
INSERT INTO UZIVATEL (jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role)
VALUES ('David', 'Prochazka', 'david.prochazka@admin.cz', 'davidProchazka', '701123456', 1, 1);


------------------------------------------------------------
-- DODAVATEL (18)
------------------------------------------------------------
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Jan', 'Novak', 'jan.novak@suppliers.cz', 'janNovak', '702111222', 5, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Petr', 'Svoboda', 'petr.svoboda@suppliers.cz', 'petrSvoboda', '702333444', 7, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Martin', 'Dolezal', 'martin.dolezal@suppliers.cz', 'martinDolezal', '703555666', 12, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Lukas', 'Krivda', 'lukas.krivda@suppliers.cz', 'lukasKrivda', '704101010', 18, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Adam', 'Benes', 'adam.benes@suppliers.cz', 'adamBenes', '704999888', 22, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Tomas', 'Holik', 'tomas.holik@suppliers.cz', 'tomasHolik', '705222333', 27, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Viktor', 'Kovar', 'viktor.kovar@suppliers.cz', 'viktorKovar', '705444555', 31, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Jaroslav', 'Rada', 'jaroslav.rada@suppliers.cz', 'jaroslavRada', '706121212', 36, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Michal', 'Simek', 'michal.simek@suppliers.cz', 'michalSimek', '706454545', 41, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Karel', 'Zima', 'karel.zima@suppliers.cz', 'karelZima', '706787878', 44, 2);

INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Radek', 'Pokorny', 'radek.pokorny@suppliers.cz', 'radekPokorny', '707333222', 49, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Dominik', 'Barta', 'dominik.barta@suppliers.cz', 'dominikBarta', '707555444', 52, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Roman', 'Trnka', 'roman.trnka@suppliers.cz', 'romanTrnka', '708101099', 57, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Daniel', 'Kubicek', 'daniel.kubicek@suppliers.cz', 'danielKubicek', '708202233', 60, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Jiri', 'Houska', 'jiri.houska@suppliers.cz', 'jiriHouska', '708858585', 63, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Libor', 'Kostal', 'libor.kostal@suppliers.cz', 'liborKostal', '709444222', 68, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Marek', 'Suchy', 'marek.suchy@suppliers.cz', 'marekSuchy', '709666333', 73, 2);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Ondrej', 'Racek', 'ondrej.racek@suppliers.cz', 'ondrejRacek', '709787878', 81, 2);

------------------------------------------------------------
-- ZAKAZNIK (30)
------------------------------------------------------------
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Petr', 'Kral', 'petr.kral@customers.cz', 'petrKral', '720111222', 2, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Marek', 'Horak', 'marek.horak@customers.cz', 'marekHorak', '720222333', 3, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Ondrej', 'Kalina', 'ondrej.kalina@customers.cz', 'ondrejKalina', '720333444', 4, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Tomas', 'Vecera', 'tomas.vecera@customers.cz', 'tomasVecera', '720444555', 6, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Lukas', 'Pavelka', 'lukas.pavelka@customers.cz', 'lukasPavelka', '720555666', 8, 3);

INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Jan', 'Herda', 'jan.herda@customers.cz', 'janHerda', '721111222', 9, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Daniel', 'Slama', 'daniel.slama@customers.cz', 'danielSlama', '721222333', 10, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Adam', 'Richter', 'adam.richter@customers.cz', 'adamRichter', '721333444', 11, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Jiri', 'Kopecky', 'jiri.kopecky@customers.cz', 'jiriKopecky', '721444555', 13, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('David', 'Toth', 'david.toth@customers.cz', 'davidToth', '721555666', 14, 3);

INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Michal', 'Valek', 'michal.valek@customers.cz', 'michalValek', '722111222', 15, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Radek', 'Janda', 'radek.janda@customers.cz', 'radekJanda', '722222333', 16, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Jaroslav', 'Blazek', 'jaroslav.blazek@customers.cz', 'jaroslavBlazek', '722333444', 17, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Filip', 'Lanik', 'filip.lanik@customers.cz', 'filipLanik', '722444555', 19, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Roman', 'Stehlik', 'roman.stehlik@customers.cz', 'romanStehlik', '722555666', 20, 3);

INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Patrik', 'Navratil', 'patrik.navratil@customers.cz', 'patrikNavratil', '723111222', 23, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Kamil', 'Sykora', 'kamil.sykora@customers.cz', 'kamilSykora', '723222333', 24, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Dominik', 'Krupa', 'dominik.krupa@customers.cz', 'dominikKrupa', '723333444', 25, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Rene', 'Sedlak', 'rene.sedlak@customers.cz', 'reneSedlak', '723444555', 26, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Karel', 'Balaz', 'karel.balaz@customers.cz', 'karelBalaz', '723555666', 28, 3);

INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Matej', 'Stary', 'matej.stary@customers.cz', 'matejStary', '724111222', 29, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Pavel', 'Jurik', 'pavel.jurik@customers.cz', 'pavelJurik', '724222333', 30, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Robert', 'Dolansky', 'robert.dolansky@customers.cz', 'robertDolansky', '724333444', 32, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Vojtech', 'Zabka', 'vojtech.zabka@customers.cz', 'vojtechZabka', '724444555', 33, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Milan', 'Chladek', 'milan.chladek@customers.cz', 'milanChladek', '724555666', 34, 3);

INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Stanislav', 'Prokop', 'stanislav.prokop@customers.cz', 'stanislavProkop', '725111222', 35, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Leo', 'Klement', 'leo.klement@customers.cz', 'leoKlement', '725222333', 37, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Erik', 'Cerny', 'erik.cerny@customers.cz', 'erikCerny', '725333444', 38, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Igor', 'Sladky', 'igor.sladky@customers.cz', 'igorSladky', '725444555', 39, 3);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Alan', 'Bartunek', 'alan.bartunek@customers.cz', 'alanBartunek', '725555666', 40, 3);


------------------------------------------------------------
-- MANAZER (10)
------------------------------------------------------------
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Jan', 'Prokop', 'jan.prokop@management.cz', 'janProkop', '730111222', 42, 4);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Tomas', 'Vesely', 'tomas.vesely@management.cz', 'tomasVesely', '730222333', 44, 4);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Pavel', 'Salek', 'pavel.salek@management.cz', 'pavelSalek', '730333444', 46, 4);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Lukas', 'Bohac', 'lukas.bohac@management.cz', 'lukasBohac', '730444555', 47, 4);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Radek', 'Kuchar', 'radek.kuchar@management.cz', 'radekKuchar', '730555666', 48, 4);

INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('David', 'Moravec', 'david.moravec@management.cz', 'davidMoravec', '731111222', 50, 4);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Milan', 'Kopecek', 'milan.kopecek@management.cz', 'milanKopecek', '731222333', 52, 4);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Roman', 'Machacek', 'roman.machacek@management.cz', 'romanMachacek', '731333444', 55, 4);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Vladimir', 'Hruska', 'vladimir.hruska@management.cz', 'vladimirHruska', '731444555', 57, 4);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Karel', 'Sedivy', 'karel.sedivy@management.cz', 'karelSedivy', '731555666', 59, 4);

------------------------------------------------------------
-- ANALYTIK (10)
------------------------------------------------------------
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Michal', 'Kralik', 'michal.kralik@analytics.cz', 'michalKralik', '732111222', 61, 5);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Daniel', 'Zeleny', 'daniel.zeleny@analytics.cz', 'danielZeleny', '732222333', 62, 5);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Adam', 'Studeny', 'adam.studeny@analytics.cz', 'adamStudeny', '732333444', 63, 5);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Jaroslav', 'Vorel', 'jaroslav.vorel@analytics.cz', 'jaroslavVorel', '732444555', 65, 5);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Marek', 'Rychly', 'marek.rychly@analytics.cz', 'marekRychly', '732555666', 66, 5);

INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Igor', 'Novotny', 'igor.novotny@analytics.cz', 'igorNovotny', '733111222', 67, 5);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Petr', 'Zdrahal', 'petr.zdrahal@analytics.cz', 'petrZdrahal', '733222333', 69, 5);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Tomas', 'Pavlicek', 'tomas.pavlicek@analytics.cz', 'tomasPavlicek', '733333444', 70, 5);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Jan', 'Sykor', 'jan.sykor@analytics.cz', 'janSykor', '733444555', 72, 5);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Dominik', 'Slavik', 'dominik.slavik@analytics.cz', 'dominikSlavik', '733555666', 74, 5);

------------------------------------------------------------
-- SUPERVIZOR (10)
------------------------------------------------------------
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Katerina', 'Benesova', 'katerina.benesova@supervision.cz', 'katerinaBenesova', '734111222', 75, 6);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Lucie', 'Fialova', 'lucie.fialova@supervision.cz', 'lucieFialova', '734222333', 76, 6);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Jana', 'Sedlackova', 'jana.sedlackova@supervision.cz', 'janaSedlackova', '734333444', 77, 6);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Eva', 'Kovarova', 'eva.kovarova@supervision.cz', 'evaKovarova', '734444555', 78, 6);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Monika', 'Reznikova', 'monika.reznikova@supervision.cz', 'monikaReznikova', '734555666', 79, 6);

INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Adela', 'Liskova', 'adela.liskova@supervision.cz', 'adelaLiskova', '735111222', 80, 6);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Hana', 'Kubesova', 'hana.kubesova@supervision.cz', 'hanaKubesova', '735222333', 82, 6);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Veronika', 'Ulrichova', 'veronika.ulrichova@supervision.cz', 'veronikaUlrichova', '735333444', 83, 6);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Barbora', 'Michalikova', 'barbora.michalikova@supervision.cz', 'barboraMichalikova', '735444555', 84, 6);
INSERT INTO UZIVATEL(jmeno, prijmeni, email, heslo, telefonniCislo, ID_Adresa, ID_Role) VALUES ('Tereza', 'Doubkova', 'tereza.doubkova@supervision.cz', 'terezaDoubkova', '735555666', 85, 6);

------------------------------------------------------------
-- ZAKAZNIK (30)
------------------------------------------------------------
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (22,  'LTC10001');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (23,  'LTC10002');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (24,  'LTC10003');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (25,  'LTC10004');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (26,  'LTC10005');

INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (27,  'LTC10006');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (28,  'LTC10007');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (29,  'LTC10008');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (30,  'LTC10009');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (31,  'LTC10010');

INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (32,  'LTC10011');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (33,  'LTC10012');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (34,  'LTC10013');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (35,  'LTC10014');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (36,  'LTC10015');

INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (37,  'LTC10016');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (38,  'LTC10017');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (39,  'LTC10018');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (40,  'LTC10019');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (41,  'LTC10020');

INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (42,  'LTC10021');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (43,  'LTC10022');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (44,  'LTC10023');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (45,  'LTC10024');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (46,  'LTC10025');

INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (47,  'LTC10026');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (48,  'LTC10027');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (49,  'LTC10028');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (50,  'LTC10029');
INSERT INTO ZAKAZNIK(ID_UZIVATELU, KARTAVERNOSTI) VALUES (51,  'LTC10030');

------------------------------------------------------------
-- DODAVATEL (18)
------------------------------------------------------------
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (2, 'FreshFoods s.r.o.');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (3, 'AgroMaster CZ');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (4, 'MeatMarket s.r.o.');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (5, 'SunFruit Import');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (6, 'ChocoFactory');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (7, 'AquaTrade CZ');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (8, 'VegaGreen s.r.o.');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (9, 'Delikatesy Novak');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (10,'NordicFoods');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (11,'BioFreshCZ');

INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (12,'MeatExpress');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (13,'UrbanFarm Suppliers');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (14,'PrimaPece');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (15,'RoyalDrinks');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (16,'PureMilk Distribution');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (17,'GreenValley Export');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (18,'OvocePlus');
INSERT INTO DODAVATEL(ID_UZIVATELU, FIRMA) VALUES (19,'CukrarnaSupply');


------------------------------------------------------------
-- ZAMESTNANEC (30)
------------------------------------------------------------
-- MANAZER (10)
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (52, 45000, DATE '2022-01-15', 'MANAZER');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (53, 47000, DATE '2021-09-10', 'MANAZER');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (54, 48000, DATE '2020-05-01', 'MANAZER');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (55, 45500, DATE '2022-08-19', 'MANAZER');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (56, 46000, DATE '2023-02-12', 'MANAZER');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (57, 49500, DATE '2021-04-21', 'MANAZER');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (58, 52000, DATE '2020-11-30', 'MANAZER');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (59, 51000, DATE '2023-01-14', 'MANAZER');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (60, 47000, DATE '2022-07-07', 'MANAZER');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (61, 46500, DATE '2020-12-05', 'MANAZER');

-- ANALYTIK (10)
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (62, 53000, DATE '2023-03-10', 'ANALYTIK');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (63, 54000, DATE '2022-10-01', 'ANALYTIK');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (64, 56000, DATE '2021-06-11', 'ANALYTIK');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (65, 57000, DATE '2020-09-28', 'ANALYTIK');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (66, 59000, DATE '2023-05-05', 'ANALYTIK');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (67, 60000, DATE '2022-02-18', 'ANALYTIK');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (68, 58000, DATE '2020-03-14', 'ANALYTIK');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (69, 55000, DATE '2023-07-23', 'ANALYTIK');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (70, 56500, DATE '2021-11-09', 'ANALYTIK');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (71, 57500, DATE '2020-02-02', 'ANALYTIK');

-- SUPERVIZOR (10)
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (72, 38000, DATE '2022-04-01', 'SUPERVIZOR');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (73, 39500, DATE '2021-08-09', 'SUPERVIZOR');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (74, 37000, DATE '2023-01-30', 'SUPERVIZOR');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (75, 38500, DATE '2020-10-12', 'SUPERVIZOR');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (76, 40000, DATE '2022-12-03', 'SUPERVIZOR');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (77, 39000, DATE '2021-03-18', 'SUPERVIZOR');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (78, 36500, DATE '2023-06-14', 'SUPERVIZOR');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (79, 37500, DATE '2020-04-25', 'SUPERVIZOR');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (80, 40500, DATE '2022-09-09', 'SUPERVIZOR');
INSERT INTO ZAMESTNANEC(ID_UZIVATELU, MZDA, DATUMNASTUPA, POZICE) VALUES (81, 39800, DATE '2021-12-01', 'SUPERVIZOR');

-- Update role pozic pro existující zaměstnance (podle přání)
UPDATE ZAMESTNANEC
SET POZICE = CASE ID_UZIVATELU
    WHEN 92 THEN 'JUNIOR ANALYTIK FINANCI'
    WHEN 53 THEN 'REKRUTER'
    WHEN 54 THEN 'PROJEKTOVY MANAZER'
    WHEN 56 THEN 'OPERATIONS MANAZER'
    WHEN 57 THEN 'MANAZER SORTIMENTU'
    WHEN 58 THEN 'FINANCNI MANAZER'
    WHEN 59 THEN 'MANAZER DODAVATELU'
    WHEN 60 THEN 'MANAZER ZAKAZNICKYCH SLUZEB'
    WHEN 61 THEN 'MANAZER ROZVOJE'
    WHEN 62 THEN 'FINANCNI ANALYTIK'
    WHEN 63 THEN 'REPORTING ANALYTIK'
    WHEN 64 THEN 'DATOVY ANALYTIK'
    WHEN 65 THEN 'OBCHODNI ANALYTIK'
    WHEN 66 THEN 'RISK ANALYTIK'
    WHEN 67 THEN 'BI ANALYTIK'
    WHEN 68 THEN 'ANALYTIK ZASOB'
    WHEN 69 THEN 'ANALYTIK POPTAVKY'
    WHEN 70 THEN 'PRICING ANALYTIK'
    WHEN 71 THEN 'ANALYTIK RETAILU'
    WHEN 72 THEN 'SUPERVIZOR POKLADEN'
    WHEN 73 THEN 'SUPERVIZOR SKLADU'
    WHEN 74 THEN 'SUPERVIZOR ONLINE PRODEJE'
    WHEN 75 THEN 'SUPERVIZOR PECIVA'
    WHEN 76 THEN 'SUPERVIZOR CERSTVEHO'
    WHEN 77 THEN 'SUPERVIZOR NOCNI SMENY'
    WHEN 78 THEN 'SUPERVIZOR BACKOFFICE'
    WHEN 79 THEN 'SUPERVIZOR UTRZEK'
    WHEN 80 THEN 'SUPERVIZOR INVENTUR'
    WHEN 81 THEN 'SUPERVIZOR OVOCE A ZELENINY'
    WHEN 82 THEN 'SUPERVIZOR NONFOOD'
    WHEN 48 THEN 'HLAVNI UCETNI'
    WHEN 9  THEN 'UCETNI ASISTENT'
    WHEN 13 THEN 'PAYROLL SPECIALISTA'
    WHEN 27 THEN 'HR KOORDINATOR'
    WHEN 29 THEN 'SPECIALISTA BOZP'
    WHEN 30 THEN 'PROCUREMENT SPECIALISTA'
    WHEN 84 THEN 'SUPERVIZOR LOGISTIKY'
    ELSE POZICE
END
WHERE ID_UZIVATELU IN (9, 13, 27, 29, 30, 48, 53, 54, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 84, 92);



------------------------------------------------------------
-- SUPERMARKET ADRESA
------------------------------------------------------------
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('U Trojice', '27', '5', '11000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Na Folimance', '13', '2', '12000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('U Rajske zahrady', '14', '10', '13000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Jeremenkova', '282', '9', '14000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Tusarova', '21', '4', '17000');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Kobližná', '18', '3', '60200'); -- Brno
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Cejl', '76', '12', '60200');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Havlickova', '44', '7', '53009'); -- Pardubice
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Zborovskeho', '155', '11', '53009'); -- Pardubice
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Tesinska', '98', '6', '70200'); -- Ostrava
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('28. rijna', '45', '15', '70200');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('U Soudu', '24', '1', '30100'); -- Plzen
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Slovanska', '155', '20', '30100');
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Partyzanu', '11', '9', '46001'); -- Liberec
INSERT INTO ADRESA(ulice, cisloPopisne, cisloOrientacni, Mesto_PSC) VALUES ('Svermova', '52', '3', '46001');

------------------------------------------------------------
-- SUPERMARKET
------------------------------------------------------------
INSERT INTO SUPERMARKET (nazev, telefon, email, ID_Adresa)
VALUES ('Supermarket Praha Centrum', '720111111', 'praha.centrum@shop.cz', 86);

INSERT INTO SUPERMARKET (nazev, telefon, email, ID_Adresa)
VALUES ('Supermarket Praha Folimanka', '720222222', 'praha.folimanka@shop.cz', 87);

INSERT INTO SUPERMARKET (nazev, telefon, email, ID_Adresa)
VALUES ('Supermarket Praha Zahrada', '720333333', 'praha.zahrada@shop.cz', 88);

INSERT INTO SUPERMARKET (nazev, telefon, email, ID_Adresa)
VALUES ('Supermarket Praha Jeremenkova', '720444444', 'praha.jeremenkova@shop.cz', 89);

INSERT INTO SUPERMARKET (nazev, telefon, email, ID_Adresa)
VALUES ('Supermarket Praha Tusarova', '720555555', 'praha.tusarova@shop.cz', 90);


------------------------------------------------------------
-- SKLAD (10 sklady)
------------------------------------------------------------

-- SUPERMARKET 1
INSERT INTO SKLAD (nazev, kapacita, telefonniCislo, ID_Supermarket)
VALUES ('Sklad Praha Centrum - Hala A', 2000, '+420221900101', 1);

INSERT INTO SKLAD (nazev, kapacita, telefonniCislo, ID_Supermarket)
VALUES ('Sklad Praha Centrum - Hala B', 2300, '+420221900102', 1);

-- SUPERMARKET 2
INSERT INTO SKLAD (nazev, kapacita, telefonniCislo, ID_Supermarket)
VALUES ('Sklad Folimanka - Polabiny', 1800, '+420466777201', 2);

INSERT INTO SKLAD (nazev, kapacita, telefonniCislo, ID_Supermarket)
VALUES ('Sklad Folimanka - Rezerva', 2100, '+420466777202', 2);

-- SUPERMARKET 3
INSERT INTO SKLAD (nazev, kapacita, telefonniCislo, ID_Supermarket)
VALUES ('Sklad Zahrada - Sever', 1600, '+420389501301', 3);

INSERT INTO SKLAD (nazev, kapacita, telefonniCislo, ID_Supermarket)
VALUES ('Sklad Zahrada - Jih', 1900, '+420389501302', 3);

-- SUPERMARKET 4
INSERT INTO SKLAD (nazev, kapacita, telefonniCislo, ID_Supermarket)
VALUES ('Sklad Jeremenkova - Central', 1750, '+420377445401', 4);

INSERT INTO SKLAD (nazev, kapacita, telefonniCislo, ID_Supermarket)
VALUES ('Sklad Jeremenkova - Bory', 1950, '+420377445402', 4);

-- SUPERMARKET 5
INSERT INTO SKLAD (nazev, kapacita, telefonniCislo, ID_Supermarket)
VALUES ('Sklad Tusarova - Liberec', 1650, '+420485123501', 5);

INSERT INTO SKLAD (nazev, kapacita, telefonniCislo, ID_Supermarket)
VALUES ('Sklad Tusarova - Svermova', 1850, '+420485123502', 5);

------------------------------------------------------------
-- KATEGORIE ZBOZI (10)
------------------------------------------------------------

INSERT INTO Kategorie_zbozi (nazev, popis)
VALUES ('Mlecne vyrobky', 'Syry, mleko, jogurty, maslo, tvaroh.');

INSERT INTO Kategorie_zbozi (nazev, popis)
VALUES ('Pecivo', 'Cerstve pecivo, bagety, chleb, housky.');

INSERT INTO Kategorie_zbozi (nazev, popis)
VALUES ('Maso a uzeniny', 'Hovezi, veprove, kureci, salamy, sunky.');

INSERT INTO Kategorie_zbozi (nazev, popis)
VALUES ('Ovoce', 'Cerstve ovoce z CR i dovoz.');

INSERT INTO Kategorie_zbozi (nazev, popis)
VALUES ('Zelenina', 'Cerstva zelenina, bylinky.');

INSERT INTO Kategorie_zbozi (nazev, popis)
VALUES ('Napoj', 'Sodovky, dzusy, vody, energeticke napoje.');

INSERT INTO Kategorie_zbozi (nazev, popis)
VALUES ('Sladkosti', 'Cokolady, susenky, bonbony.');

INSERT INTO Kategorie_zbozi (nazev, popis)
VALUES ('Mrazene', 'Mrazena zelenina, pizza, ryby.');

INSERT INTO Kategorie_zbozi (nazev, popis)
VALUES ('Drogerie', 'Cistici prostredky, kosmetika.');

INSERT INTO Kategorie_zbozi (nazev, popis)
VALUES ('Alkohol', 'Pivo, vino, lihoviny.');

------------------------------------------------------------
-- MLECNE VYROBKY (kategorie 1)
-- Vklad do skladu 1 (Praha chlad) a 3 (Brno chlad)
------------------------------------------------------------

-- 1
INSERT INTO ZBOZI (nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie)VALUES ('Mleko polotucne 1L', 24.90, 320, 30, 'Polotucne mleko 1L.', 1, 1);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mleko polotucne 1L', 24.90, 280, 30, 'Polotucne mleko 1L.', 3, 1);

-- 2
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mleko plnotucne 1L', 26.90, 300, 30, 'Plnotucne mleko 1L.', 1, 1);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mleko plnotucne 1L', 26.90, 250, 30, 'Plnotucne mleko 1L.', 3, 1);

-- 3
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Maslo 250g', 54.90, 220, 20, 'Cerstve maslo 82%.', 1, 1);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Maslo 250g', 54.90, 180, 20, 'Cerstve maslo 82%.', 3, 1);

-- 4
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Tvaroh jemny 250g', 32.90, 200, 20, 'Jemny tvaroh.', 1, 1);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Tvaroh jemny 250g', 32.90, 170, 20, 'Jemny tvaroh.', 3, 1);

-- 5
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Jogurt bily 150g', 11.90, 450, 40, 'Bily jogurt 150g.', 1, 1);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Jogurt bily 150g', 11.90, 390, 40, 'Bily jogurt 150g.', 3, 1);

-- 6
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Jogurt ovocny jahoda 150g', 13.90, 430, 40, 'Jogurt s jahodovou prichuti.', 1, 1);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Jogurt ovocny jahoda 150g', 13.90, 380, 40, 'Jogurt s jahodovou prichuti.', 3, 1);

-- 7
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Syr Eidam 30% 100g', 19.90, 260, 25, 'Tvrdý syr Eidam 30%.', 1, 1);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Syr Eidam 30% 100g', 19.90, 230, 25, 'Tvrdý syr Eidam 30%.', 3, 1);

-- 8
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Syr Gouda 45% 100g', 23.90, 245, 25, 'Syr Gouda 45%.', 1, 1);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Syr Gouda 45% 100g', 23.90, 220, 25, 'Syr Gouda 45%.', 3, 1);

-- 9
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Cottage syr 200g', 29.90, 160, 15, 'Cottage syr natural.', 1, 1);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Cottage syr 200g', 29.90, 135, 15, 'Cottage syr natural.', 3, 1);

-- 10
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Kefir 500ml', 21.90, 210, 15, 'Kefirovy napoj.', 1, 1);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Kefir 500ml', 21.90, 190, 15, 'Kefirovy napoj.', 3, 1);

------------------------------------------------------------
-- MASO A UZENINY (kategorie 3)
------------------------------------------------------------

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Kureci prsa 1kg', 129.90, 150, 20, 'Chlazena kureci prsa.', 1, 3);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Kureci prsa 1kg', 129.90, 110, 20, 'Chlazena kureci prsa.', 3, 3);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Veprove kare 1kg', 149.90, 140, 20, 'Cerstre veprove kare.', 1, 3);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Veprove kare 1kg', 149.90, 120, 20, 'Cerstre veprove kare.', 3, 3);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Hovezi predni 1kg', 179.90, 130, 20, 'Hovezi predni bez kosti.', 1, 3);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Hovezi predni 1kg', 179.90, 90, 20, 'Hovezi predni bez kosti.', 3, 3);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Sekana pecena 500g', 59.90, 200, 20, 'Domaci pecena sekana.', 1, 3);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Sekana pecena 500g', 59.90, 160, 20, 'Domaci pecena sekana.', 3, 3);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Sunka standard 100g', 19.90, 300, 20, 'Sunka vyjimcne kvality.', 1, 3);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Sunka standard 100g', 19.90, 240, 20, 'Sunka vyjimcne kvality.', 3, 3);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Klobasy domaci 300g', 49.90, 180, 15, 'Domaci klobasy.', 1, 3);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Klobasy domaci 300g', 49.90, 140, 15, 'Domaci klobasy.', 3, 3);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Salam herkules 100g', 24.90, 230, 15, 'Kvalitni salam.', 1, 3);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Salam herkules 100g', 24.90, 190, 15, 'Kvalitni salam.', 3, 3);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Parizsky salat 150g', 17.90, 170, 15, 'Parizsky lahudkovy salat.', 1, 3);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Parizsky salat 150g', 17.90, 135, 15, 'Parizsky lahudkovy salat.', 3, 3);


------------------------------------------------------------
-- MRAZENE (kategorie 8)
------------------------------------------------------------

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazena pizza Mozzarella', 59.90, 180, 20, 'Mrazena pizza 400g.', 1, 8);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazena pizza Mozzarella', 59.90, 140, 20, 'Mrazena pizza 400g.', 3, 8);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazena brokolice 350g', 29.90, 160, 20, 'Mrazena brokolice.', 1, 8);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazena brokolice 350g', 29.90, 130, 20, 'Mrazena brokolice.', 3, 8);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazena kukurice 400g', 26.90, 170, 20, 'Sladka kukurice.', 1, 8);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazena kukurice 400g', 26.90, 130, 20, 'Sladka kukurice.', 3, 8);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Zmrzlina vanilkova 1L', 89.90, 140, 20, 'Vanilkova zmrzlina.', 1, 8);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Zmrzlina vanilkova 1L', 89.90, 120, 20, 'Vanilkova zmrzlina.', 3, 8);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazene rybi prsty 300g', 54.90, 150, 15, 'Rybi prsty.', 1, 8);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazene rybi prsty 300g', 54.90, 130, 15, 'Rybi prsty.', 3, 8);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazena zelenina mix 350g', 24.90, 150, 15, 'Směs zeleniny.', 1, 8);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazena zelenina mix 350g', 24.90, 120, 15, 'Směs zeleniny.', 3, 8);


------------------------------------------------------------
-- MLECNE - DOPLNĚNÉ NÁHODNÉ POLOŽKY
------------------------------------------------------------

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Skyr bily 140g', 18.90, 220, 20, 'Islandsky skyr bily.', 1, 1);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Skyr bily 140g', 18.90, 180, 20, 'Islandsky skyr bily.', 3, 1);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Syr hermelin 120g', 34.90, 160, 15, 'Hermelin zrajici syr.', 1, 1);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Syr hermelin 120g', 34.90, 130, 15, 'Hermelin zrajici syr.', 3, 1);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Syr niva 100g', 29.90, 140, 12, 'Plisnovy syr Niva.', 1, 1);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Syr niva 100g', 29.90, 110, 12, 'Plisnovy syr Niva.', 3, 1);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mozzarella 125g', 22.90, 210, 20, 'Mozzarella v nalozi.', 1, 1);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mozzarella 125g', 22.90, 180, 20, 'Mozzarella v nalozi.', 3, 1);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Jogurt vanilkovy 150g', 12.90, 350, 30, 'Jogurt s vanilkovou prichuti.', 1, 1);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Jogurt vanilkovy 150g', 12.90, 310, 30, 'Jogurt s vanilkovou prichuti.', 3, 1);


------------------------------------------------------------
-- MASO A UZENINY - DOPLNĚNÉ POLOŽKY
------------------------------------------------------------

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Kureci stehno 1kg', 89.90, 200, 20, 'Chlazena kureci stehna.', 1, 3);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Kureci stehno 1kg', 89.90, 160, 20, 'Chlazena kureci stehna.', 3, 3);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mlete hovezi 500g', 79.90, 180, 20, 'Mlete hovezi maso.', 1, 3);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mlete hovezi 500g', 79.90, 150, 20, 'Mlete hovezi maso.', 3, 3);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Veprove koleno 1kg', 119.90, 140, 15, 'Veprove koleno bez kosti.', 1, 3);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Veprove koleno 1kg', 119.90, 110, 15, 'Veprove koleno bez kosti.', 3, 3);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Kureci srdicka 500g', 54.90, 160, 15, 'Kureci srdicka k vareni.', 1, 3);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Kureci srdicka 500g', 54.90, 130, 15, 'Kureci srdicka k vareni.', 3, 3);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Sunka premium 100g', 24.90, 260, 20, 'Vysoce kvalitni sunka.', 1, 3);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Sunka premium 100g', 24.90, 210, 20, 'Vysoce kvalitni sunka.', 3, 3);


------------------------------------------------------------
-- MRAZENE - DOPLNĚNÉ POLOŽKY
------------------------------------------------------------

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazene hranolky 1kg', 49.90, 190, 20, 'Klasicke mrazene hranolky.', 1, 8);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazene hranolky 1kg', 49.90, 160, 20, 'Klasicke mrazene hranolky.', 3, 8);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazene maliny 300g', 69.90, 170, 20, 'Mrazene maliny.', 1, 8);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazene maliny 300g', 69.90, 140, 20, 'Mrazene maliny.', 3, 8);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazene krevety 400g', 149.90, 130, 15, 'Loupane krevety.', 1, 8);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazene krevety 400g', 149.90, 110, 15, 'Loupane krevety.', 3, 8);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Zmrzlina cokoladova 1L', 89.90, 150, 15, 'Cokoladova zmrzlina.', 1, 8);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Zmrzlina cokoladova 1L', 89.90, 130, 15, 'Cokoladova zmrzlina.', 3, 8);

INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazena treska 500g', 89.90, 140, 15, 'Mrazena treska.', 1, 8);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrazena treska 500g', 89.90, 120, 15, 'Mrazena treska.', 3, 8);


------------------------------------------------------------
-- PECIVO (kategorie 2)
------------------------------------------------------------

-- Praha (sklad 2)
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Chleb toustovy 500g', 32.90, 180, 20, 'Toustovy chleb.', 2, 2);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Bageta francouzska 250g', 12.90, 150, 20, 'Francouzska bageta.', 2, 2);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Croissant maslovy 60g', 9.90, 200, 30, 'Maslovy croissant.', 2, 2);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Celozrnna houska 50g', 4.90, 220, 30, 'Celozrnna houska.', 2, 2);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Slany rohlik 40g', 3.90, 300, 40, 'Klasicky slany rohlik.', 2, 2);

-- Brno (sklad 4)
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Chleb toustovy 500g', 32.90, 160, 20, 'Toustovy chleb.', 4, 2);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Bageta francouzska 250g', 12.90, 130, 20, 'Francouzska bageta.', 4, 2);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Croissant maslovy 60g', 9.90, 180, 30, 'Maslovy croissant.', 4, 2);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Celozrnna houska 50g', 4.90, 200, 30, 'Celozrnna houska.', 4, 2);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Slany rohlik 40g', 3.90, 270, 40, 'Klasicky slany rohlik.', 4, 2);


------------------------------------------------------------
-- OVOCE (kategorie 4)
------------------------------------------------------------

-- Praha
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Jablka cervena 1kg', 39.90, 200, 20, 'Cerstva cervena jablka.', 2, 4);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Jablka zelena 1kg', 42.90, 180, 20, 'Kysela zelena jablka.', 2, 4);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Hrusek konferencnich 1kg', 49.90, 160, 20, 'Konferencni hrusky.', 2, 4);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Pomerance velke 1kg', 39.90, 140, 20, 'Velke pomerance.', 2, 4);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mandarinky sladke 1kg', 44.90, 130, 20, 'Sladke mandarinky.', 2, 4);

-- Brno
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Jablka cervena 1kg', 39.90, 170, 20, 'Cerstva cervena jablka.', 4, 4);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Jablka zelena 1kg', 42.90, 160, 20, 'Kysela zelena jablka.', 4, 4);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Hrusek konferencnich 1kg', 49.90, 140, 20, 'Konferencni hrusky.', 4, 4);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Pomerance velke 1kg', 39.90, 120, 20, 'Velke pomerance.', 4, 4);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mandarinky sladke 1kg', 44.90, 115, 20, 'Sladke mandarinky.', 4, 4);


------------------------------------------------------------
-- ZELENINA (kategorie 5)
------------------------------------------------------------

-- Praha
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Rajcata cervena 1kg', 54.90, 180, 20, 'Cerstva rajcata.', 2, 5);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Okurky salatkove 1kg', 39.90, 160, 20, 'Salatkove okurky.', 2, 5);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Paprika cervena 1kg', 69.90, 140, 20, 'Sladka cervena paprika.', 2, 5);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrkev 1kg', 29.90, 200, 20, 'Cerstva mrkev.', 2, 5);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Brambory konzumní 5kg', 69.90, 120, 20, 'Balené konzumní brambory.', 2, 5);

-- Brno
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Rajcata cervena 1kg', 54.90, 160, 20, 'Cerstva rajcata.', 4, 5);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Okurky salatkove 1kg', 39.90, 150, 20, 'Salatkove okurky.', 4, 5);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Paprika cervena 1kg', 69.90, 120, 20, 'Sladka cervena paprika.', 4, 5);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mrkev 1kg', 29.90, 180, 20, 'Cerstva mrkev.', 4, 5);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Brambory konzumní 5kg', 69.90, 100, 20, 'Balené konzumní brambory.', 4, 5);


------------------------------------------------------------
-- NAPOJE (doplnenych 10 polozek)
------------------------------------------------------------

-- PRAHA (SKLAD 2)
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Voda neperliva 1.5L', 9.90, 300, 30, 'Cista neperliva voda.', 2, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Voda perliva 1.5L', 10.90, 280, 30, 'Perliva voda.', 2, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Cola 2L', 32.90, 180, 20, 'Limonada cola 2L.', 2, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Fanta pomeranc 2L', 31.90, 150, 20, 'Limonada pomerancova.', 2, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Sprite 2L', 31.90, 150, 20, 'Citrusova limonada.', 2, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Jablecny dzus 1L', 19.90, 200, 25, 'Jablecny 100% dzus.', 2, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Pomerancovy dzus 1L', 22.90, 180, 25, 'Pomerancovy 100% dzus.', 2, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Energeticky napoj 500ml', 29.90, 160, 20, 'Energeticky drink.', 2, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Iced tea broskev 1.5L', 24.90, 170, 20, 'Ledovy caj broskev.', 2, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Iced tea citron 1.5L', 24.90, 160, 20, 'Ledovy caj citron.', 2, 6);

-- BRNO (SKLAD 4)
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Voda neperliva 1.5L', 9.90, 270, 30, 'Cista neperliva voda.', 4, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Voda perliva 1.5L', 10.90, 260, 30, 'Perliva voda.', 4, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Cola 2L', 32.90, 160, 20, 'Limonada cola 2L.', 4, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Fanta pomeranc 2L', 31.90, 130, 20, 'Limonada pomerancova.', 4, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Sprite 2L', 31.90, 130, 20, 'Citrusova limonada.', 4, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Jablecny dzus 1L', 19.90, 170, 25, 'Jablecny 100% dzus.', 4, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Pomerancovy dzus 1L', 22.90, 160, 25, 'Pomerancovy 100% dzus.', 4, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Energeticky napoj 500ml', 29.90, 140, 20, 'Energeticky drink.', 4, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Iced tea broskev 1.5L', 24.90, 150, 20, 'Ledovy caj broskev.', 4, 6);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Iced tea citron 1.5L', 24.90, 140, 20, 'Ledovy caj citron.', 4, 6);


------------------------------------------------------------
-- SLADKOSTI (doplnenych 10 polozek)
------------------------------------------------------------

-- PRAHA (SKLAD 2)
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Cokolada mlečna 100g', 24.90, 220, 20, 'Mlecna cokolada.', 2, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Cokolada horka 100g', 26.90, 200, 20, 'Horka cokolada.', 2, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Bonbony ovocne 90g', 14.90, 250, 25, 'Ovocne bonbony.', 2, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Bonbony karamelove 90g', 12.90, 230, 25, 'Karamelove bonbony.', 2, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Cokoladove susenky 150g', 29.90, 180, 20, 'Susenky s cokoladou.', 2, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mandle v cokolade 100g', 39.90, 140, 15, 'Mandle v cokolade.', 2, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Marcipan 100g', 34.90, 130, 15, 'Marcipanova tycinka.', 2, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Lentilky 80g', 29.90, 210, 20, 'Barevne cokoladove draze.', 2, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Zmrzlinova tycinka 60g', 19.90, 170, 15, 'Sladka tycinka.', 2, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Wafle vanilkove 150g', 21.90, 190, 15, 'Vanilkove wafle.', 2, 7);

-- BRNO (SKLAD 4)
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Cokolada mlečna 100g', 24.90, 200, 20, 'Mlecna cokolada.', 4, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Cokolada horka 100g', 26.90, 180, 20, 'Horka cokolada.', 4, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Bonbony ovocne 90g', 14.90, 230, 25, 'Ovocne bonbony.', 4, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Bonbony karamelove 90g', 12.90, 210, 25, 'Karamelove bonbony.', 4, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Cokoladove susenky 150g', 29.90, 160, 20, 'Susenky s cokoladou.', 4, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Mandle v cokolade 100g', 39.90, 120, 15, 'Mandle v cokolade.', 4, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Marcipan 100g', 34.90, 120, 15, 'Marcipanova tycinka.', 4, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Lentilky 80g', 29.90, 190, 20, 'Barevne cokoladove draze.', 4, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Zmrzlinova tycinka 60g', 19.90, 150, 15, 'Sladka tycinka.', 4, 7);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Wafle vanilkove 150g', 21.90, 170, 15, 'Vanilkove wafle.', 4, 7);


------------------------------------------------------------
-- DROGERIE (doplnenych 10 polozek)
------------------------------------------------------------

-- PRAHA (SKLAD 2)
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Sprchovy gel 250ml', 39.90, 140, 20, 'Sprchovy gel universal.', 2, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Sampon 400ml', 59.90, 130, 20, 'Sampon pro normalni vlasy.', 2, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Toaletni papir 8ks', 74.90, 180, 20, 'Toaletni papir 8 roli.', 2, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Kapesnicky 10x10', 29.90, 160, 20, 'Papirky v balicku.', 2, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Tekute mydlo 500ml', 34.90, 120, 20, 'Tekute mydlo s pumpickou.', 2, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Kartacek na zuby', 29.90, 140, 20, 'Jednoduchy kartacek.', 2, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Zubni pasta 100ml', 44.90, 110, 20, 'Zubni pasta fluor.', 2, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Praci prasek 1.5kg', 99.90, 90, 10, 'Praci prasek universal.', 2, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Avivaz 1L', 79.90, 80, 10, 'Avivaz s vuni.', 2, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Uklidovy sprej 500ml', 49.90, 100, 10, 'Cistici prostredek.', 2, 9);

-- BRNO (SKLAD 4)
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Sprchovy gel 250ml', 39.90, 120, 20, 'Sprchovy gel universal.', 4, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Sampon 400ml', 59.90, 115, 20, 'Sampon pro normalni vlasy.', 4, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Toaletni papir 8ks', 74.90, 160, 20, 'Toaletni papir 8 roli.', 4, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Kapesnicky 10x10', 29.90, 140, 20, 'Papirky v balicku.', 4, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Tekute mydlo 500ml', 34.90, 110, 20, 'Tekute mydlo s pumpickou.', 4, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Kartacek na zuby', 29.90, 130, 20, 'Jednoduchy kartacek.', 4, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Zubni pasta 100ml', 44.90, 95, 20, 'Zubni pasta fluor.', 4, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Praci prasek 1.5kg', 99.90, 85, 10, 'Praci prasek universal.', 4, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Avivaz 1L', 79.90, 70, 10, 'Avivaz s vuni.', 4, 9);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Uklidovy sprej 500ml', 49.90, 90, 10, 'Cistici prostredek.', 4, 9);


------------------------------------------------------------
-- ALKOHOL (doplnenych 10 polozek)
------------------------------------------------------------

-- PRAHA (SKLAD 2)
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Pilsner Urquell 0.5L', 22.90, 200, 20, 'Svetle pivo Pilsner.', 2, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Gambrinus 0.5L', 17.90, 220, 20, 'Gambrinus svetly.', 2, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Kozel 11 0.5L', 19.90, 210, 20, 'Kozel jedenactka.', 2, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Cerne pivo 0.5L', 21.90, 150, 15, 'Tmave česke pivo.', 2, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Vino cervene 0.75L', 69.90, 120, 10, 'Cervene vino.', 2, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Vino bile 0.75L', 64.90, 110, 10, 'Bile vino.', 2, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Sekt Bohemia 0.75L', 99.90, 90, 10, 'Sekt Bohemia.', 2, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Rum Tuzemsky 0.5L', 129.90, 80, 10, 'Tradicni Tuzemak.', 2, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Vodka 0.5L', 139.90, 85, 10, 'Vodka jemna.', 2, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Whisky 0.7L', 249.90, 60, 10, 'Whisky blended.', 2, 10);

-- BRNO (SKLAD 4)
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Pilsner Urquell 0.5L', 22.90, 180, 20, 'Svetle pivo Pilsner.', 4, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Gambrinus 0.5L', 17.90, 200, 20, 'Gambrinus svetly.', 4, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Kozel 11 0.5L', 19.90, 190, 20, 'Kozel jedenactka.', 4, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Cerne pivo 0.5L', 21.90, 130, 15, 'Tmave česke pivo.', 4, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Vino cervene 0.75L', 69.90, 105, 10, 'Cervene vino.', 4, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Vino bile 0.75L', 64.90, 100, 10, 'Bile vino.', 4, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Sekt Bohemia 0.75L', 99.90, 80, 10, 'Sekt Bohemia.', 4, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Rum Tuzemsky 0.5L', 129.90, 70, 10, 'Tradicni Tuzemak.', 4, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Vodka 0.5L', 139.90, 75, 10, 'Vodka jemna.', 4, 10);
INSERT INTO ZBOZI(nazev, cena, mnozstvi, minMnozstvi, popis, SKLAD_ID_Sklad, ID_Kategorie) VALUES ('Whisky 0.7L', 249.90, 55, 10, 'Whisky blended.', 4, 10);

------------------------------------------------------------
-- STATUS objednavek
------------------------------------------------------------

INSERT INTO STATUS (NAZEV) VALUES ('Vytvorena');
INSERT INTO STATUS (NAZEV) VALUES ('Potvrzena');
INSERT INTO STATUS (NAZEV) VALUES ('Pripravuje se');
INSERT INTO STATUS (NAZEV) VALUES ('Odeslana');
INSERT INTO STATUS (NAZEV) VALUES ('Dokoncena');
INSERT INTO STATUS (NAZEV) VALUES ('Zrusena');

------------------------------------------------------------
-- OBJEDNAVKY 1–15 
-- 01.09.2025 – 20.09.2025
-- status: 5 nebo 6
------------------------------------------------------------
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-01', 5, 'ZAKAZNIK', NULL, 28, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-01', 6, 'DODAVATEL', 'zruseno dodavatelem', 3, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-02', 5, 'ZAKAZNIK', NULL, 45, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-03', 6, 'DODAVATEL', NULL, 15, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-04', 5, 'ZAKAZNIK', NULL, 22, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-05', 5, 'ZAKAZNIK', NULL, 33, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-07', 6, 'DODAVATEL', 'neprevzato skladem', 8, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-07', 5, 'ZAKAZNIK', NULL, 51, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-08', 6, 'ZAKAZNIK', 'zruseno', 24, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-10', 5, 'DODAVATEL', NULL, 11, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-12', 5, 'ZAKAZNIK', NULL, 39, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-14', 6, 'ZAKAZNIK', NULL, 49, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-15', 5, 'DODAVATEL', NULL, 4, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-18', 5, 'ZAKAZNIK', NULL, 31, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-20', 6, 'DODAVATEL', 'storno systemem', 17, 2);


------------------------------------------------------------
-- OBJEDNAVKY 16–30 
-- 21.09.2025 – 15.10.2025
------------------------------------------------------------
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-21', 5, 'ZAKAZNIK', NULL, 31, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-22', 6, 'DODAVATEL', 'zpozdene dodani', 6, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-24', 5, 'ZAKAZNIK', NULL, 41, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-25', 5, 'ZAKAZNIK', NULL, 46, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-27', 6, 'DODAVATEL', NULL, 12, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-29', 5, 'ZAKAZNIK', NULL, 51, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-09-30', 5, 'ZAKAZNIK', NULL, 33, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-02', 6, 'DODAVATEL', 'storno skladu', 7, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-03', 5, 'ZAKAZNIK', NULL, 25, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-05', 5, 'ZAKAZNIK', NULL, 37, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-06', 6, 'DODAVATEL', NULL, 18, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-08', 5, 'ZAKAZNIK', NULL, 28, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-10', 6, 'ZAKAZNIK', 'neprevzato', 22, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-12', 5, 'ZAKAZNIK', NULL, 44, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-15', 6, 'DODAVATEL', NULL, 10, 1);


------------------------------------------------------------
-- OBJEDNAVKY 31–45
-- 16.10.2025 – 10.11.2025
------------------------------------------------------------
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-16', 5, 'ZAKAZNIK', NULL, 32, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-17', 6, 'DODAVATEL', 'zruseno dodavatelem', 5, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-18', 5, 'ZAKAZNIK', NULL, 49, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-20', 5, 'ZAKAZNIK', NULL, 26, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-21', 6, 'DODAVATEL', NULL, 14, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-23', 5, 'ZAKAZNIK', NULL, 33, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-24', 5, 'ZAKAZNIK', NULL, 42, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-26', 6, 'ZAKAZNIK', 'neprevzal objednavku', 23, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-27', 5, 'DODAVATEL', NULL, 16, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-29', 5, 'ZAKAZNIK', NULL, 45, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-10-30', 6, 'DODAVATEL', NULL, 8, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-02', 5, 'ZAKAZNIK', NULL, 24, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-03', 6, 'ZAKAZNIK', 'zruseno systemem', 50, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-07', 5, 'DODAVATEL', NULL, 11, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-10', 5, 'ZAKAZNIK', NULL, 39, 1);

------------------------------------------------------------
-- OBJEDNAVKY 46–60 
-- 21.11.2025 – 28.11.2025
------------------------------------------------------------
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-21', 3, 'ZAKAZNIK', NULL, 34, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-21', 1, 'DODAVATEL', 'nova dodavka', 7, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-22', 4, 'ZAKAZNIK', NULL, 47, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-22', 6, 'ZAKAZNIK', 'zruseno', 24, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-23', 2, 'DODAVATEL', NULL, 12, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-23', 5, 'ZAKAZNIK', NULL, 38, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-24', 3, 'ZAKAZNIK', NULL, 51, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-24', 1, 'DODAVATEL', NULL, 4, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-25', 2, 'ZAKAZNIK', NULL, 45, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-25', 6, 'ZAKAZNIK', 'neprevzato', 23, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-26', 1, 'DODAVATEL', 'cekame na potvrzeni', 16, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-26', 4, 'ZAKAZNIK', NULL, 33, 1);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-27', 2, 'ZAKAZNIK', NULL, 40, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-27', 5, 'DODAVATEL', NULL, 3, 2);
INSERT INTO OBJEDNAVKA(DATUM, ID_STATUS, TYP_OBJEDNAVKA, POZNAMKA, ID_UZIVATEL, ID_SUPERMARKET) VALUES (DATE '2025-11-28', 1, 'ZAKAZNIK', 'expres doruceni', 49, 1);


------------------------------------------------------------
-- OBJEDNAVKA_ZBOZI pro objednavky 1–15
------------------------------------------------------------

-- OBJ 1 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 1, 145);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 1, 32);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 1, 88);

-- OBJ 2 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (25, 2, 11);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (40, 2, 74);

-- OBJ 3 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 3, 53);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (4, 3, 122);

-- OBJ 4 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (30, 4, 15);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (18, 4, 98);

-- OBJ 5 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 5, 7);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 5, 66);

-- OBJ 6 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 6, 49);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 6, 141);

-- OBJ 7 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (22, 7, 63);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (15, 7, 130);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (28, 7, 81);

-- OBJ 8 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 8, 17);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (4, 8, 152);

-- OBJ 9 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 9, 109);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 9, 41);

-- OBJ 10 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (33, 10, 27);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (20, 10, 99);

-- OBJ 11 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 11, 61);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (5, 11, 135);

-- OBJ 12 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 12, 14);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 12, 120);

-- OBJ 13 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (40, 13, 45);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (22, 13, 86);

-- OBJ 14 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 14, 104);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 14, 75);

-- OBJ 15 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (18, 15, 12);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (35, 15, 134);


------------------------------------------------------------
-- OBJEDNAVKA_ZBOZI pro objednavky 16–30
------------------------------------------------------------

-- OBJ 16 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 16, 58);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 16, 143);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (4, 16, 27);

-- OBJ 17 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (22, 17, 12);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (34, 17, 77);

-- OBJ 18 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 18, 41);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 18, 119);

-- OBJ 19 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 19, 68);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 19, 155);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (4, 19, 98);

-- OBJ 20 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (15, 20, 26);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (28, 20, 114);

-- OBJ 21 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (4, 21, 73);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 21, 131);

-- OBJ 22 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 22, 36);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (5, 22, 147);

-- OBJ 23 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (40, 23, 16);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (12, 23, 89);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (24, 23, 102);

-- OBJ 24 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 24, 55);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 24, 162);

-- OBJ 25 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 25, 12);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (4, 25, 180);

-- OBJ 26 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (20, 26, 77);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (45, 26, 133);

-- OBJ 27 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 27, 111);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 27, 108);

-- OBJ 28 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (5, 28, 54);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 28, 123);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (4, 28, 165);

-- OBJ 29 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 29, 64);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 29, 87);

-- OBJ 30 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (32, 30, 19);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (18, 30, 142);

------------------------------------------------------------
-- OBJEDNAVKA_ZBOZI (31–45)
------------------------------------------------------------

-- OBJ 31 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 31, 57);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (4, 31, 101);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 31, 133);

-- OBJ 32 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (28, 32, 18);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (16, 32, 92);

-- OBJ 33 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 33, 76);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 33, 145);

-- OBJ 34 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 34, 25);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 34, 172);

-- OBJ 35 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (34, 35, 14);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (21, 35, 89);

-- OBJ 36 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (4, 36, 68);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 36, 137);

-- OBJ 37 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 37, 42);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 37, 119);

-- OBJ 38 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 38, 97);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (5, 38, 156);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 38, 61);

-- OBJ 39 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (25, 39, 88);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (12, 39, 140);

-- OBJ 40 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 40, 11);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 40, 134);

-- OBJ 41 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (40, 41, 55);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (18, 41, 101);

-- OBJ 42 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 42, 19);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (5, 42, 147);

-- OBJ 43 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 43, 78);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 43, 131);

-- OBJ 44 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (32, 44, 17);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (15, 44, 99);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (22, 44, 154);

-- OBJ 45 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 45, 63);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (4, 45, 140);

------------------------------------------------------------
-- OBJEDNAVKA_ZBOZI (46–60)
------------------------------------------------------------

-- OBJ 46 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 46, 77);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 46, 145);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (4, 46, 52);

-- OBJ 47 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (28, 47, 19);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (14, 47, 63);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (22, 47, 138);

-- OBJ 48 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 48, 48);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (5, 48, 169);

-- OBJ 49 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 49, 33);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 49, 110);

-- OBJ 50 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (32, 50, 72);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (18, 50, 152);

-- OBJ 51 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (4, 51, 14);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 51, 127);

-- OBJ 52 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 52, 65);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (5, 52, 144);

-- OBJ 53 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (20, 53, 91);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (28, 53, 119);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (13, 53, 167);

-- OBJ 54 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 54, 101);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 54, 34);

-- OBJ 55 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (4, 55, 22);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 55, 150);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (5, 55, 89);

-- OBJ 56 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (31, 56, 71);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (45, 56, 128);

-- OBJ 57 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (2, 57, 44);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (3, 57, 109);

-- OBJ 58 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 58, 18);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (4, 58, 83);

-- OBJ 59 (DODAVATEL)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (26, 59, 29);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (19, 59, 101);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (14, 59, 146);

-- OBJ 60 (ZAKAZNIK)
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (5, 60, 53);
INSERT INTO OBJEDNAVKA_ZBOZI(POCET, ID_OBJEDNAVKA, ID_ZBOZI) VALUES (1, 60, 130);

------------------------------------------------------------
-- ZBOZI_DODAVATEL
------------------------------------------------------------
------------------------------------------------------------
-- FreshFoods — ovoce + zelenina
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (2, 89);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (2, 90);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (2, 91);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (2, 92);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (2, 93);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (2, 99);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (2, 100);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (2, 101);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (2, 102);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (2, 103);

-- AgroMaster — pečivo
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (3, 79);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (3, 80);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (3, 81);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (3, 82);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (3, 83);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (3, 84);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (3, 85);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (3, 86);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (3, 87);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (3, 88);

-- MeatMarket — maso
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 21);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 22);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 23);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 24);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 25);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 26);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 27);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 28);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 29);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 30);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 31);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 32);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 33);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 34);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 35);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 36);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 59);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 60);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 61);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 62);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 63);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 64);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 65);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 66);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 67);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (4, 68);

-- SunFruit — ovoce
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (5, 89);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (5, 90);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (5, 91);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (5, 92);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (5, 93);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (5, 94);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (5, 95);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (5, 96);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (5, 97);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (5, 98);

-- ChocoFactory — sladkosti
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 129);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 130);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 131);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 132);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 133);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 134);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 135);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 136);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 137);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 138);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 139);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 140);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 141);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 142);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 143);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 144);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 145);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 146);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 147);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (6, 148);

-- AquaTrace — napoje
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 109);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 110);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 111);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 112);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 113);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 114);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 115);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 116);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 117);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 118);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 119);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 120);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 121);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 122);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 123);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 124);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 125);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 126);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 127);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (7, 128);

-- AquaTrace — zelenina
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (8, 99);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (8, 100);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (8, 101);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (8, 102);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (8, 103);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (8, 104);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (8, 105);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (8, 106);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (8, 107);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (8, 108);


-- NordicFoods — mix
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (10, 1);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (10, 2);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (10, 3);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (10, 10);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (10, 15);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (10, 21);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (10, 24);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (10, 27);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (10, 30);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (10, 33);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (10, 60);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (10, 63);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (10, 66);

-- BioFreshCZ — mražené
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 37);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 38);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 39);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 40);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 41);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 42);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 43);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 44);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 45);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 46);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 47);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 48);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 49);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 50);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 51);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 52);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 53);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 54);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 55);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 56);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 57);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (11, 58);

-- MeatExpress — maso
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (12, 21);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (12, 22);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (12, 25);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (12, 28);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (12, 31);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (12, 35);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (12, 59);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (12, 60);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (12, 63);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (12, 65);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (12, 67);

-- UrbanFarm — zelenina
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (13, 99);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (13, 101);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (13, 102);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (13, 105);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (13, 108);

-- PrimaPec — pečivo
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (14, 79);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (14, 80);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (14, 82);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (14, 85);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (14, 87);

-- RoyalDrinks — alkohol + napoje
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (15, 110);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (15, 112);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (15, 118);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (15, 120);

INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (15, 169);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (15, 170);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (15, 175);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (15, 178);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (15, 183);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (15, 187);

-- PureMilk Dist. — mléčné
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (16, 1);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (16, 3);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (16, 5);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (16, 8);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (16, 11);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (16, 14);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (16, 17);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (16, 19);

-- GreenValley Export — ovoce
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (17, 89);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (17, 92);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (17, 93);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (17, 96);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (17, 98);

-- OvocePlus — ovoce
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (18, 90);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (18, 91);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (18, 94);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (18, 97);

-- CukrarnaSupply — sladkosti
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (19, 129);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (19, 131);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (19, 133);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (19, 135);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (19, 137);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (19, 140);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (19, 142);
INSERT INTO ZBOZI_DODAVATEL(ID_UZIVATELU, ID_ZBOZI) VALUES (19, 146);

------------------------------------------------------------
-- ARCHIV - root
------------------------------------------------------------
INSERT INTO ARCHIV (Nazev, Popis, Parent_id) VALUES ('Hlavní Archiv Supermarketu', 'Kořenová složka archivu', NULL);
------------------------------------------------------------
INSERT INTO ARCHIV (Nazev, Parent_id) VALUES ('Uzivatele', 1);
INSERT INTO ARCHIV (Nazev, Popis, Parent_id) VALUES ('Global Log', 'Globální logy', 1);
INSERT INTO ARCHIV (Nazev, Popis, Parent_id) VALUES ('UCTY', 'Ucty uzivatelu', 1);

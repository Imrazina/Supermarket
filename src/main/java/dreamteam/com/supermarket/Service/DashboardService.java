package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.DashboardResponse;
import dreamteam.com.supermarket.model.Log;
import dreamteam.com.supermarket.model.location.Adresa;
import dreamteam.com.supermarket.model.location.Mesto;
import dreamteam.com.supermarket.model.market.*;
import dreamteam.com.supermarket.model.payment.Platba;
import dreamteam.com.supermarket.model.user.*;
import dreamteam.com.supermarket.repository.ArchiveProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final Locale LOCALE_CZ = new Locale("cs", "CZ");
    private static final ThreadLocal<NumberFormat> CURRENCY_FORMAT =
            ThreadLocal.withInitial(() -> NumberFormat.getCurrencyInstance(LOCALE_CZ));
    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm", LOCALE_CZ);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final ZboziJdbcService zboziJdbcService;
    private final KategorieZboziJdbcService kategorieZboziJdbcService;
    private final SkladJdbcService skladJdbcService;
    private final SupermarketJdbcService supermarketJdbcService;
    private final ObjednavkaJdbcService objednavkaJdbcService;
    private final ObjednavkaStatusJdbcService objednavkaStatusJdbcService;
    private final ObjednavkaZboziJdbcService objednavkaZboziJdbcService;
    private final ZamestnanecJdbcService zamestnanecJdbcService;
    private final ZakaznikJdbcService zakaznikJdbcService;
    private final DodavatelJdbcService dodavatelJdbcService;
    private final DodavatelZboziJdbcService dodavatelZboziJdbcService;
    private final PlatbaJdbcService platbaJdbcService;
    private final LogJdbcService logJdbcService;
    private final ArchiveProcedureDao archiveDao;
    private final MessageJdbcService messageJdbcService;
    private final NotifikaceJdbcService notifikaceJdbcService;
    private final RoleJdbcService roleJdbcService;
    private final UserJdbcService userJdbcService;
    private final RolePravoJdbcService rolePravoJdbcService;

    @Transactional(readOnly = true)
    public DashboardResponse buildSnapshot(Uzivatel currentUser) {
        currentUser = userJdbcService.findById(currentUser.getIdUzivatel());
        if (currentUser == null) {
            throw new IllegalArgumentException("Uzivatel neexistuje.");
        }
        LocalDateTime now = LocalDateTime.now();

        List<Zbozi> goods = zboziJdbcService.findAll();
        List<Sklad> warehouses = skladJdbcService.findAll();
        List<Supermarket> supermarkets = supermarketJdbcService.findAll();
        List<ObjednavkaStatus> statuses = objednavkaStatusJdbcService.findAll();
        Map<Long, ObjednavkaStatus> statusMap = statuses.stream()
                .collect(Collectors.toMap(ObjednavkaStatus::getIdStatus, Function.identity()));
        List<Uzivatel> allUsers = userJdbcService.findAll();
        Map<Long, Uzivatel> userMap = allUsers.stream()
                .collect(Collectors.toMap(Uzivatel::getIdUzivatel, Function.identity(), (a, b) -> a));
        List<Objednavka> orders = objednavkaJdbcService.findAll().stream()
                .map(row -> {
                    Objednavka o = new Objednavka();
                    o.setIdObjednavka(row.id());
                    o.setDatum(row.datum());
                    o.setStatus(statusMap.get(row.statusId()));
                    o.setTypObjednavka(row.typObjednavka());

                    Uzivatel u = userMap.getOrDefault(row.uzivatelId(), null);
                    if (u == null && row.uzivatelId() != null) {
                        Uzivatel stub = new Uzivatel();
                        stub.setIdUzivatel(row.uzivatelId());
                        stub.setJmeno(row.uzivatelJmeno());
                        stub.setPrijmeni(row.uzivatelPrijmeni());
                        stub.setEmail(row.uzivatelEmail());
                        u = stub;
                    }
                    o.setUzivatel(u);

                    Supermarket sm = null;
                    if (row.supermarketId() != null) {
                        sm = new Supermarket();
                        sm.setIdSupermarket(row.supermarketId());
                        sm.setNazev(row.supermarketNazev());
                    }
                    o.setSupermarket(sm);
                    return o;
                })
                .toList();
        List<ObjednavkaZbozi> orderLines = orders.stream()
                .flatMap(o -> objednavkaZboziJdbcService.findByObjednavka(o.getIdObjednavka()).stream())
                .toList();
        List<Zamestnanec> employees = zamestnanecJdbcService.findAll();
        List<Zakaznik> customers = zakaznikJdbcService.findAll();
        List<Dodavatel> suppliers = dodavatelJdbcService.findAll();
        List<PlatbaJdbcService.PlatbaDetail> paymentRows = platbaJdbcService.findByTyp(null);
        List<LogJdbcService.LogWithPath> logs = logJdbcService.findRecentWithPath();
        List<Zpravy> messages = messageJdbcService.findTop100WithParticipants().stream()
                .limit(10)
                .toList();
        List<Notifikace> subscribers = notifikaceJdbcService.findAll();
        List<ArchiveProcedureDao.ArchiveNode> archiveTree = archiveDao.getTree();
        List<Role> roles = roleJdbcService.findAll();
        List<DodavatelZbozi> supplierRelations = dodavatelZboziJdbcService.findAll();

        Map<Long, List<DodavatelZbozi>> suppliersByZbozi = supplierRelations.stream()
                .collect(Collectors.groupingBy(rel -> rel.getId().getZboziId()));

        Map<Long, Double> orderAmounts = paymentRows.stream()
                .collect(Collectors.groupingBy(
                        PlatbaJdbcService.PlatbaDetail::objednavkaId,
                        Collectors.summingDouble(p -> p.castka() != null ? p.castka().doubleValue() : 0d)
                ));

        Map<Long, Long> goodsPerCategory = goods.stream()
                .filter(z -> z.getKategorie() != null)
                .collect(Collectors.groupingBy(z -> z.getKategorie().getIdKategorie(), Collectors.counting()));

        Map<Long, BigDecimal> turnoverPerCategory = goods.stream()
                .filter(z -> z.getKategorie() != null && z.getCena() != null)
                .collect(Collectors.groupingBy(
                        z -> z.getKategorie().getIdKategorie(),
                        Collectors.reducing(BigDecimal.ZERO,
                                z -> z.getCena().multiply(BigDecimal.valueOf(z.getMnozstvi())),
                                BigDecimal::add)
                ));

        Map<Long, Integer> stockPerWarehouse = goods.stream()
                .filter(z -> z.getSklad() != null)
                .collect(Collectors.groupingBy(
                        z -> z.getSklad().getIdSklad(),
                        Collectors.summingInt(Zbozi::getMnozstvi)
                ));

        Map<Long, Long> roleCounts = allUsers.stream()
                .filter(user -> user.getRole() != null)
                .collect(Collectors.groupingBy(u -> u.getRole().getIdRole(), Collectors.counting()));

        Map<Long, Long> statusCounts = orders.stream()
                .filter(order -> order.getStatus() != null)
                .collect(Collectors.groupingBy(o -> o.getStatus().getIdStatus(), Collectors.counting()));

        List<DashboardResponse.InventoryItem> inventory = goods.stream()
                .map(zbozi -> {
                    String supplierName = suppliersByZbozi.getOrDefault(zbozi.getIdZbozi(), List.of())
                            .stream()
                            .map(DodavatelZbozi::getDodavatel)
                            .map(Dodavatel::getFirma)
                            .filter(Objects::nonNull)
                            .findFirst()
                            .orElse("N/A");

                    String warehouseName = zbozi.getSklad() != null ? zbozi.getSklad().getNazev() : "Neuvedeno";
                    String supermarketName = (zbozi.getSklad() != null && zbozi.getSklad().getSupermarket() != null)
                            ? zbozi.getSklad().getSupermarket().getNazev()
                            : "Neuvedeno";
                    String category = zbozi.getKategorie() != null ? zbozi.getKategorie().getNazev() : "Bez kategorie";

                    String status = zbozi.getMnozstvi() <= zbozi.getMinMnozstvi()
                            ? "critical"
                            : "ok";

                    return new DashboardResponse.InventoryItem(
                            "SKU-" + zbozi.getIdZbozi(),
                            zbozi.getNazev(),
                            category,
                            warehouseName,
                            supermarketName,
                            supplierName,
                            zbozi.getMnozstvi(),
                            zbozi.getMinMnozstvi(),
                            "—",
                            status
                    );
                })
                .toList();

        List<DashboardResponse.CategoryStat> categoryStats = kategorieZboziJdbcService.findAll().stream()
                .map(cat -> new DashboardResponse.CategoryStat(
                        cat.getNazev(),
                        goodsPerCategory.getOrDefault(cat.getIdKategorie(), 0L),
                        formatCurrency(turnoverPerCategory.getOrDefault(cat.getIdKategorie(), BigDecimal.ZERO)),
                        "N/A"
                ))
                .toList();

        List<DashboardResponse.WarehouseInfo> warehouseInfos = warehouses.stream()
                .map(sklad -> {
                    long capacity = sklad.getKapacita() != null ? sklad.getKapacita() : 0;
                    int used = 0;
                    if (capacity > 0) {
                        int stock = stockPerWarehouse.getOrDefault(sklad.getIdSklad(), 0);
                        used = Math.min(100, (int) Math.round(stock * 100.0 / capacity));
                    }
                    return new DashboardResponse.WarehouseInfo(
                            "SKL-" + sklad.getIdSklad(),
                            sklad.getNazev(),
                            capacity,
                            used,
                            sklad.getTelefonniCislo()
                    );
                })
                .toList();

        List<DashboardResponse.OrderInfo> orderInfos = orders.stream()
                .sorted(Comparator.comparing(Objednavka::getDatum).reversed())
                .map(order -> {
                    String employeeName = order.getUzivatel() != null
                            ? order.getUzivatel().getJmeno() + " " + order.getUzivatel().getPrijmeni()
                            : "Neuvedeno";
                    String supplierName = order.getSupermarket() != null ? order.getSupermarket().getNazev() : "—";
                    String statusLabel = order.getStatus() != null ? order.getStatus().getNazev() : "Neznámý";
                    String statusCode = order.getStatus() != null ? String.valueOf(order.getStatus().getIdStatus()) : "0";
                    double amount = orderAmounts.getOrDefault(order.getIdObjednavka(), 0d);
                    String priority = amount > 100000 ? "high" : amount > 10000 ? "medium" : "low";
                    return new DashboardResponse.OrderInfo(
                            "PO-" + order.getIdObjednavka(),
                            order.getTypObjednavka(),
                            order.getSupermarket() != null ? order.getSupermarket().getNazev() : "Neuvedeno",
                            employeeName,
                            supplierName,
                            statusLabel,
                            statusCode,
                            order.getDatum() != null ? order.getDatum().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "",
                            amount,
                            priority
                    );
                })
                .toList();

        List<DashboardResponse.OrderLine> orderLineDtos = orderLines.stream()
                .map(line -> new DashboardResponse.OrderLine(
                        "PO-" + line.getObjednavka().getIdObjednavka(),
                        "SKU-" + line.getZbozi().getIdZbozi(),
                        line.getZbozi().getNazev(),
                        line.getPocet(),
                        line.getZbozi().getCena() != null ? line.getZbozi().getCena().doubleValue() : 0d
                ))
                .toList();

        List<DashboardResponse.StatusInfo> statusInfos = statuses.stream()
                .map(status -> new DashboardResponse.StatusInfo(
                        String.valueOf(status.getIdStatus()),
                        status.getNazev(),
                        statusCounts.getOrDefault(status.getIdStatus(), 0L)
                ))
                .toList();

        List<DashboardResponse.EmployeeInfo> employeeInfos = employees.stream()
                .map(emp -> {
                    Uzivatel user = emp.getUzivatel();
                    return new DashboardResponse.EmployeeInfo(
                            "EMP-" + emp.getId(),
                            user != null ? user.getJmeno() + " " + user.getPrijmeni() : "Neuvedeno",
                            emp.getPozice(),
                            emp.getDatumNastupa() != null ? emp.getDatumNastupa().toString() : "",
                            emp.getMzda() != null ? emp.getMzda().doubleValue() : 0d,
                            user != null ? user.getTelefonniCislo() : "",
                            user != null && user.getRole() != null ? user.getRole().getNazev() : ""
                    );
                })
                .toList();

        List<DashboardResponse.CustomerInfo> customerInfos = customers.stream()
                .map(customer -> {
                    Uzivatel user = customer.getUzivatel();
                    return new DashboardResponse.CustomerInfo(
                            "CST-" + customer.getId(),
                            user != null ? user.getJmeno() + " " + user.getPrijmeni() : "Neuvedeno",
                            customer.getKartaVernosti(),
                            user != null ? user.getEmail() : "",
                            user != null ? user.getTelefonniCislo() : ""
                    );
                })
                .toList();

        List<DashboardResponse.SupplierInfo> supplierInfos = suppliers.stream()
                .map(supplier -> {
                    Uzivatel user = supplier.getUzivatel();
                    Adresa addr = user != null ? user.getAdresa() : null;
                    String contact = addr != null ? addr.getUlice() + " " + addr.getCisloPopisne() : "Neuvedeno";
                    return new DashboardResponse.SupplierInfo(
                            "SUP-" + supplier.getId(),
                            supplier.getFirma(),
                            contact,
                            user != null ? user.getTelefonniCislo() : "",
                            "A"
                    );
                })
                .toList();

        List<DashboardResponse.RoleInfo> roleInfos = roles.stream()
                .map(role -> new DashboardResponse.RoleInfo(
                        role.getNazev(),
                        "Uživatelé s rolí " + role.getNazev(),
                        roleCounts.getOrDefault(role.getIdRole(), 0L)
                ))
                .toList();

        List<DashboardResponse.AddressInfo> addressInfos = supermarkets.stream()
                .map(this::mapAddressInfo)
                .filter(Objects::nonNull)
                .toList();

        List<DashboardResponse.PaymentInfo> paymentInfos = paymentRows.stream()
                .sorted(Comparator.comparing(PlatbaJdbcService.PlatbaDetail::datum).reversed())
                .map(payment -> {
                    String typ = payment.platbaTyp() != null ? payment.platbaTyp().trim() : "";
                    return new DashboardResponse.PaymentInfo(
                            "PMT-" + payment.id(),
                            "PO-" + payment.objednavkaId(),
                            typ, // kód H/K/U pro filtr
                            resolveMethod(typ, payment),
                            payment.castka() != null ? payment.castka().doubleValue() : 0d,
                            payment.datum() != null ? payment.datum().format(DATE_FORMAT) : "",
                            "Zpracováno",
                            true
                    );
                })
                .toList();

        List<DashboardResponse.LogInfo> logInfos = logs.stream()
                .map(log -> new DashboardResponse.LogInfo(
                        log.tableName(),
                        log.operation(),
                        log.archivPath() != null ? log.archivPath() : "Archiv",
                        log.timestamp() != null ? DATE_TIME_FORMAT.format(log.timestamp()) : "",
                        log.popis() != null ? log.popis() : ("ID " + log.idRekord())
                ))
                .toList();

        List<DashboardResponse.MessageInfo> messageInfos = messages.stream()
                .map(message -> new DashboardResponse.MessageInfo(
                        message.getSender() != null ? message.getSender().getEmail() : "N/A",
                        message.getReceiver() != null ? message.getReceiver().getEmail() : "N/A",
                        truncate(message.getContent(), 120),
                        message.getDatumZasilani() != null ? message.getDatumZasilani().format(DATE_TIME_FORMAT) : ""
                ))
                .toList();

        List<DashboardResponse.SubscriberInfo> subscriberInfos = subscribers.stream()
                .map(sub -> new DashboardResponse.SubscriberInfo(
                        sub.getEndPoint(),
                        truncate(sub.getAuthToken(), 12),
                        sub.getZprava() != null && sub.getZprava().getDatumZasilani() != null
                                ? sub.getZprava().getDatumZasilani().format(DATE_FORMAT)
                                : DATE_FORMAT.format(LocalDate.now())
                ))
                .toList();

        List<DashboardResponse.StoreInfo> storeInfos = supermarkets.stream()
                .map(store -> {
                    String warehouseName = warehouses.stream()
                            .filter(sklad -> sklad.getSupermarket() != null && sklad.getSupermarket().getIdSupermarket().equals(store.getIdSupermarket()))
                            .map(Sklad::getNazev)
                            .findFirst()
                            .orElse("Bez skladu");
                    return new DashboardResponse.StoreInfo(
                            store.getNazev(),
                            store.getAdresa() != null && store.getAdresa().getMesto() != null ? store.getAdresa().getMesto().getNazev() : "",
                            store.getAdresa() != null ? store.getAdresa().getUlice() + " " + store.getAdresa().getCisloPopisne() : "",
                            warehouseName,
                            "Neuvedeno",
                            "Otevřeno"
                    );
                })
                .toList();

        List<DashboardResponse.FolderInfo> folderInfos = buildFolders(archiveTree);

        List<DashboardResponse.CustomerProduct> customerProducts = goods.stream()
                .sorted(Comparator.comparing(
                        z -> z.getNazev() == null ? "" : z.getNazev().toLowerCase(LOCALE_CZ)))
                .map(zbozi -> {
                    long qty = zbozi.getMnozstvi() != null ? zbozi.getMnozstvi() : 0;
                    long min = zbozi.getMinMnozstvi() != null ? zbozi.getMinMnozstvi() : 0;
                    String category = (zbozi.getKategorie() != null && zbozi.getKategorie().getNazev() != null)
                            ? zbozi.getKategorie().getNazev()
                            : "Bez kategorie";
                    String description = (zbozi.getPopis() != null && !zbozi.getPopis().isBlank())
                            ? zbozi.getPopis()
                            : "Bez popisu";
                    String badge = qty <= min ? "Doplnit" : "Skladem";
                    return new DashboardResponse.CustomerProduct(
                            "SKU-" + zbozi.getIdZbozi(),
                            zbozi.getNazev(),
                            category,
                            zbozi.getCena() != null ? zbozi.getCena().doubleValue() : 0d,
                            badge,
                            description,
                            "🛒"
                    );
                })
                .toList();

        List<String> suggestions = inventory.stream()
                .filter(item -> item.stock() <= item.minStock())
                .limit(3)
                .map(item -> "Doplnit " + item.name() + " (zbývá " + item.stock() + " ks)")
                .toList();

        DashboardResponse.Profile profile = buildProfile(currentUser, now, storeInfos.size(), orders.size(), logs.size());

        List<DashboardResponse.ArchiveNode> archiveNodes = archiveTree.stream()
                .map(node -> new DashboardResponse.ArchiveNode(
                        node.id(),
                        node.name(),
                        node.parentId(),
                        node.level(),
                        node.path()
                ))
                .toList();

        Long unreadMessages = 0L;
        String lastMessageSummary = messages.isEmpty()
                ? "Zadne zpravy"
                : Objects.requireNonNullElse(messages.get(0).getContent(), "Zadne zpravy");
        return new DashboardResponse(
                now.format(DATE_TIME_FORMAT),
                buildWeeklyDemand(orders),
                inventory,
                categoryStats,
                warehouseInfos,
                orderInfos,
                orderLineDtos,
                statusInfos,
                employeeInfos,
                customerInfos,
                supplierInfos,
                roleInfos,
                addressInfos,
                paymentInfos,
                logInfos,
                messageInfos,
                unreadMessages,
                lastMessageSummary,
                subscriberInfos,
                storeInfos,
                profile,
                folderInfos,
                customerProducts,
                suggestions,
                archiveNodes
        );
    }

    private DashboardResponse.AddressInfo mapAddressInfo(Supermarket supermarket) {
        Adresa adresa = supermarket.getAdresa();
        if (adresa == null) {
            return null;
        }
        Mesto mesto = adresa.getMesto();
        String city = mesto != null ? mesto.getNazev() : "";
        String kraj = mesto != null ? mesto.getKraj() : "";
        String zip = mesto != null ? mesto.getPsc() : "";
        return new DashboardResponse.AddressInfo(
                supermarket.getNazev(),
                city,
                adresa.getUlice() + " " + adresa.getCisloPopisne(),
                zip,
                kraj
        );
    }

    private List<DashboardResponse.WeeklyDemandPoint> buildWeeklyDemand(List<Objednavka> orders) {
        if (orders.isEmpty()) {
            return List.of();
        }
        Map<DayOfWeek, Long> counts = orders.stream()
                .filter(order -> order.getDatum() != null)
                .collect(Collectors.groupingBy(order -> order.getDatum().getDayOfWeek(), Collectors.counting()));

        List<DayOfWeek> order = List.of(
                DayOfWeek.MONDAY,
                DayOfWeek.TUESDAY,
                DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY,
                DayOfWeek.FRIDAY,
                DayOfWeek.SATURDAY,
                DayOfWeek.SUNDAY
        );

        Map<DayOfWeek, String> labels = Map.of(
                DayOfWeek.MONDAY, "Po",
                DayOfWeek.TUESDAY, "Út",
                DayOfWeek.WEDNESDAY, "St",
                DayOfWeek.THURSDAY, "Čt",
                DayOfWeek.FRIDAY, "Pá",
                DayOfWeek.SATURDAY, "So",
                DayOfWeek.SUNDAY, "Ne"
        );

        return order.stream()
                .map(day -> new DashboardResponse.WeeklyDemandPoint(
                        labels.get(day),
                        counts.getOrDefault(day, 0L)
                ))
                .toList();
    }

    private List<DashboardResponse.FolderInfo> buildFolders(List<ArchiveProcedureDao.ArchiveNode> archiveTree) {
        if (archiveTree.isEmpty()) {
            return List.of();
        }
        List<String> colors = List.of("#ff9f43", "#34d399", "#a855f7", "#4361ee", "#f87171");
        AtomicInteger index = new AtomicInteger(0);
        return archiveTree.stream()
                .map(node -> {
                    String color = colors.get(index.getAndIncrement() % colors.size());
                    List<DashboardResponse.FileInfo> fileInfos = archiveDao.getFiles(node.id(), null, 5).stream()
                            .map(file -> new DashboardResponse.FileInfo(
                                    file.name(),
                                    file.type(),
                                    node.name(),
                                    Optional.ofNullable(file.owner()).orElse("N/A"),
                                    file.updated() != null ? DATE_FORMAT.format(file.updated().toLocalDate()) : ""
                            ))
                            .toList();
                    return new DashboardResponse.FolderInfo(node.name(), color, fileInfos);
                })
                .toList();
    }

    private DashboardResponse.Profile buildProfile(Uzivatel currentUser,
                                                   LocalDateTime now,
                                                   long storeCount,
                                                   long approvals,
                                                   long automations) {
        String fullName = currentUser.getJmeno() + " " + currentUser.getPrijmeni();
        Adresa adresa = currentUser.getAdresa();
        String location = adresa != null && adresa.getMesto() != null
                ? adresa.getMesto().getNazev()
                : "";
        DashboardResponse.Profile.AddressDetails addressDetails = adresa == null ? null :
                new DashboardResponse.Profile.AddressDetails(
                        adresa.getUlice(),
                        adresa.getCisloPopisne(),
                        adresa.getCisloOrientacni(),
                        adresa.getMesto() != null ? adresa.getMesto().getNazev() : "",
                        adresa.getMesto() != null ? adresa.getMesto().getPsc() : ""
                );

        Zamestnanec employee = zamestnanecJdbcService.findById(currentUser.getIdUzivatel());
        Zakaznik customer = zakaznikJdbcService.findById(currentUser.getIdUzivatel());
        Dodavatel supplier = dodavatelJdbcService.findById(currentUser.getIdUzivatel());
        String roleName = currentUser.getRole() != null ? currentUser.getRole().getNazev() : "Uživatel";
        String position = employee != null ? employee.getPozice() : roleName;
        DashboardResponse.Profile.EmploymentDetails employmentDetails = employee == null ? null :
                new DashboardResponse.Profile.EmploymentDetails(
                        employee.getPozice(),
                        employee.getMzda() != null ? employee.getMzda().doubleValue() : 0d,
                        employee.getDatumNastupa() != null ? employee.getDatumNastupa().toString() : ""
                );

        List<String> permissions = currentUser.getRole() == null
                ? List.of()
                : rolePravoJdbcService.findCodesByRoleId(currentUser.getRole().getIdRole());

        List<DashboardResponse.Profile.Activity> activity = logJdbcService.findTop10()
                .stream()
                .limit(4)
                .map(log -> new DashboardResponse.Profile.Activity(
                        log.getDatumZmeny() != null ? log.getDatumZmeny().format(DATE_TIME_FORMAT) : now.format(DATE_TIME_FORMAT),
                        log.getTabulkaNazev() + " · " + (log.getOperace() != null ? log.getOperace() : ""),
                        "info"
                ))
                .toList();

        String group = resolveProfileGroup(currentUser, employee, customer, supplier);
        DashboardResponse.Profile.CustomerDetails customerDetails = customer == null ? null :
                new DashboardResponse.Profile.CustomerDetails(customer.getKartaVernosti());
        DashboardResponse.Profile.SupplierDetails supplierDetails = supplier == null ? null :
                new DashboardResponse.Profile.SupplierDetails(supplier.getFirma());

        return new DashboardResponse.Profile(
                currentUser.getJmeno(),
                currentUser.getPrijmeni(),
                fullName,
                position,
                roleName,
                group,
                currentUser.getEmail(),
                currentUser.getTelefonniCislo(),
                location,
                "GMT+1",
                now.format(DATE_TIME_FORMAT),
                storeCount,
                approvals,
                Math.max(1, automations / 4),
                Math.max(1, automations / 6),
                permissions,
                new DashboardResponse.Profile.Preferences("Čeština", "Světlé", "Push + e-mail", true),
                new DashboardResponse.Profile.Security("MFA aktivní", "Web konzole", "127.0.0.1"),
                activity,
                addressDetails,
                employmentDetails,
                customerDetails,
                supplierDetails
        );
    }

    private String resolveProfileGroup(Uzivatel currentUser,
                                       Zamestnanec employee,
                                       Zakaznik customer,
                                       Dodavatel supplier) {
        String roleName = currentUser.getRole() != null ? currentUser.getRole().getNazev() : "";
        if ("ADMIN".equalsIgnoreCase(roleName)) {
            return "ADMIN";
        }
        if (employee != null) {
            return "ZAMESTNANEC";
        }
        if (customer != null) {
            return "ZAKAZNIK";
        }
        if (supplier != null) {
            return "DODAVATEL";
        }
        return "UZIVATEL";
    }

    private String resolveMethod(String typ, PlatbaJdbcService.PlatbaDetail platba) {
        if ("K".equalsIgnoreCase(typ)) {
            String number = platba.cisloKarty();
            if (number != null && number.length() > 4) {
                return "Karta •••• " + number.substring(number.length() - 4);
            }
            return "Platební karta";
        }
        if ("H".equalsIgnoreCase(typ)) {
            return "Hotově";
        }
        if ("U".equalsIgnoreCase(typ)) {
            return "Účet";
        }
        return "Pokladna #" + platba.id();
    }

    private String formatCurrency(BigDecimal value) {
        return CURRENCY_FORMAT.get().format(value);
    }

    private String truncate(String text, int length) {
        if (text == null) {
            return "";
        }
        return text.length() <= length ? text : text.substring(0, length) + "…";
    }
}

package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.DashboardResponse;
import dreamteam.com.supermarket.model.Archiv;
import dreamteam.com.supermarket.model.Log;
import dreamteam.com.supermarket.model.Soubor;
import dreamteam.com.supermarket.model.location.Adresa;
import dreamteam.com.supermarket.model.location.Mesto;
import dreamteam.com.supermarket.model.market.*;
import dreamteam.com.supermarket.model.payment.Platba;
import dreamteam.com.supermarket.model.user.*;
import dreamteam.com.supermarket.repository.*;
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

    private final ZboziRepository zboziRepository;
    private final KategorieZboziRepository kategorieZboziRepository;
    private final SkladRepository skladRepository;
    private final SupermarketRepository supermarketRepository;
    private final ObjednavkaRepository objednavkaRepository;
    private final ObjednavkaStatusRepository objednavkaStatusRepository;
    private final ObjednavkaZboziRepository objednavkaZboziRepository;
    private final ZamestnanecRepository zamestnanecRepository;
    private final ZakaznikRepository zakaznikRepository;
    private final DodavatelRepository dodavatelRepository;
    private final DodavatelZboziRepository dodavatelZboziRepository;
    private final PlatbaRepository platbaRepository;
    private final LogRepository logRepository;
    private final SouborRepository souborRepository;
    private final ArchivRepository archivRepository;
    private final ZpravyRepository zpravyRepository;
    private final NotifikaceRepository notifikaceRepository;
    private final RoleRepository roleRepository;
    private final UzivatelRepository uzivatelRepository;

    @Transactional(readOnly = true)
    public DashboardResponse buildSnapshot(Uzivatel currentUser) {
        LocalDateTime now = LocalDateTime.now();

        List<Zbozi> goods = zboziRepository.findAll();
        List<Sklad> warehouses = skladRepository.findAll();
        List<Supermarket> supermarkets = supermarketRepository.findAll();
        List<Objednavka> orders = objednavkaRepository.findAll();
        List<ObjednavkaStatus> statuses = objednavkaStatusRepository.findAll();
        List<ObjednavkaZbozi> orderLines = objednavkaZboziRepository.findAll();
        List<Zamestnanec> employees = zamestnanecRepository.findAll();
        List<Zakaznik> customers = zakaznikRepository.findAll();
        List<Dodavatel> suppliers = dodavatelRepository.findAll();
        List<Platba> payments = platbaRepository.findAll();
        List<Log> logs = logRepository.findTop10ByOrderByDatumZmenyDesc();
        List<Zpravy> messages = zpravyRepository.findTop10ByOrderByDatumZasilaniDesc();
        List<Notifikace> subscribers = notifikaceRepository.findAll();
        List<Archiv> archives = archivRepository.findAll();
        List<Role> roles = roleRepository.findAll();
        List<Uzivatel> allUsers = uzivatelRepository.findAll();
        List<DodavatelZbozi> supplierRelations = dodavatelZboziRepository.findAll();

        Map<Long, List<DodavatelZbozi>> suppliersByZbozi = supplierRelations.stream()
                .collect(Collectors.groupingBy(rel -> rel.getId().getZboziId()));

        Map<Long, Double> orderAmounts = payments.stream()
                .collect(Collectors.groupingBy(
                        platba -> platba.getObjednavka().getIdObjednavka(),
                        Collectors.summingDouble(p -> p.getCastka().doubleValue())
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

        List<DashboardResponse.CategoryStat> categoryStats = kategorieZboziRepository.findAll().stream()
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

        List<DashboardResponse.PaymentInfo> paymentInfos = payments.stream()
                .sorted(Comparator.comparing(Platba::getDatum).reversed())
                .map(payment -> new DashboardResponse.PaymentInfo(
                        "PMT-" + payment.getIdPlatba(),
                        "PO-" + payment.getObjednavka().getIdObjednavka(),
                        payment.getPlatbaTyp(),
                        resolveMethod(payment),
                        payment.getCastka() != null ? payment.getCastka().doubleValue() : 0d,
                        payment.getDatum() != null ? payment.getDatum().format(DATE_FORMAT) : "",
                        "Zpracováno",
                        true
                ))
                .toList();

        List<DashboardResponse.LogInfo> logInfos = logs.stream()
                .map(log -> new DashboardResponse.LogInfo(
                        log.getTabulkaNazev(),
                        log.getOperace(),
                        "system",
                        log.getDatumZmeny() != null ? log.getDatumZmeny().format(DATE_TIME_FORMAT) : "",
                        log.getPopis() != null ? log.getPopis() : "-"
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

        List<DashboardResponse.FolderInfo> folderInfos = buildFolders(archives);

        List<DashboardResponse.CustomerProduct> customerProducts = goods.stream()
                .sorted(Comparator.comparing(Zbozi::getMnozstvi))
                .limit(8)
                .map(zbozi -> new DashboardResponse.CustomerProduct(
                        "SKU-" + zbozi.getIdZbozi(),
                        zbozi.getNazev(),
                        zbozi.getKategorie() != null ? zbozi.getKategorie().getNazev() : "—",
                        zbozi.getCena() != null ? zbozi.getCena().doubleValue() : 0d,
                        zbozi.getMnozstvi() <= zbozi.getMinMnozstvi() ? "Doplnit" : "Top",
                        zbozi.getPopis() != null ? zbozi.getPopis() : "Bez popisu",
                        "🛒"
                ))
                .toList();

        List<String> suggestions = inventory.stream()
                .filter(item -> item.stock() <= item.minStock())
                .limit(3)
                .map(item -> "Doplnit " + item.name() + " (zbývá " + item.stock() + " ks)")
                .toList();

        DashboardResponse.Profile profile = buildProfile(currentUser, now, storeInfos.size(), orders.size(), logs.size());

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
                subscriberInfos,
                storeInfos,
                profile,
                folderInfos,
                customerProducts,
                suggestions
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

    private List<DashboardResponse.FolderInfo> buildFolders(List<Archiv> archives) {
        if (archives.isEmpty()) {
            return List.of();
        }
        List<String> colors = List.of("#ff9f43", "#34d399", "#a855f7", "#4361ee", "#f87171");
        AtomicInteger index = new AtomicInteger(0);
        return archives.stream()
                .map(archiv -> {
                    String color = colors.get(index.getAndIncrement() % colors.size());
                    List<Soubor> files = souborRepository.findByArchivOrderByDatumModifikaceDesc(archiv);
                    List<DashboardResponse.FileInfo> fileInfos = files.stream()
                            .map(file -> new DashboardResponse.FileInfo(
                                    file.getNazev(),
                                    file.getTyp(),
                                    archiv.getNazev(),
                                    file.getVlastnik() != null && file.getVlastnik().getUzivatel() != null
                                            ? file.getVlastnik().getUzivatel().getJmeno() + " " + file.getVlastnik().getUzivatel().getPrijmeni()
                                            : "N/A",
                                    file.getDatumModifikace() != null ? file.getDatumModifikace().format(DATE_FORMAT) : ""
                            ))
                            .toList();
                    return new DashboardResponse.FolderInfo(archiv.getNazev(), color, fileInfos);
                })
                .toList();
    }

    private DashboardResponse.Profile buildProfile(Uzivatel currentUser,
                                                   LocalDateTime now,
                                                   long storeCount,
                                                   long approvals,
                                                   long automations) {
        String fullName = currentUser.getJmeno() + " " + currentUser.getPrijmeni();
        String location = currentUser.getAdresa() != null && currentUser.getAdresa().getMesto() != null
                ? currentUser.getAdresa().getMesto().getNazev()
                : "Nedefinováno";

        List<String> permissions = List.of("Objednávky", "Finance", "Inventář", "Archiv");

        List<DashboardResponse.Profile.Activity> activity = logRepository.findTop10ByOrderByDatumZmenyDesc()
                .stream()
                .limit(4)
                .map(log -> new DashboardResponse.Profile.Activity(
                        log.getDatumZmeny() != null ? log.getDatumZmeny().format(DATE_TIME_FORMAT) : now.format(DATE_TIME_FORMAT),
                        log.getTabulkaNazev() + " · " + (log.getOperace() != null ? log.getOperace() : ""),
                        "info"
                ))
                .toList();

        return new DashboardResponse.Profile(
                fullName,
                currentUser.getRole() != null ? currentUser.getRole().getNazev() : "Uživatel",
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
                activity
        );
    }

    private String resolveMethod(Platba platba) {
        if ("K".equalsIgnoreCase(platba.getPlatbaTyp()) && platba.getKarta() != null) {
            String number = platba.getKarta().getCisloKarty();
            if (number != null && number.length() > 4) {
                return "Karta •••• " + number.substring(number.length() - 4);
            }
            return "Platební karta";
        }
        return "Pokladna #" + platba.getIdPlatba();
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

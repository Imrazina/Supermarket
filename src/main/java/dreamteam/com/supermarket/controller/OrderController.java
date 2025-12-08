package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.Service.ObjednavkaStatusJdbcService;
import dreamteam.com.supermarket.Service.PlatbaJdbcService;
import dreamteam.com.supermarket.Service.SupermarketJdbcService;
import dreamteam.com.supermarket.Service.UserJdbcService;
import dreamteam.com.supermarket.controller.dto.DashboardResponse;
import dreamteam.com.supermarket.controller.dto.OrderRequest;
import dreamteam.com.supermarket.model.market.ObjednavkaStatus;
import dreamteam.com.supermarket.model.market.Supermarket;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.repository.OrderProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "http://localhost:8000", allowCredentials = "true")
@RequiredArgsConstructor
public class OrderController {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final OrderProcedureDao orderDao;
    private final ObjednavkaStatusJdbcService statusService;
    private final SupermarketJdbcService supermarketJdbcService;
    private final UserJdbcService userJdbcService;
    private final PlatbaJdbcService platbaJdbcService;

    @GetMapping("/options")
    public ResponseEntity<OrderOptions> options(Authentication authentication) {
        Uzivatel user = resolveUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        List<Option> statuses = statusService.findAll().stream()
                .sorted(Comparator.comparing(ObjednavkaStatus::getIdStatus))
                .map(stat -> new Option(stat.getIdStatus(), stat.getNazev()))
                .toList();
        List<Option> stores = supermarketJdbcService.findAll().stream()
                .sorted(Comparator.comparing(Supermarket::getNazev, Comparator.nullsLast(String::compareToIgnoreCase)))
                .map(store -> new Option(store.getIdSupermarket(), store.getNazev()))
                .toList();
        List<Option> employees = userJdbcService.findAll().stream()
                .sorted(Comparator.comparing(Uzivatel::getJmeno, Comparator.nullsLast(String::compareToIgnoreCase)))
                .map(u -> new Option(u.getIdUzivatel(), buildUserLabel(u)))
                .toList();
        List<String> types = List.of("INTERNI", "ZAKAZNIK", "DODAVKA");
        return ResponseEntity.ok(new OrderOptions(statuses, stores, employees, types));
    }

    @PostMapping
    public ResponseEntity<DashboardResponse.OrderInfo> create(@RequestBody OrderRequest request,
                                                              Authentication authentication) {
        return save(null, request, authentication);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DashboardResponse.OrderInfo> update(@PathVariable String id,
                                                              @RequestBody OrderRequest request,
                                                              Authentication authentication) {
        Long orderId = parseOrderId(id);
        if (orderId == null) {
            return ResponseEntity.badRequest().build();
        }
        if (orderDao.getOrder(orderId) == null) {
            return ResponseEntity.notFound().build();
        }
        return save(orderId, request, authentication);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication authentication) {
        Uzivatel user = resolveUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long orderId = parseOrderId(id);
        if (orderId == null) {
            return ResponseEntity.badRequest().build();
        }
        if (orderDao.getOrder(orderId) == null) {
            return ResponseEntity.notFound().build();
        }
        orderDao.deleteOrder(orderId);
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<DashboardResponse.OrderInfo> save(Long orderId,
                                                             OrderRequest request,
                                                             Authentication authentication) {
        Uzivatel user = resolveUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long statusId = resolveStatusId(request);
        Long storeId = resolveStoreId(request);
        Long employeeId = resolveEmployeeId(request, user);
        LocalDateTime date = parseDate(request.date());
        Long newId = orderDao.saveOrder(orderId, date, statusId, employeeId, storeId, request.note(), normalizeType(request.type()));
        OrderProcedureDao.OrderRow row = orderDao.getOrder(newId);
        if (row == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
        double amount = computeAmount(newId);
        return ResponseEntity.ok(mapOrder(row, amount));
    }

    private Long resolveStatusId(OrderRequest request) {
        if (request.statusId() != null) {
            return request.statusId();
        }
        if (request.statusCode() != null) {
            try {
                return Long.parseLong(request.statusCode().trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return statusService.findAll().stream()
                .map(ObjednavkaStatus::getIdStatus)
                .findFirst()
                .orElse(null);
    }

    private Long resolveStoreId(OrderRequest request) {
        if (request.storeId() != null) {
            return request.storeId();
        }
        String storeName = request.storeName();
        if (storeName != null && !storeName.isBlank()) {
            Long matched = supermarketJdbcService.findAll().stream()
                    .filter(store -> store.getNazev() != null && store.getNazev().equalsIgnoreCase(storeName.trim()))
                    .map(Supermarket::getIdSupermarket)
                    .findFirst()
                    .orElse(null);
            if (matched != null) {
                return matched;
            }
        }
        return supermarketJdbcService.findAll().stream()
                .map(Supermarket::getIdSupermarket)
                .findFirst()
                .orElse(null);
    }

    private Long resolveEmployeeId(OrderRequest request, Uzivatel currentUser) {
        if (request.employeeId() != null) {
            return request.employeeId();
        }
        return currentUser != null ? currentUser.getIdUzivatel() : null;
    }

    private Uzivatel resolveUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userJdbcService.findByEmail(authentication.getName());
    }

    private LocalDateTime parseDate(String date) {
        if (date == null || date.isBlank()) {
            return LocalDateTime.now();
        }
        try {
            return LocalDateTime.parse(date, DATE_FORMAT);
        } catch (DateTimeParseException ex) {
            try {
                return LocalDateTime.parse(date);
            } catch (DateTimeParseException ignore) {
                return LocalDateTime.now();
            }
        }
    }

    private Long parseOrderId(String id) {
        if (id == null) return null;
        String cleaned = id.trim().toUpperCase(Locale.ROOT);
        if (cleaned.startsWith("PO-")) {
            cleaned = cleaned.substring(3);
        }
        try {
            return Long.parseLong(cleaned);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private DashboardResponse.OrderInfo mapOrder(OrderProcedureDao.OrderRow order, double amount) {
        String employeeName = (order.uzivatelJmeno() != null || order.uzivatelPrijmeni() != null)
                ? ((order.uzivatelJmeno() != null ? order.uzivatelJmeno() : "") + " " + (order.uzivatelPrijmeni() != null ? order.uzivatelPrijmeni() : "")).trim()
                : "Neuvedeno";
        String storeName = order.supermarketNazev() != null ? order.supermarketNazev() : "Neuvedeno";
        String statusLabel = order.statusNazev() != null ? order.statusNazev() : "Nezname";
        String statusCode = order.statusId() != null ? String.valueOf(order.statusId()) : "0";
        String priority = amount > 100000 ? "high" : amount > 10000 ? "medium" : "low";
        return new DashboardResponse.OrderInfo(
                "PO-" + order.id(),
                order.typObjednavka(),
                storeName,
                employeeName,
                storeName,
                statusLabel,
                statusCode,
                order.datum() != null ? order.datum().format(DATE_FORMAT) : "",
                amount,
                priority,
                order.poznamka()
        );
    }

    private double computeAmount(Long orderId) {
        return platbaJdbcService.findByOrderIds(List.of(orderId)).stream()
                .map(PlatbaJdbcService.PlatbaRow::castka)
                .filter(Objects::nonNull)
                .map(BigDecimal::doubleValue)
                .reduce(0d, Double::sum);
    }

    private String normalizeType(String type) {
        if (type == null || type.isBlank()) {
            return "INTERNI";
        }
        return type.trim().toUpperCase(Locale.ROOT);
    }

    private String buildUserLabel(Uzivatel user) {
        String fullName = ((user.getJmeno() != null ? user.getJmeno() : "") + " " + (user.getPrijmeni() != null ? user.getPrijmeni() : "")).trim();
        if (fullName.isBlank()) {
            fullName = user.getEmail() != null ? user.getEmail() : "Uzivatel";
        }
        return fullName;
    }

    public record Option(Long id, String label) {}
    public record OrderOptions(List<Option> statuses, List<Option> stores, List<Option> employees, List<String> types) {}
}

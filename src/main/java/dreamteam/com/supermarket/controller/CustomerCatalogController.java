package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.Service.UserJdbcService;
import dreamteam.com.supermarket.Service.ZboziJdbcService;
import dreamteam.com.supermarket.Service.KategorieZboziJdbcService;
import dreamteam.com.supermarket.controller.dto.CustomerProductDto;
import dreamteam.com.supermarket.model.market.Zbozi;
import dreamteam.com.supermarket.model.user.Uzivatel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/customer/catalog")
@CrossOrigin(
        origins = {
                "http://localhost:8000",
                "http://127.0.0.1:8000",
                "http://localhost:8082",
                "http://127.0.0.1:8082",
                "http://localhost",
                "http://127.0.0.1"
        },
        allowCredentials = "true"
)
public class CustomerCatalogController {

    private static final Locale LOCALE_CZ = Locale.forLanguageTag("cs-CZ");

    private final ZboziJdbcService zboziJdbcService;
    private final UserJdbcService userJdbcService;
    private final KategorieZboziJdbcService kategorieZboziJdbcService;

    public CustomerCatalogController(ZboziJdbcService zboziJdbcService,
                                     UserJdbcService userJdbcService,
                                     KategorieZboziJdbcService kategorieZboziJdbcService) {
        this.zboziJdbcService = zboziJdbcService;
        this.userJdbcService = userJdbcService;
        this.kategorieZboziJdbcService = kategorieZboziJdbcService;
    }

    @GetMapping("/products")
    public ResponseEntity<List<CustomerProductDto>> listProducts(
            @RequestParam(name = "supermarketId") Long supermarketId,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "categoryId", required = false) Long categoryId,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Uzivatel currentUser = userJdbcService.findByEmail(authentication.getName());
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Map<Long, String> categoryNames = kategorieZboziJdbcService.findAll().stream()
                .filter(k -> k.getIdKategorie() != null && k.getNazev() != null)
                .collect(Collectors.toMap(k -> k.getIdKategorie(), k -> k.getNazev(), (a, b) -> a));

        List<CustomerProductDto> products = zboziJdbcService.findBySupermarket(supermarketId, q, categoryId)
                .stream()
                .peek(z -> {
                    if (z.getKategorie() != null && (z.getKategorie().getNazev() == null || z.getKategorie().getNazev().isBlank())) {
                        String name = categoryNames.get(z.getKategorie().getIdKategorie());
                        z.getKategorie().setNazev(name);
                    }
                })
                .sorted(Comparator.comparing(z -> z.getNazev() == null ? "" : z.getNazev().toLowerCase(LOCALE_CZ)))
                .map(CustomerCatalogController::toDto)
                .toList();
        return ResponseEntity.ok(products);
    }

    private static CustomerProductDto toDto(Zbozi z) {
        int qty = z.getMnozstvi() == null ? 0 : z.getMnozstvi();
        int min = z.getMinMnozstvi() == null ? 0 : z.getMinMnozstvi();
        String badge = qty <= min ? "Nedostatek" : "Skladem";
        String sku = z.getIdZbozi() != null ? "SKU-" + z.getIdZbozi() : null;
        return new CustomerProductDto(
                sku,
                z.getIdZbozi(),
                z.getNazev(),
                z.getPopis(),
                z.getCena() != null ? z.getCena().doubleValue() : 0d,
                qty,
                min,
                z.getKategorie() != null ? z.getKategorie().getIdKategorie() : null,
                z.getKategorie() != null ? z.getKategorie().getNazev() : null,
                z.getSklad() != null ? z.getSklad().getIdSklad() : null,
                z.getSklad() != null ? z.getSklad().getNazev() : null,
                z.getSklad() != null && z.getSklad().getSupermarket() != null ? z.getSklad().getSupermarket().getIdSupermarket() : null,
                z.getSklad() != null && z.getSklad().getSupermarket() != null ? z.getSklad().getSupermarket().getNazev() : null,
                badge
        );
    }
}

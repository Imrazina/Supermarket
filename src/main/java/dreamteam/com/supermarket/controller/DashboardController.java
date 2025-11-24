package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.controller.dto.DashboardResponse;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.repository.UzivatelRepository;
import dreamteam.com.supermarket.Service.DashboardService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "http://localhost:8000", allowCredentials = "true")
public class DashboardController {

    private final DashboardService dashboardService;
    private final UzivatelRepository uzivatelRepository;

    public DashboardController(DashboardService dashboardService, UzivatelRepository uzivatelRepository) {
        this.dashboardService = dashboardService;
        this.uzivatelRepository = uzivatelRepository;
    }

    @GetMapping
    public ResponseEntity<DashboardResponse> getSnapshot(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Uzivatel currentUser = uzivatelRepository.findByEmail(authentication.getName())
                .orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(dashboardService.buildSnapshot(currentUser));
    }
}

package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.controller.dto.DashboardResponse;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.Service.DashboardService;
import dreamteam.com.supermarket.Service.UserJdbcService;
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
    private final UserJdbcService userJdbcService;

    public DashboardController(DashboardService dashboardService, UserJdbcService userJdbcService) {
        this.dashboardService = dashboardService;
        this.userJdbcService = userJdbcService;
    }

    @GetMapping
    public ResponseEntity<DashboardResponse> getSnapshot(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Uzivatel currentUser = userJdbcService.findByEmail(authentication.getName());
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(dashboardService.buildSnapshot(currentUser));
    }
}

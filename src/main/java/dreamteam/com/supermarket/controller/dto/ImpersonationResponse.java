package dreamteam.com.supermarket.controller.dto;

public record ImpersonationResponse(
        String token,
        String role,
        String fullName,
        String email
) {}

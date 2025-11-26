package dreamteam.com.supermarket.controller.dto;

import java.util.List;

public record ProfileMetaResponse(
        List<RoleOption> roles,
        List<CityOption> cities,
        List<String> positions
) {
    public record RoleOption(Long id, String name) {}
    public record CityOption(String psc, String name, String region) {}
}

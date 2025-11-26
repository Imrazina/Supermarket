package dreamteam.com.supermarket.controller.dto;

import java.util.List;

public record RolePermissionsResponse(Long roleId, String roleName, List<String> permissionCodes) {
}

package dreamteam.com.supermarket.controller.dto;

import java.time.LocalDateTime;

public record DbObjectResponse(
        String type,
        String name,
        LocalDateTime created,
        LocalDateTime lastDdl
) {
}

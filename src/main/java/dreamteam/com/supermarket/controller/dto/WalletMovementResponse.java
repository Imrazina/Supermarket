package dreamteam.com.supermarket.controller.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record WalletMovementResponse(
        @JsonIgnore Long id,
        String direction,
        String method,
        BigDecimal amount,
        String note,
        LocalDateTime createdAt,
        @JsonIgnore Long orderId,
        String cardNumber
) {}

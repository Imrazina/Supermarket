package dreamteam.com.supermarket.controller.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record WalletMovementResponse(
        Long id,
        String direction,
        String method,
        BigDecimal amount,
        String note,
        LocalDateTime createdAt,
        Long orderId,
        String cardNumber
) {}

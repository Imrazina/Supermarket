package dreamteam.com.supermarket.controller.dto;

import java.math.BigDecimal;

public record WalletTopUpResponse(
        Long movementId,
        Long accountId,
        BigDecimal balance
) {}

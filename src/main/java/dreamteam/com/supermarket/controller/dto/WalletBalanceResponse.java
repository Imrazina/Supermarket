package dreamteam.com.supermarket.controller.dto;

import java.math.BigDecimal;

public record WalletBalanceResponse(
        Long accountId,
        BigDecimal balance
) {}

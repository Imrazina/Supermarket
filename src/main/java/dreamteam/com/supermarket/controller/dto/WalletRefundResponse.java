package dreamteam.com.supermarket.controller.dto;

import java.math.BigDecimal;

public record WalletRefundResponse(
        Long pohybId,
        Long accountId,
        BigDecimal balance
) {}

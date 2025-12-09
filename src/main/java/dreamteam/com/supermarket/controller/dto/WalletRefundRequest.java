package dreamteam.com.supermarket.controller.dto;

import java.math.BigDecimal;

public record WalletRefundRequest(
        String orderId,
        BigDecimal amount
) {}

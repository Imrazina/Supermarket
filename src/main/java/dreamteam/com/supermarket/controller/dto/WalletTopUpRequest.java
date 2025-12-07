package dreamteam.com.supermarket.controller.dto;

import java.math.BigDecimal;

public record WalletTopUpRequest(
        BigDecimal amount,
        String method,      // KARTA / HOTOVOST
        String cardNumber,
        String note
) {}

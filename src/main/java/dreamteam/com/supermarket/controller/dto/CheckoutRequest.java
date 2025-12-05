package dreamteam.com.supermarket.controller.dto;

import java.math.BigDecimal;
import java.util.List;

public record CheckoutRequest(
        List<Item> items,
        String paymentType, // CASH or CARD
        BigDecimal cashGiven,
        String cardNumber,
        String note
) {
    public record Item(String sku, int qty) {}
}

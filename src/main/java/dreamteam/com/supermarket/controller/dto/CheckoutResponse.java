package dreamteam.com.supermarket.controller.dto;

import java.math.BigDecimal;
import java.util.List;

public record CheckoutResponse(
        Long orderId,
        Long paymentId,
        BigDecimal total,
        BigDecimal cashGiven,
        BigDecimal change,
        String paymentType,
        List<Line> lines,
        BigDecimal cashbackAmount,
        BigDecimal cashbackTurnover,
        BigDecimal walletBalance,
        Integer cashbackCode
) {
    public record Line(String sku, String name, int qty, BigDecimal price) {}
}

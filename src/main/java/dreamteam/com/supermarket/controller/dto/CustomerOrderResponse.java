package dreamteam.com.supermarket.controller.dto;

import java.math.BigDecimal;
import java.util.List;

public record CustomerOrderResponse(
        Long id,
        String status,
        Integer statusId,
        String supermarket,
        Long supermarketId,
        String customerEmail,
        String handlerEmail,
        String createdAt,
        String note,
        List<Item> items,
        BigDecimal total
) {
    public record Item(Long id, String name, Integer qty, BigDecimal price) {}
}

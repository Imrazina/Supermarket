package dreamteam.com.supermarket.controller.dto;

import java.math.BigDecimal;
import java.util.List;

public record SupplierOrderResponse(
        Long id,
        String status,
        Integer statusId,
        String supermarket,
        Long supermarketId,
        String ownerEmail,
        String createdAt,
        String note,
        List<Item> items,
        BigDecimal rewardEstimate
) {
    public record Item(Long zboziId, String name, Integer qty, BigDecimal price) {}
}

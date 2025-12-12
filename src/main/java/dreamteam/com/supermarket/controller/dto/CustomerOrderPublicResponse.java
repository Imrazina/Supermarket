package dreamteam.com.supermarket.controller.dto;

import java.math.BigDecimal;
import java.util.List;

public record CustomerOrderPublicResponse(
        String status,
        Integer statusId,
        String supermarket,
        Long supermarketId,
        String customerEmail,
        String handlerEmail,
        String handlerName,
        String createdAt,
        String note,
        List<CustomerOrderResponse.Item> items,
        BigDecimal total,
        String cislo,
        boolean refunded,
        boolean pendingRefund,
        boolean refundRejected
) {}

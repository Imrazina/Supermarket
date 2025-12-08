package dreamteam.com.supermarket.controller.dto;

public record OrderRequest(
        Long statusId,
        String statusCode,
        Long storeId,
        String storeName,
        Long employeeId,
        String type,
        String date,
        String note
) {}

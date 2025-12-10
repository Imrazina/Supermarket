package dreamteam.com.supermarket.controller.dto;

public record CustomerProductDto(
        String sku,
        Long id,
        String name,
        String description,
        Double price,
        Integer qtyAvailable,
        Integer qtyMin,
        Long categoryId,
        String category,
        Long skladId,
        String sklad,
        Long supermarketId,
        String supermarket,
        String badge
) {
}

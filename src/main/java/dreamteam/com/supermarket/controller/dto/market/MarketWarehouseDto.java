package dreamteam.com.supermarket.controller.dto.market;

public record MarketWarehouseDto(
        Long id,
        String nazev,
        Integer kapacita,
        String telefon,
        Long supermarketId,
        String supermarketNazev
) {}

package dreamteam.com.supermarket.controller.dto.market;

public record MarketSupermarketDeleteInfoDto(
        String nazev,
        Long skladCount,
        Long zboziCount,
        Long dodavatelCount
) {}

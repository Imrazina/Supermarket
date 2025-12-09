package dreamteam.com.supermarket.controller.dto.market;

public record MarketSupermarketDto(
        Long id,
        String nazev,
        String telefon,
        String email,
        Long adresaId,
        String adresaText,
        String adresaUlice,
        String adresaCpop,
        String adresaCorient,
        String adresaPsc,
        String adresaMesto
) {}

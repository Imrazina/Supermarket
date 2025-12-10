package dreamteam.com.supermarket.controller.dto.market;

import java.math.BigDecimal;

public record MarketGoodsDto(
        Long id,
        String nazev,
        String popis,
        BigDecimal cena,
        Integer mnozstvi,
        Integer minMnozstvi,
        Long kategorieId,
        String kategorieNazev,
        Long skladId,
        String skladNazev,
        Long supermarketId,
        String supermarketNazev,
        Integer dodavatelCnt,
        String dodavatelNazvy
) {}

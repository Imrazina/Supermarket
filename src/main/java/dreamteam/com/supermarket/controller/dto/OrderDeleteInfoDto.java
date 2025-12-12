package dreamteam.com.supermarket.controller.dto;

public record OrderDeleteInfoDto(
        String cislo,
        String store,
        long itemCount,
        long paymentCount,
        long cashCount,
        long cardCount,
        long walletMovements
) {}

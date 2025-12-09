package dreamteam.com.supermarket.controller.dto.market;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record UpsertWarehouseRequest(
        Long id,
        @NotBlank(message = "Nazev je povinny")
        @Size(max = 180, message = "Nazev je prilis dlouhy")
        String nazev,
        @PositiveOrZero(message = "Kapacita musi byt kladna")
        Integer kapacita,
        @Size(max = 64, message = "Telefon je prilis dlouhy")
        String telefon,
        @NotNull(message = "Supermarket je povinny")
        Long supermarketId
) {}

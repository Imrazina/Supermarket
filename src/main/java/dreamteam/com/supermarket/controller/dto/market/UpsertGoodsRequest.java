package dreamteam.com.supermarket.controller.dto.market;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record UpsertGoodsRequest(
        Long id,
        @NotBlank(message = "Nazev je povinny")
        @Size(max = 200, message = "Nazev je prilis dlouhy")
        String nazev,
        @Size(max = 1000, message = "Popis je prilis dlouhy")
        String popis,
        @DecimalMin(value = "0", inclusive = true, message = "Cena nesmi byt zaporna")
        BigDecimal cena,
        @PositiveOrZero(message = "Mnozstvi nesmi byt zaporne")
        Integer mnozstvi,
        @PositiveOrZero(message = "Minimalni mnozstvi nesmi byt zaporne")
        Integer minMnozstvi,
        @NotNull(message = "Kategorie je povinna")
        Long kategorieId,
        @NotNull(message = "Sklad je povinny")
        Long skladId
) {}

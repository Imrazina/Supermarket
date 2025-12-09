package dreamteam.com.supermarket.controller.dto.market;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpsertSupermarketRequest(
        Long id,
        @NotBlank(message = "Nazev je povinny")
        @Size(max = 180, message = "Nazev je prilis dlouhy")
        String nazev,
        @Size(max = 64, message = "Telefon je prilis dlouhy")
        String telefon,
        @Size(max = 120, message = "Email je prilis dlouhy")
        String email,
        Long adresaId,
        @NotBlank(message = "Ulice je povinna")
        @Size(max = 255, message = "Ulice je prilis dlouha")
        String adresaUlice,
        @NotBlank(message = "Cislo popisne je povinne")
        @Size(max = 16, message = "Cislo popisne je prilis dlouhe")
        String adresaCpop,
        @NotBlank(message = "Cislo orientacni je povinne")
        @Size(max = 16, message = "Cislo orientacni je prilis dlouhe")
        String adresaCorient,
        @NotBlank(message = "PSC je povinne")
        @Size(max = 10, message = "PSC je prilis dlouhe")
        String adresaPsc
) {}

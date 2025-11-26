package dreamteam.com.supermarket.controller.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class ProfileUpdateRequest {

    @NotBlank(message = "Jméno je povinné")
    @Size(max = 15, message = "Jméno může mít maximálně 15 znaků")
    private String firstName;

    @NotBlank(message = "Příjmení je povinné")
    @Size(max = 15, message = "Příjmení může mít maximálně 15 znaků")
    private String lastName;

    @NotBlank(message = "Email je povinný")
    @Email(message = "Zadejte platný email")
    private String email;

    @Size(max = 20, message = "Telefon může mít maximálně 20 znaků")
    private String phone;

    @NotBlank(message = "Role je povinná")
    private String roleCode;

    @Size(max = 50, message = "Pozice může mít maximálně 50 znaků")
    private String position;

    private BigDecimal salary;

    private String hireDate;

    @NotBlank(message = "Ulice je povinná")
    @Size(max = 55, message = "Ulice je příliš dlouhá")
    private String street;

    @NotBlank(message = "Číslo popisné je povinné")
    @Size(max = 33, message = "Číslo popisné je příliš dlouhé")
    private String houseNumber;

    @NotBlank(message = "Číslo orientační je povinné")
    @Size(max = 33, message = "Číslo orientační je příliš dlouhé")
    private String orientationNumber;

    @NotBlank(message = "Město je povinné")
    @Size(min = 5, max = 5, message = "PSČ musí mít 5 znaků")
    private String cityPsc;

    private String newPassword;

    @Size(max = 20, message = "Karta věrnosti může mít maximálně 20 znaků")
    private String loyaltyCard;

    @Size(max = 100, message = "Název společnosti je příliš dlouhý")
    private String supplierCompany;
}

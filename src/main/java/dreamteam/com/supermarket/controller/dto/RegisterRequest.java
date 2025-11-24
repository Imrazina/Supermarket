package dreamteam.com.supermarket.controller.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Jméno je povinné")
    @Size(max = 15, message = "Jméno může mít maximálně 15 znaků")
    private String firstName;

    @NotBlank(message = "Příjmení je povinné")
    @Size(max = 15, message = "Příjmení může mít maximálně 15 znaků")
    private String lastName;

    @Email(message = "Zadejte platný email")
    @NotBlank(message = "Email je povinný")
    private String email;

    @NotBlank(message = "Telefon je povinný")
    @Size(max = 20, message = "Telefon může mít maximálně 20 znaků")
    private String phoneNumber;

    @NotBlank(message = "Heslo je povinné")
    @Size(min = 6, message = "Heslo musí mít alespoň 6 znaků")
    private String password;
}

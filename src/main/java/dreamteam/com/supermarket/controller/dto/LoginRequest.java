package dreamteam.com.supermarket.controller.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class LoginRequest {

    @Email(message = "Zadejte platný email")
    @NotBlank(message = "Email je povinný")
    private String email;

    @NotBlank(message = "Heslo je povinné")
    private String password;
}


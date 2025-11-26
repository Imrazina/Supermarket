package dreamteam.com.supermarket.controller.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class AdminUserUpdateRequest {

    @NotBlank
    @Size(max = 15)
    private String firstName;

    @NotBlank
    @Size(max = 15)
    private String lastName;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(max = 20)
    private String phone;

    @NotBlank
    private String roleCode;

    @Size(max = 50)
    private String position;

    private BigDecimal salary;

    private String hireDate;

    @NotBlank
    @Size(max = 55)
    private String street;

    @NotBlank
    @Size(max = 33)
    private String houseNumber;

    @NotBlank
    @Size(max = 33)
    private String orientationNumber;

    @NotBlank
    @Size(min = 5, max = 5)
    private String cityPsc;

    private String newPassword;

    @Size(max = 20)
    private String loyaltyCard;

    @Size(max = 100)
    private String supplierCompany;
}

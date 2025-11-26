package dreamteam.com.supermarket.controller.dto;

import java.math.BigDecimal;

public record AdminUserResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        String phone,
        String role,
        String position,
        BigDecimal salary,
        String hireDate,
        Address address,
        String loyaltyCard,
        String supplierCompany
) {
    public record Address(String street, String houseNumber, String orientationNumber, String city, String psc) {}
}

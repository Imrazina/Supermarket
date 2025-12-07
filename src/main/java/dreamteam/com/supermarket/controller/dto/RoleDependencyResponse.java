package dreamteam.com.supermarket.controller.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoleDependencyResponse {
    private boolean hasSupplier;
    private String supplierCompany;
    private int supplierItems;

    private boolean hasCustomer;
    private String loyaltyCard;

    private boolean hasEmployee;
    private String position;
    private BigDecimal salary;
    private String hireDate;
}

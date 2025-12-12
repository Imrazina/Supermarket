package dreamteam.com.supermarket.controller.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;

public record WalletTopUpResponse(
        @JsonIgnore Long movementId,
        Long accountId,
        BigDecimal balance
) {}

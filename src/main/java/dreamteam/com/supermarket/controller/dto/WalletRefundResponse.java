package dreamteam.com.supermarket.controller.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;

public record WalletRefundResponse(
        @JsonIgnore Long pohybId,
        Long accountId,
        BigDecimal balance
) {}

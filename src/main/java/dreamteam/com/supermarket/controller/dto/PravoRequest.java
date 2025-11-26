package dreamteam.com.supermarket.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PravoRequest {

    @NotBlank(message = "Název je povinný")
    @Size(max = 20, message = "Název může mít maximálně 20 znaků")
    private String name;

    @NotBlank(message = "Kód je povinný")
    @Size(max = 255, message = "Kód je příliš dlouhý")
    private String code;

    @Size(max = 2000, message = "Popis je příliš dlouhý")
    private String description;
}

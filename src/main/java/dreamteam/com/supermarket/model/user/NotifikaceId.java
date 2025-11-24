package dreamteam.com.supermarket.model.user;

import lombok.*;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotifikaceId implements Serializable {
    private Long idNotifikace;
    private Long zpravaId;
}

package dreamteam.com.supermarket.model.payment;

import lombok.*;

/**
 * Entity for table KARTA Ú¿” specialization of PLATBA for card transactions.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Karta {

    private Long platbaId;

    private Platba platba;

    private String cisloKarty;
}

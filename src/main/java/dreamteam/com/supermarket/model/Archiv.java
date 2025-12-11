package dreamteam.com.supermarket.model;

import lombok.*;
/**
 * Entity for table ARCHIV Ú¿” stores historical records of file versions or actions.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Archiv {

    private Long idArchiv;

    private String nazev;

    private String popis;

    private Long parentId;
}

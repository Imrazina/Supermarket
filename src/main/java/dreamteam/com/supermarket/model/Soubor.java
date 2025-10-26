package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entity for table SOUBOR – stores uploaded binary files (images, PDFs, etc.).
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "SOUBOR")
public class Soubor {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_soubor")
    @SequenceGenerator(name = "seq_soubor", sequenceName = "SEQ_SOUBOR", allocationSize = 1)
    @Column(name = "ID_SOUBORU")
    private Long idSoubor;

    @Column(name = "NAZEV", nullable = false, length = 55)
    private String nazev;

    @Column(name = "TYP", nullable = false, length = 55)
    private String typ;

    @Column(name = "PRIPONA", nullable = false, length = 15)
    private String pripona;

    @Lob
    @Column(name = "OBSAH", nullable = false)
    private byte[] obsah;

    @Column(name = "DATUMNAHRANI", nullable = false)
    private LocalDateTime datumNahrani;

    @Column(name = "DATUMMODIFIKACE", nullable = false)
    private LocalDateTime datumModifikace;

    @Column(name = "KDOUDELAL", nullable = false, length = 15)
    private String kdoUdelal;

    @Lob
    @Column(name = "POPIS")
    private String popis;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.datumNahrani = now;
        this.datumModifikace = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.datumModifikace = LocalDateTime.now();
    }
}

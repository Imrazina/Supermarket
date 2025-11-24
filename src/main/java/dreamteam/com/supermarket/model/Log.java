package dreamteam.com.supermarket.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entity for table LOG – represents system log entries (auditing, triggers, etc.).
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "LOG")
public class Log {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_log")
    @SequenceGenerator(name = "seq_log", sequenceName = "SEQ_LOG_ID", allocationSize = 1)
    @Column(name = "ID_LOG")
    private Long idLog;

    @Column(name = "TABULKANAZEV", nullable = false, length = 40)
    private String tabulkaNazev;

    @Column(name = "OPERACE", nullable = false, columnDefinition = "CHAR(1)")
    private String operace;

    @Lob
    @Column(name = "STARADATA")
    private String staraData;

    @Lob
    @Column(name = "NOVADATA")
    private String novaData;

    @Column(name = "DATUMZMENY", nullable = false)
    private LocalDateTime datumZmeny;

    @Column(name = "IDREKORD", nullable = false, length = 100)
    private String idRekord;

    @Lob
    @Column(name = "POPIS")
    private String popis;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ID_ARCHIV", nullable = false)
    private Archiv archiv;

    @PrePersist
    protected void onCreate() {
        if (datumZmeny == null) {
            datumZmeny = LocalDateTime.now();
        }
    }
}

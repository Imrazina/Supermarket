package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.controller.dto.DashboardResponse;
import dreamteam.com.supermarket.model.Soubor;
import dreamteam.com.supermarket.model.market.Zbozi;
import dreamteam.com.supermarket.model.market.Objednavka;
import dreamteam.com.supermarket.model.market.Sklad;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.repository.ArchivRepository;
import dreamteam.com.supermarket.repository.LogRepository;
import dreamteam.com.supermarket.repository.SouborRepository;
import dreamteam.com.supermarket.repository.ObjednavkaRepository;
import dreamteam.com.supermarket.repository.ZboziRepository;
import dreamteam.com.supermarket.repository.UzivatelRepository;
import dreamteam.com.supermarket.repository.SkladRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/archive")
@RequiredArgsConstructor
public class ArchiveController {

    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    private final ArchivRepository archivRepository;
    private final SouborRepository souborRepository;
    private final LogRepository logRepository;
    private final ZboziRepository zboziRepository;
    private final ObjednavkaRepository objednavkaRepository;
    private final UzivatelRepository uzivatelRepository;
    private final SkladRepository skladRepository;

    @GetMapping("/tree")
    public List<DashboardResponse.ArchiveNode> tree() {
        return archivRepository.findHierarchy().stream()
                .map(node -> new DashboardResponse.ArchiveNode(
                        node.getIdArchiv(),
                        node.getNazev(),
                        node.getParentId(),
                        node.getLvl() == null ? 0 : node.getLvl(),
                        node.getCesta()
                ))
                .toList();
    }

    @GetMapping("/files")
    public List<FileItem> files(@RequestParam(name = "archiveId", required = false) Long archiveId,
                                @RequestParam(name = "q", required = false) String query,
                                @RequestParam(name = "size", defaultValue = "100") int size) {
        Pageable pageable = PageRequest.of(0, Math.max(1, Math.min(size, 500)));
        return souborRepository.searchMeta(archiveId, safeQuery(query), pageable).stream()
                .map(meta -> new FileItem(
                        meta.getIdSoubor(),
                        meta.getNazev(),
                        meta.getTyp(),
                        meta.getArchiv(),
                        meta.getOwner(),
                        meta.getDatumModifikace() != null ? DATE_TIME_FORMAT.format(meta.getDatumModifikace()) : ""
                ))
                .toList();
    }

    @GetMapping("/files/{id}/data")
    public ResponseEntity<ByteArrayResource> download(@PathVariable Long id) {
        Soubor soubor = souborRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Soubor not found"));
        ByteArrayResource resource = new ByteArrayResource(soubor.getObsah());
        String filename = soubor.getNazev() + "." + soubor.getPripona();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(soubor.getTyp()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentLength(soubor.getObsah().length)
                .body(resource);
    }

    @GetMapping("/logs")
    public List<LogItem> logs(@RequestParam(name = "archiveId", required = false) Long archiveId,
                              @RequestParam(name = "table", required = false) String table,
                              @RequestParam(name = "op", required = false) String op,
                              @RequestParam(name = "size", defaultValue = "100") int size) {
        Pageable pageable = PageRequest.of(0, Math.max(1, Math.min(size, 500)));
        return logRepository.findFilteredWithPath(archiveId, safeQuery(table), safeQuery(op), pageable).stream()
                .map(log -> new LogItem(
                        log.getIdLog(),
                        log.getTableName(),
                        log.getOperation(),
                        log.getTimestamp() != null ? DATE_TIME_FORMAT.format(log.getTimestamp().toLocalDateTime()) : "",
                        log.getPopis(),
                        log.getArchivPath(),
                        log.getIdRekord(),
                        resolveRecordName(log.getTableName(), log.getIdRekord()),
                        log.getNovaData(),
                        log.getStaraData()
                ))
                .toList();
    }

    private String safeQuery(String q) {
        if (q == null) return null;
        String trimmed = q.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record FileItem(Long id, String name, String type, String archive, String owner, String updated) {}

    private String resolveRecordName(String table, String idRekord) {
        if (table == null || idRekord == null) {
            return idRekord;
        }
        try {
            switch (table.toUpperCase()) {
                case "ZBOZI":
                    return zboziRepository.findById(Long.parseLong(idRekord))
                            .map(Zbozi::getNazev).orElse(null);
                case "OBJEDNAVKA":
                    return objednavkaRepository.findById(Long.parseLong(idRekord))
                            .map(o -> "Objednavka " + o.getIdObjednavka()).orElse(null);
                case "UZIVATEL":
                    return uzivatelRepository.findById(Long.parseLong(idRekord))
                            .map(Uzivatel::getEmail).orElse(null);
                case "SKLAD":
                    return skladRepository.findById(Long.parseLong(idRekord))
                            .map(Sklad::getNazev).orElse(null);
                default:
                    return null;
            }
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public record LogItem(Long id, String table, String op, String timestamp, String descr, String archive,
                          String recordId, String recordName, String newData, String oldData) {}
}

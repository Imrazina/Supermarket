package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.controller.dto.DashboardResponse;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.Service.LogJdbcService;
import dreamteam.com.supermarket.Service.ObjednavkaJdbcService;
import dreamteam.com.supermarket.Service.ObjednavkaStatusJdbcService;
import dreamteam.com.supermarket.Service.ZboziJdbcService;
import dreamteam.com.supermarket.Service.UserJdbcService;
import dreamteam.com.supermarket.Service.SkladJdbcService;
import dreamteam.com.supermarket.Service.SupermarketJdbcService;
import dreamteam.com.supermarket.repository.ArchiveProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/archive")
@RequiredArgsConstructor
public class ArchiveController {

    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    private final LogJdbcService logJdbcService;
    private final ZboziJdbcService zboziJdbcService;
    private final ObjednavkaJdbcService objednavkaJdbcService;
    private final ObjednavkaStatusJdbcService objednavkaStatusJdbcService;
    private final UserJdbcService userJdbcService;
    private final SkladJdbcService skladJdbcService;
    private final SupermarketJdbcService supermarketJdbcService;
    private final ArchiveProcedureDao archiveDao;

    private String safeQuery(String q) {
        if (q == null) return null;
        String trimmed = q.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String truncate(String value, int max) {
        if (value == null) return null;
        return value.length() > max ? value.substring(0, max) : value;
    }

    private String formatDate(java.time.LocalDateTime primary, java.time.LocalDateTime fallback) {
        if (primary != null) {
            return DATE_TIME_FORMAT.format(primary);
        }
        if (fallback != null) {
            return DATE_TIME_FORMAT.format(fallback);
        }
        return "";
    }

    @GetMapping("/tree")
    public List<DashboardResponse.ArchiveNode> tree() {
        return archiveDao.getTree().stream()
                .map(node -> new DashboardResponse.ArchiveNode(
                        node.id(),
                        node.name(),
                        node.parentId(),
                        node.level(),
                        node.path()
                ))
                .toList();
    }

    @GetMapping("/files")
    public List<FileItem> files(@RequestParam(name = "archiveId", required = false) Long archiveId,
                                @RequestParam(name = "q", required = false) String query,
                                @RequestParam(name = "size", defaultValue = "100") int size) {
        var files = archiveDao.getFiles(archiveId, safeQuery(query), size);
        return files.stream()
                .map(meta -> new FileItem(
                        meta.id(),
                        meta.name(),
                        meta.ext(),
                        meta.type(),
                        meta.archive(),
                        meta.owner(),
                        meta.description(),
                        formatDate(meta.uploaded(), meta.updated()),
                        formatDate(meta.updated(), meta.uploaded()),
                        meta.size()
                )).toList();
    }

    @PostMapping(path = "/files/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileItem upload(@RequestParam("archiveId") Long archiveId,
                           @RequestParam("file") MultipartFile file,
                           Authentication authentication) throws Exception {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Soubor je prázdný.");
        }
        boolean archiveExists = archiveDao.getTree().stream().anyMatch(n -> n.id().equals(archiveId));
        if (!archiveExists) {
            throw new IllegalArgumentException("Archiv neexistuje");
        }

        Uzivatel owner = authentication != null
                ? userJdbcService.findByEmail(authentication.getName())
                : null;
        if (owner == null) {
            owner = userJdbcService.findAll().stream().findFirst().orElse(null);
        }
        if (owner == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nelze nahrát: není dostupný žádný uživatel pro vlastnictví souboru.");
        }

        String original = Optional.ofNullable(file.getOriginalFilename()).orElse("upload.bin");
        String mimeType = truncate(Optional.ofNullable(file.getContentType()).orElse("application/octet-stream"), 55);
        String email = authentication != null ? authentication.getName() : null;

        Long newId = archiveDao.saveFile(archiveId, email, original, mimeType, file.getBytes());
        // vrátíme metadatový výpis pro nově uložený soubor
        return archiveDao.getFiles(archiveId, null, 1).stream()
                .filter(f -> f.id().equals(newId))
                .findFirst()
                .map(meta -> new FileItem(
                        meta.id(),
                        meta.name(),
                        meta.ext(),
                        meta.type(),
                        meta.archive(),
                        meta.owner(),
                        meta.description(),
                        formatDate(meta.uploaded(), meta.updated()),
                        formatDate(meta.updated(), meta.uploaded()),
                        meta.size()
                ))
                .orElseGet(() -> new FileItem(
                        newId,
                        original,
                        "",
                        mimeType,
                        "",
                        "",
                        "Nahráno přes proceduru",
                        "",
                        "",
                        null
                ));
    }

    @GetMapping("/files/{id}/data")
    public ResponseEntity<ByteArrayResource> download(@PathVariable Long id) {
        ArchiveProcedureDao.FileData data = archiveDao.getFileData(id);
        if (data == null || data.content() == null) {
            throw new IllegalArgumentException("Soubor not found");
        }
        ByteArrayResource resource = new ByteArrayResource(data.content());
        String ext = Optional.ofNullable(data.ext()).orElse("");
        String filename = data.name() + (ext.isBlank() ? "" : "." + ext);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(Optional.ofNullable(data.type()).orElse("application/octet-stream")))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentLength(data.content().length)
                .body(resource);
    }

    @GetMapping("/files/{id}/preview")
    public ResponseEntity<String> preview(@PathVariable Long id) {
        ArchiveProcedureDao.FileData data = archiveDao.getFileData(id);
        if (data == null || data.content() == null) {
            throw new IllegalArgumentException("Soubor not found");
        }
        String ext = Optional.ofNullable(data.ext()).orElse("").toLowerCase();
        String text = extractPreviewText(data.content(), ext);
        if (text == null) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                    .body("Preview not supported for this file.");
        }
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + data.name() + ".txt\"")
                .body(text);
    }

    @PutMapping(value = "/files/{id}/edit", consumes = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<Void> edit(@PathVariable Long id, @org.springframework.web.bind.annotation.RequestBody String newContent) {
        ArchiveProcedureDao.FileData data = archiveDao.getFileData(id);
        if (data == null || data.content() == null) {
            throw new IllegalArgumentException("Soubor not found");
        }
        String ext = Optional.ofNullable(data.ext()).orElse("");
        byte[] updated = buildEditedContent(ext, Optional.ofNullable(newContent).orElse(""));
        if (updated == null) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Edit not supported for this file.");
        }
        archiveDao.updateFileData(id, updated);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/files/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        archiveDao.deleteFile(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/files/{id}/description", consumes = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<Void> updateDescription(@PathVariable Long id, @org.springframework.web.bind.annotation.RequestBody String description) {
        archiveDao.updateFileDescription(id, description);
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/logs/{id}/description", consumes = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<Void> updateLogDescription(@PathVariable Long id, @org.springframework.web.bind.annotation.RequestBody String description) {
        archiveDao.updateLogDescription(id, description);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/logs/{id}")
    public ResponseEntity<Void> deleteLog(@PathVariable Long id) {
        archiveDao.deleteLog(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/logs")
    public List<LogItem> logs(@RequestParam(name = "archiveId", required = false) Long archiveId,
                              @RequestParam(name = "table", required = false) String table,
                              @RequestParam(name = "op", required = false) String op,
                              @RequestParam(name = "size", defaultValue = "100") int size) {
        var logs = archiveDao.getLogs(archiveId, safeQuery(table), safeQuery(op), size);
        return logs.stream()
                .map(log -> new LogItem(
                        log.id(),
                        log.table(),
                        log.op(),
                        log.timestamp() != null ? DATE_TIME_FORMAT.format(log.timestamp()) : "",
                        log.descr(),
                        log.archive(),
                        log.recordId(),
                        resolveRecordName(log.table(), log.recordId()),
                        log.newData(),
                        log.oldData()
                )).toList();
    }

    public record FileItem(Long id, String name, String ext, String type, String archive, String owner, String description,
                           String uploaded, String updated, Long size) {}

    private byte[] buildEditedContent(String ext, String text) {
        String lowerExt = Optional.ofNullable(ext).orElse("").toLowerCase();
        try {
            if (lowerExt.equals("docx") || lowerExt.equals("xlsx") || lowerExt.equals("xls")) {
                // zatím nepodporujeme editaci binárních formátů přes procedury
                return null;
            }
            return text.getBytes(StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isPlainTextExt(String lowerExt) {
        return lowerExt.equals("txt") || lowerExt.equals("log") || lowerExt.equals("json")
                || lowerExt.equals("xml") || lowerExt.equals("csv") || lowerExt.equals("yaml")
                || lowerExt.equals("yml");
    }

    private String extractPreviewText(byte[] content, String ext) {
        if (content == null || content.length == 0) return null;
        String lowerExt = Optional.ofNullable(ext).orElse("").toLowerCase();
        if (isPlainTextExt(lowerExt)) {
            return new String(content, StandardCharsets.UTF_8);
        }
        return null;
    }

    private String resolveRecordName(String table, String idRekord) {
        // Bez ORM: vracíme jen idRekord jako fallback
        return idRekord;
    }

    public record LogItem(Long id, String table, String op, String timestamp, String descr, String archive,
                          String recordId, String recordName, String newData, String oldData) {}

}

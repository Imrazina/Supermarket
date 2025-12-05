package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.controller.dto.DashboardResponse;
import dreamteam.com.supermarket.model.Archiv;
import dreamteam.com.supermarket.model.Log;
import dreamteam.com.supermarket.model.Soubor;
import dreamteam.com.supermarket.model.market.Zbozi;
import dreamteam.com.supermarket.model.market.Objednavka;
import dreamteam.com.supermarket.model.market.Sklad;
import dreamteam.com.supermarket.model.user.Uzivatel;
import dreamteam.com.supermarket.repository.ArchivRepository;
import dreamteam.com.supermarket.repository.LogRepository;
import dreamteam.com.supermarket.repository.SouborRepository;
import dreamteam.com.supermarket.repository.ObjednavkaRepository;
import dreamteam.com.supermarket.repository.ObjednavkaStatusRepository;
import dreamteam.com.supermarket.repository.ZboziRepository;
import dreamteam.com.supermarket.repository.UzivatelRepository;
import dreamteam.com.supermarket.repository.SkladRepository;
import dreamteam.com.supermarket.repository.SupermarketRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
    private final ObjednavkaStatusRepository objednavkaStatusRepository;
    private final UzivatelRepository uzivatelRepository;
    private final SkladRepository skladRepository;
    private final SupermarketRepository supermarketRepository;

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
                        meta.getPripona(),
                        meta.getTyp(),
                        meta.getArchiv(),
                        meta.getOwner(),
                        meta.getPopis(),
                        formatDate(meta.getDatumNahrani(), meta.getDatumModifikace()),
                        formatDate(meta.getDatumModifikace(), meta.getDatumNahrani()),
                        meta.getVelikost()
                ))
                .toList();
    }

    @PostMapping(path = "/files/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileItem upload(@RequestParam("archiveId") Long archiveId,
                           @RequestParam("file") MultipartFile file,
                           Authentication authentication) throws Exception {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Soubor je prázdný.");
        }
        var archiv = archivRepository.findById(archiveId)
                .orElseThrow(() -> new IllegalArgumentException("Archiv neexistuje"));
        // blokujeme LOG složku a její děti
        if (isLogFolder(archiv)) {
            throw new IllegalArgumentException("Nahrávání do LOG není povoleno.");
        }

        Uzivatel owner = authentication != null
                ? uzivatelRepository.findByEmail(authentication.getName()).orElse(null)
                : null;
        if (owner == null) {
            owner = uzivatelRepository.findAll().stream().findFirst().orElse(null);
        }
        if (owner == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nelze nahrát: není dostupný žádný uživatel pro vlastnictví souboru.");
        }

        String original = Optional.ofNullable(file.getOriginalFilename()).orElse("upload.bin");
        String extension = "";
        int dot = original.lastIndexOf('.');
        if (dot > -1 && dot < original.length() - 1) {
            extension = original.substring(dot + 1);
        }
        String mimeType = truncate(Optional.ofNullable(file.getContentType()).orElse("application/octet-stream"), 55);

        Soubor soubor = Soubor.builder()
                .nazev(dot > 0 ? original.substring(0, dot) : original)
                .typ(mimeType)
                .pripona(extension)
                .obsah(file.getBytes())
                .popis("Nahráno přes API")
                .vlastnik(owner)
                .archiv(archiv)
                .build();
        souborRepository.save(soubor);

        return new FileItem(
                soubor.getIdSoubor(),
                soubor.getNazev(),
                soubor.getPripona(),
                soubor.getTyp(),
                archiv.getNazev(),
                owner.getJmeno() + " " + owner.getPrijmeni(),
                soubor.getPopis(),
                formatDate(soubor.getDatumNahrani(), soubor.getDatumModifikace()),
                formatDate(soubor.getDatumModifikace(), soubor.getDatumNahrani()),
                soubor.getObsah() != null ? (long) soubor.getObsah().length : 0L
        );
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

    @GetMapping("/files/{id}/preview")
    public ResponseEntity<String> preview(@PathVariable Long id) {
        Soubor soubor = souborRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Soubor not found"));
        String ext = Optional.ofNullable(soubor.getPripona()).orElse("").toLowerCase(Locale.ROOT);
        String text = extractPreviewText(soubor.getObsah(), ext);
        if (text == null) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                    .body("Preview not supported for this file.");
        }
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + soubor.getNazev() + ".txt\"")
                .body(text);
    }

    @PutMapping(value = "/files/{id}/edit", consumes = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<Void> edit(@PathVariable Long id, @org.springframework.web.bind.annotation.RequestBody String newContent) {
        Soubor soubor = souborRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Soubor not found"));
        String ext = Optional.ofNullable(soubor.getPripona()).orElse("").toLowerCase(Locale.ROOT);
        byte[] updated = buildEditedContent(ext, Optional.ofNullable(newContent).orElse(""));
        if (updated == null) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Edit not supported for this file.");
        }
        soubor.setObsah(updated);
        soubor.setDatumModifikace(LocalDateTime.now());
        souborRepository.save(soubor);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/files/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Soubor soubor = souborRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Soubor not found"));
        souborRepository.delete(soubor);
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/files/{id}/description", consumes = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<Void> updateDescription(@PathVariable Long id, @org.springframework.web.bind.annotation.RequestBody String description) {
        Soubor soubor = souborRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Soubor not found"));
        soubor.setPopis(description);
        soubor.setDatumModifikace(LocalDateTime.now());
        souborRepository.save(soubor);
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/logs/{id}/description", consumes = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<Void> updateLogDescription(@PathVariable Long id, @org.springframework.web.bind.annotation.RequestBody String description) {
        Log log = logRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Log not found"));
        log.setPopis(description);
        log.setDatumZmeny(LocalDateTime.now());
        logRepository.save(log);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/logs/{id}")
    public ResponseEntity<Void> deleteLog(@PathVariable Long id) {
        if (!logRepository.existsById(id)) {
            throw new IllegalArgumentException("Log not found");
        }
        logRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/logs")
    public List<LogItem> logs(@RequestParam(name = "archiveId", required = false) Long archiveId,
                              @RequestParam(name = "table", required = false) String table,
                              @RequestParam(name = "op", required = false) String op,
                              @RequestParam(name = "size", defaultValue = "100") int size) {
        Pageable pageable = PageRequest.of(0, Math.max(1, Math.min(size, 500)));
        Map<String, String> statusNames = objednavkaStatusRepository.findAll().stream()
                .collect(HashMap::new, (m, s) -> {
                    if (s.getIdStatus() != null) {
                        m.put(String.valueOf(s.getIdStatus()), Optional.ofNullable(s.getNazev()).orElse(""));
                    }
                }, HashMap::putAll);
        Map<String, String> supermarketNames = supermarketRepository.findAll().stream()
                .collect(HashMap::new, (m, s) -> {
                    if (s.getIdSupermarket() != null) {
                        m.put(String.valueOf(s.getIdSupermarket()), Optional.ofNullable(s.getNazev()).orElse(""));
                    }
                }, HashMap::putAll);
        Map<String, String> userNames = uzivatelRepository.findAll().stream()
                .collect(HashMap::new, (m, u) -> {
                    if (u.getIdUzivatel() != null) {
                        m.put(String.valueOf(u.getIdUzivatel()), (u.getJmeno() + " " + u.getPrijmeni()).trim());
                    }
                }, HashMap::putAll);
        return logRepository.findFilteredWithPath(archiveId, safeQuery(table), safeQuery(op), pageable).stream()
                .map(log -> new LogItem(
                        log.getIdLog(),
                        log.getTableName(),
                        log.getOperation(),
                        log.getTimestamp() != null ? DATE_TIME_FORMAT.format(log.getTimestamp().toLocalDateTime()) : "",
                        formatDataString(log.getPopis(), statusNames, supermarketNames, userNames),
                        log.getArchivPath(),
                        log.getIdRekord(),
                        resolveRecordName(log.getTableName(), log.getIdRekord()),
                        formatDataString(log.getNovaData(), statusNames, supermarketNames, userNames),
                        formatDataString(log.getStaraData(), statusNames, supermarketNames, userNames)
                ))
                .toList();
    }

    public record FileItem(Long id, String name, String ext, String type, String archive, String owner, String description,
                           String uploaded, String updated, Long size) {}

    private byte[] buildEditedContent(String ext, String text) {
        String lowerExt = Optional.ofNullable(ext).orElse("").toLowerCase(Locale.ROOT);
        try {
            if (lowerExt.equals("docx")) {
                return buildDocx(text);
            }
            if (lowerExt.equals("xlsx") || lowerExt.equals("xls")) {
                return buildSpreadsheet(text);
            }
            if (isPlainTextExt(lowerExt)) {
                return text.getBytes(StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }

    private boolean isPlainTextExt(String lowerExt) {
        return lowerExt.equals("txt") || lowerExt.equals("log") || lowerExt.equals("json")
                || lowerExt.equals("xml") || lowerExt.equals("csv") || lowerExt.equals("yaml")
                || lowerExt.equals("yml");
    }

    private String extractPreviewText(byte[] content, String ext) {
        if (content == null || content.length == 0) return null;
        String lowerExt = Optional.ofNullable(ext).orElse("").toLowerCase(Locale.ROOT);
        try {
            if (lowerExt.equals("docx")) {
                return extractDocx(content);
            }
            if (lowerExt.equals("xlsx") || lowerExt.equals("xls")) {
                return extractSpreadsheet(content);
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }

    private String extractDocx(byte[] content) throws IOException {
        try (ByteArrayInputStream in = new ByteArrayInputStream(content);
             XWPFDocument document = new XWPFDocument(in);
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }

    private byte[] buildDocx(String text) throws IOException {
        try (XWPFDocument document = new XWPFDocument()) {
            for (String line : text.split("\\r?\\n")) {
                document.createParagraph().createRun().setText(line);
            }
            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                document.write(out);
                return out.toByteArray();
            }
        }
    }

    private String extractSpreadsheet(byte[] content) throws IOException, InvalidFormatException {
        try (ByteArrayInputStream in = new ByteArrayInputStream(content);
             Workbook workbook = WorkbookFactory.create(in)) {
            DataFormatter formatter = new DataFormatter();
            StringBuilder sb = new StringBuilder();
            for (Sheet sheet : workbook) {
                sb.append("Sheet: ").append(sheet.getSheetName()).append(System.lineSeparator());
                for (Row row : sheet) {
                    boolean firstCell = true;
                    for (Cell cell : row) {
                        if (!firstCell) {
                            sb.append("\t");
                        }
                        sb.append(formatter.formatCellValue(cell));
                        firstCell = false;
                    }
                    sb.append(System.lineSeparator());
                }
                sb.append(System.lineSeparator());
            }
            return sb.toString();
        }
    }

    private byte[] buildSpreadsheet(String text) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Sheet1");
            String[] rows = text.split("\\r?\\n");
            for (int r = 0; r < rows.length; r++) {
                String rowContent = rows[r];
                Row row = sheet.createRow(r);
                String[] cells = rowContent.split("\\t");
                for (int c = 0; c < cells.length; c++) {
                    Cell cell = row.createCell(c);
                    cell.setCellValue(cells[c]);
                }
            }
            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                workbook.write(out);
                return out.toByteArray();
            }
        }
    }

    private String formatDataString(String input, Map<String, String> statusNames, Map<String, String> supermarketNames, Map<String, String> userNames) {
        if (input == null || input.isEmpty()) return input;
        String out = input;
        out = replaceWithMap(out, "status", statusNames);
        out = replaceWithMap(out, "supermarket", supermarketNames);
        out = replaceWithMap(out, "uzivatel", userNames);
        out = replaceWithMap(out, "zakaznik", userNames);
        out = replaceWithMap(out, "zamestnanec", userNames);
        out = replaceWithMap(out, "dodavatel", userNames);
        out = redactIds(out);
        return out;
    }

    private String replaceWithMap(String input, String key, Map<String, String> map) {
        if (map == null || map.isEmpty()) return input;
        String patternStr = "\\b" + key + "\\s*=\\s*([-+]?\\d+)\\b";
        Pattern pattern = Pattern.compile(patternStr, Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(input);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String id = matcher.group(1);
            if (map.containsKey(id)) {
                String name = map.get(id);
                matcher.appendReplacement(sb, key + "=" + (name != null && !name.isBlank() ? name : id));
            } else {
                matcher.appendReplacement(sb, key + "=" + id);
            }
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private String redactIds(String input) {
        String out = input.replaceAll("\\b(id\\w*?)\\s*=\\s*[-+]?\\d+\\b", "$1=[hidden]");
        out = out.replaceAll("\\b(uzivatel|zakaznik|zamestnanec|dodavatel)\\s*=\\s*[-+]?\\d+\\b", "$1=[hidden]");
        return out;
    }

    private String resolveRecordName(String table, String idRekord) {
        if (table == null || idRekord == null) {
            return idRekord;
        }
        try {
            String upper = table.toUpperCase(Locale.ROOT);
            Long parsedId = parseId(idRekord);
            if (parsedId == null) {
                return null;
            }
            if (upper.contains("UZIVATEL") || upper.contains("ZAKAZNIK") || upper.contains("ZAMESTNANEC") || upper.contains("DODAVATEL")) {
                return uzivatelRepository.findById(parsedId)
                        .map(u -> u.getJmeno() + " " + u.getPrijmeni()).orElse(null);
            }
            switch (upper) {
                case "ZBOZI":
                    return zboziRepository.findById(parsedId)
                            .map(Zbozi::getNazev).orElse(null);
                case "OBJEDNAVKA":
                    return objednavkaRepository.findWithUser(parsedId)
                            .map(o -> {
                                if (o.getUzivatel() != null) {
                                    return o.getUzivatel().getJmeno() + " " + o.getUzivatel().getPrijmeni();
                                }
                                return "Objednavka " + o.getIdObjednavka();
                            })
                            .orElse(null);
                case "OBJEDNAVKA_STATUS":
                case "OBJEDNAVKA_STATUSY":
                case "STATUSOBJEDNAVKY":
                    return objednavkaStatusRepository.findById(parsedId)
                            .map(s -> s.getNazev() != null ? s.getNazev() : s.getIdStatus().toString())
                            .orElse(null);
                case "SUPERMARKET":
                    return supermarketRepository.findById(parsedId)
                            .map(s -> s.getNazev() != null ? s.getNazev() : s.getIdSupermarket().toString())
                            .orElse(null);
                case "SKLAD":
                    return skladRepository.findById(parsedId)
                            .map(Sklad::getNazev).orElse(null);
                default:
                    return null;
            }
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Long parseId(String value) {
        if (value == null) return null;
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public record LogItem(Long id, String table, String op, String timestamp, String descr, String archive,
                          String recordId, String recordName, String newData, String oldData) {}

    private boolean isLogFolder(Archiv archiv) {
        return archiv != null && archiv.getNazev() != null
                && archiv.getNazev().equalsIgnoreCase("log");
    }
}

package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.DbObjectResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class DbMetadataService {

    private final JdbcTemplate jdbcTemplate;
    private static final Set<String> SUPPORTED_TYPES = Set.of(
            "TABLE", "VIEW", "INDEX", "SEQUENCE",
            "TRIGGER", "PROCEDURE", "FUNCTION",
            "PACKAGE", "PACKAGE BODY", "SYNONYM"
    );

    public List<DbObjectResponse> listObjects() {
        String sql = """
                SELECT object_type, object_name, created, last_ddl_time
                FROM user_objects
                WHERE object_type IN ('TABLE','VIEW','INDEX','SEQUENCE','TRIGGER','PROCEDURE','FUNCTION','PACKAGE','PACKAGE BODY','SYNONYM')
                ORDER BY object_type, object_name
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> mapRow(rs));
    }

    public String getDdl(String type, String name) {
        String objectType = normalize(type);
        String objectName = name != null ? name.trim().toUpperCase(Locale.ROOT) : "";
        if (objectType.isEmpty() || !SUPPORTED_TYPES.contains(objectType)) {
            return null;
        }
        String sql = "SELECT DBMS_METADATA.GET_DDL(?, ?) FROM dual";
        return jdbcTemplate.query(sql, ps -> {
            ps.setString(1, objectType);
            ps.setString(2, objectName);
        }, rs -> rs.next() ? rs.getString(1) : null);
    }

    private String normalize(String type) {
        if (type == null) return "";
        String t = type.trim().toUpperCase(Locale.ROOT);
        return switch (t) {
            case "TABLE", "VIEW", "INDEX", "SEQUENCE", "TRIGGER", "PROCEDURE", "FUNCTION", "PACKAGE" -> t;
            case "PACKAGE BODY" -> "PACKAGE BODY";
            case "SYNONYM" -> "SYNONYM";
            default -> t;
        };
    }

    private DbObjectResponse mapRow(ResultSet rs) throws SQLException {
        LocalDateTime created = rs.getTimestamp("created") != null
                ? rs.getTimestamp("created").toLocalDateTime()
                : null;
        LocalDateTime ddl = rs.getTimestamp("last_ddl_time") != null
                ? rs.getTimestamp("last_ddl_time").toLocalDateTime()
                : null;
        return new DbObjectResponse(
                rs.getString("object_type"),
                rs.getString("object_name"),
                created,
                ddl
        );
    }
}

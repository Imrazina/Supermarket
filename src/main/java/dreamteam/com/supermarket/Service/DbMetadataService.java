package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.DbObjectResponse;
import lombok.RequiredArgsConstructor;
import oracle.jdbc.OracleTypes;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
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
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_dbmeta.list_objects(?) }");
            cs.registerOutParameter(1, OracleTypes.CURSOR);
            cs.execute();
            try (ResultSet rs = (ResultSet) cs.getObject(1)) {
                List<DbObjectResponse> list = new java.util.ArrayList<>();
                while (rs.next()) {
                    list.add(mapRow(rs));
                }
                return list;
            }
        });
    }

    public String getDdl(String type, String name) {
        String objectType = normalize(type);
        String objectName = name != null ? name.trim().toUpperCase(Locale.ROOT) : "";
        if (objectType.isEmpty() || !SUPPORTED_TYPES.contains(objectType)) {
            return null;
        }
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_dbmeta.get_ddl(?, ?, ?) }");
            cs.setString(1, objectType);
            cs.setString(2, objectName);
            cs.registerOutParameter(3, Types.CLOB);
            cs.execute();
            return cs.getString(3);
        });
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

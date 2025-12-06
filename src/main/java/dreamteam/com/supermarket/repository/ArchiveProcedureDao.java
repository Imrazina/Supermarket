package dreamteam.com.supermarket.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;

import oracle.jdbc.OracleTypes;

@Repository
@RequiredArgsConstructor
public class ArchiveProcedureDao {

    private final JdbcTemplate jdbcTemplate;

    public List<ArchiveNode> getTree() {
        return jdbcTemplate.execute(
                call("{ call pkg_archive.get_tree(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                extractCursor(1, rs -> new ArchiveNode(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getObject("parent_id") != null ? rs.getLong("parent_id") : null,
                        rs.getInt("lvl"),
                        rs.getString("path")
                ))
        );
    }

    public List<FileMeta> getFiles(Long archiveId, String query, int size) {
        return jdbcTemplate.execute(
                call("{ call pkg_archive.get_files(?, ?, ?, ?) }", cs -> {
                    if (archiveId != null) {
                        cs.setLong(1, archiveId);
                    } else {
                        cs.setNull(1, Types.NUMERIC);
                    }
                    if (query != null && !query.isBlank()) {
                        cs.setString(2, query);
                    } else {
                        cs.setNull(2, Types.VARCHAR);
                    }
                    cs.setInt(3, size);
                    cs.registerOutParameter(4, OracleTypes.CURSOR);
                }),
                extractCursor(4, rs -> new FileMeta(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getString("ext"),
                        rs.getString("type"),
                        rs.getString("archive"),
                        rs.getString("owner"),
                        rs.getString("description"),
                        rs.getTimestamp("uploaded") != null ? rs.getTimestamp("uploaded").toLocalDateTime() : null,
                        rs.getTimestamp("updated") != null ? rs.getTimestamp("updated").toLocalDateTime() : null,
                        rs.getLong("size")
                ))
        );
    }

    public FileData getFileData(Long fileId) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_archive.get_file_data(?, ?, ?, ?, ?) }");
            cs.setLong(1, fileId);
            cs.registerOutParameter(2, Types.VARCHAR);
            cs.registerOutParameter(3, Types.VARCHAR);
            cs.registerOutParameter(4, Types.VARCHAR);
            cs.registerOutParameter(5, Types.BLOB);
            return cs;
        }, (CallableStatementCallback<FileData>) cs -> {
            cs.execute();
            String name = cs.getString(2);
            String ext = cs.getString(3);
            String type = cs.getString(4);
            byte[] content = cs.getBytes(5);
            return new FileData(name, ext, type, content);
        });
    }

    public Long saveFile(Long archiveId, String ownerEmail, String filename, String mime, byte[] content) {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_archive.save_file(?, ?, ?, ?, ?, ?) }");
            cs.setLong(1, archiveId);
            cs.setString(2, ownerEmail);
            cs.setString(3, filename);
            cs.setString(4, mime);
            cs.setBinaryStream(5, new ByteArrayInputStream(content), content.length);
            cs.registerOutParameter(6, Types.NUMERIC);
            return cs;
        }, (CallableStatementCallback<Long>) cs -> {
            cs.execute();
            return cs.getLong(6);
        });
    }

    public void updateFileData(Long fileId, byte[] content) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_archive.update_file_data(?, ?) }");
            cs.setLong(1, fileId);
            cs.setBinaryStream(2, new ByteArrayInputStream(content), content.length);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public void updateFileDescription(Long fileId, String description) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_archive.update_file_descr(?, ?) }");
            cs.setLong(1, fileId);
            cs.setString(2, description);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public void deleteFile(Long fileId) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_archive.delete_file(?) }");
            cs.setLong(1, fileId);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public List<LogItem> getLogs(Long archiveId, String table, String op, int size) {
        return jdbcTemplate.execute(
                call("{ call pkg_archive.get_logs(?, ?, ?, ?, ?) }", cs -> {
                    if (archiveId != null) {
                        cs.setLong(1, archiveId);
                    } else {
                        cs.setNull(1, Types.NUMERIC);
                    }
                    if (table != null && !table.isBlank()) {
                        cs.setString(2, table);
                    } else {
                        cs.setNull(2, Types.VARCHAR);
                    }
                    if (op != null && !op.isBlank()) {
                        cs.setString(3, op);
                    } else {
                        cs.setNull(3, Types.VARCHAR);
                    }
                    cs.setInt(4, size);
                    cs.registerOutParameter(5, OracleTypes.CURSOR);
                }),
                extractCursor(5, rs -> new LogItem(
                        rs.getLong("id"),
                        rs.getString("table_name"),
                        rs.getString("op"),
                        rs.getTimestamp("timestamp") != null ? rs.getTimestamp("timestamp").toLocalDateTime() : null,
                        rs.getString("descr"),
                        rs.getString("archive_path"),
                        rs.getString("record_id"),
                        rs.getString("new_data"),
                        rs.getString("old_data")
                ))
        );
    }

    public void updateLogDescription(Long logId, String description) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_archive.update_log_descr(?, ?) }");
            cs.setLong(1, logId);
            cs.setString(2, description);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public void deleteLog(Long logId) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_archive.delete_log(?) }");
            cs.setLong(1, logId);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    private CallableStatementCreator call(String sql, SqlConfigurer configurer) {
        return (Connection con) -> {
            CallableStatement cs = con.prepareCall(sql);
            configurer.accept(cs);
            return cs;
        };
    }

    private <T> CallableStatementCallback<List<T>> extractCursor(int outIndex, RowMapper<T> mapper) {
        return (CallableStatementCallback<List<T>>) cs -> {
            cs.execute();
            List<T> result = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                while (rs.next()) {
                    result.add(mapper.map(rs));
                }
            }
            return result;
        };
    }

    @FunctionalInterface
    private interface SqlConfigurer {
        void accept(CallableStatement cs) throws SQLException;
    }

    @FunctionalInterface
    private interface RowMapper<T> {
        T map(ResultSet rs) throws SQLException;
    }

    public record ArchiveNode(Long id, String name, Long parentId, int level, String path) {}

    public record FileMeta(Long id, String name, String ext, String type, String archive, String owner,
                           String description, java.time.LocalDateTime uploaded, java.time.LocalDateTime updated, Long size) {}

    public record FileData(String name, String ext, String type, byte[] content) {}

    public record LogItem(Long id, String table, String op, java.time.LocalDateTime timestamp,
                          String descr, String archive, String recordId, String newData, String oldData) {}
}

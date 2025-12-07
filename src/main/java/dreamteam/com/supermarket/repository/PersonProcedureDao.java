package dreamteam.com.supermarket.repository;

import lombok.RequiredArgsConstructor;
import oracle.jdbc.OracleTypes;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class PersonProcedureDao {

    private final JdbcTemplate jdbcTemplate;

    // Zamestnanec
    public EmployeeRow getEmployee(Long id) {
        return jdbcTemplate.execute(
                call("{ call pkg_person.employee_get(?, ?) }", cs -> {
                    cs.setLong(1, id);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractSingleEmployee(2)
        );
    }

    public List<EmployeeRow> listEmployees() {
        return jdbcTemplate.execute(
                call("{ call pkg_person.employee_list(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                extractEmployees(1)
        );
    }

    public List<String> listPositions() {
        return jdbcTemplate.execute(
                call("{ call pkg_person.employee_positions(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                (CallableStatementCallback<List<String>>) cs -> {
                    cs.execute();
                    List<String> positions = new ArrayList<>();
                    try (ResultSet rs = (ResultSet) cs.getObject(1)) {
                        while (rs.next()) {
                            positions.add(rs.getString("pozice"));
                        }
                    }
                    return positions;
                }
        );
    }

    public void saveEmployee(EmployeeRow row) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_person.employee_save(?, ?, ?, ?) }");
            cs.setLong(1, row.id());
            if (row.mzda() != null) {
                cs.setBigDecimal(2, row.mzda());
            } else {
                cs.setNull(2, Types.NUMERIC);
            }
            if (row.datumNastupa() != null) {
                cs.setDate(3, Date.valueOf(row.datumNastupa()));
            } else {
                cs.setNull(3, Types.DATE);
            }
            cs.setString(4, row.pozice());
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public void deleteEmployee(Long id) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_person.employee_delete(?) }");
            cs.setLong(1, id);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    // Zakaznik
    public CustomerRow getCustomer(Long id) {
        return jdbcTemplate.execute(
                call("{ call pkg_person.customer_get(?, ?) }", cs -> {
                    cs.setLong(1, id);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractSingleCustomer(2)
        );
    }

    public List<CustomerRow> listCustomers() {
        return jdbcTemplate.execute(
                call("{ call pkg_person.customer_list(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                extractCustomers(1)
        );
    }

    public void saveCustomer(CustomerRow row) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_person.customer_save(?, ?) }");
            cs.setLong(1, row.id());
            cs.setString(2, row.karta());
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public void deleteCustomer(Long id) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_person.customer_delete(?) }");
            cs.setLong(1, id);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public String nextLoyaltyCard() {
        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ ? = call FN_NEXT_LOYALTY_CARD }");
            cs.registerOutParameter(1, Types.VARCHAR);
            return cs;
        }, (CallableStatementCallback<String>) cs -> {
            cs.execute();
            return cs.getString(1);
        });
    }

    // Dodavatel
    public SupplierRow getSupplier(Long id) {
        return jdbcTemplate.execute(
                call("{ call pkg_person.supplier_get(?, ?) }", cs -> {
                    cs.setLong(1, id);
                    cs.registerOutParameter(2, OracleTypes.CURSOR);
                }),
                extractSingleSupplier(2)
        );
    }

    public List<SupplierRow> listSuppliers() {
        return jdbcTemplate.execute(
                call("{ call pkg_person.supplier_list(?) }", cs -> cs.registerOutParameter(1, OracleTypes.CURSOR)),
                extractSuppliers(1)
        );
    }

    public void saveSupplier(SupplierRow row) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_person.supplier_save(?, ?) }");
            cs.setLong(1, row.id());
            cs.setString(2, row.firma());
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    public void deleteSupplier(Long id) {
        jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{ call pkg_person.supplier_delete(?) }");
            cs.setLong(1, id);
            return cs;
        }, (CallableStatementCallback<Void>) cs -> {
            cs.execute();
            return null;
        });
    }

    // Helpers
    private CallableStatementCreator call(String sql, SqlConfigurer configurer) {
        return (Connection con) -> {
            CallableStatement cs = con.prepareCall(sql);
            configurer.accept(cs);
            return cs;
        };
    }

    private CallableStatementCallback<List<EmployeeRow>> extractEmployees(int outIndex) {
        return (CallableStatementCallback<List<EmployeeRow>>) cs -> {
            cs.execute();
            List<EmployeeRow> list = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                while (rs.next()) {
                    list.add(mapEmployee(rs));
                }
            }
            return list;
        };
    }

    private CallableStatementCallback<EmployeeRow> extractSingleEmployee(int outIndex) {
        return (CallableStatementCallback<EmployeeRow>) cs -> {
            cs.execute();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                if (rs.next()) {
                    return mapEmployee(rs);
                }
            }
            return null;
        };
    }

    private CallableStatementCallback<List<CustomerRow>> extractCustomers(int outIndex) {
        return (CallableStatementCallback<List<CustomerRow>>) cs -> {
            cs.execute();
            List<CustomerRow> list = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                while (rs.next()) {
                    list.add(mapCustomer(rs));
                }
            }
            return list;
        };
    }

    private CallableStatementCallback<CustomerRow> extractSingleCustomer(int outIndex) {
        return (CallableStatementCallback<CustomerRow>) cs -> {
            cs.execute();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                if (rs.next()) {
                    return mapCustomer(rs);
                }
            }
            return null;
        };
    }

    private CallableStatementCallback<List<SupplierRow>> extractSuppliers(int outIndex) {
        return (CallableStatementCallback<List<SupplierRow>>) cs -> {
            cs.execute();
            List<SupplierRow> list = new ArrayList<>();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                while (rs.next()) {
                    list.add(mapSupplier(rs));
                }
            }
            return list;
        };
    }

    private CallableStatementCallback<SupplierRow> extractSingleSupplier(int outIndex) {
        return (CallableStatementCallback<SupplierRow>) cs -> {
            cs.execute();
            try (ResultSet rs = (ResultSet) cs.getObject(outIndex)) {
                if (rs.next()) {
                    return mapSupplier(rs);
                }
            }
            return null;
        };
    }

    private EmployeeRow mapEmployee(ResultSet rs) throws SQLException {
        Date d = rs.getDate("datum");
        LocalDate ld = d != null ? d.toLocalDate() : null;
        return new EmployeeRow(
                rs.getLong("id"),
                rs.getBigDecimal("mzda"),
                ld,
                rs.getString("pozice")
        );
    }

    private CustomerRow mapCustomer(ResultSet rs) throws SQLException {
        return new CustomerRow(
                rs.getLong("id"),
                rs.getString("karta")
        );
    }

    private SupplierRow mapSupplier(ResultSet rs) throws SQLException {
        return new SupplierRow(
                rs.getLong("id"),
                rs.getString("firma")
        );
    }

    @FunctionalInterface
    private interface SqlConfigurer {
        void accept(CallableStatement cs) throws SQLException;
    }

    public record EmployeeRow(Long id, BigDecimal mzda, LocalDate datumNastupa, String pozice) {}
    public record CustomerRow(Long id, String karta) {}
    public record SupplierRow(Long id, String firma) {}
}

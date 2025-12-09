package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.market.ObjednavkaStatus;
import dreamteam.com.supermarket.repository.MarketProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ObjednavkaStatusJdbcService {

    private final MarketProcedureDao marketDao;

    public List<ObjednavkaStatus> findAll() {
        return marketDao.listStatus().stream()
                .map(r -> {
                    ObjednavkaStatus status = new ObjednavkaStatus();
                    status.setIdStatus(r.id());
                    status.setNazev(r.nazev());
                    return status;
                })
                .toList();
    }

    public ObjednavkaStatus findById(Long id) {
        if (id == null) {
            return null;
        }
        var r = marketDao.getStatus(id);
        if (r == null) return null;
        ObjednavkaStatus status = new ObjednavkaStatus();
        status.setIdStatus(r.id());
        status.setNazev(r.nazev());
        return status;
    }

    public ObjednavkaStatus findByName(String name) {
        if (name == null || name.isBlank()) {
            return null;
        }
        String normalized = normalize(name);
        return findAll().stream()
                .filter(s -> normalize(s.getNazev()).equals(normalized))
                .findFirst()
                .orElse(null);
    }

    private String normalize(String input) {
        if (input == null) return "";
        String base = java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return base.trim().toUpperCase();
    }
}

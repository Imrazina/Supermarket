package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.PravoResponse;
import dreamteam.com.supermarket.controller.dto.ProfileMetaResponse;
import dreamteam.com.supermarket.controller.dto.ProfileUpdateRequest;
import dreamteam.com.supermarket.model.location.Adresa;
import dreamteam.com.supermarket.model.location.Mesto;
import dreamteam.com.supermarket.model.user.*;
import dreamteam.com.supermarket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private static final List<String> DEFAULT_POSITIONS = List.of(
            "Vedoucí prodejny",
            "Zástupce vedoucího",
            "Manažer skladu",
            "Specialista nákupu",
            "Analytik prodeje",
            "HR manažer"
    );

    private final UzivatelRepository uzivatelRepository;
    private final RoleRepository roleRepository;
    private final AdresaRepository adresaRepository;
    private final MestoRepository mestoRepository;
    private final ZamestnanecRepository zamestnanecRepository;
    private final ZakaznikRepository zakaznikRepository;
    private final DodavatelRepository dodavatelRepository;
    private final PasswordEncoder passwordEncoder;
    private final PravoRepository pravoRepository;

    @Transactional(readOnly = true)
    public List<PravoResponse> getPermissions() {
        return pravoRepository.findAll().stream()
                .map(pravo -> new PravoResponse(
                        pravo.getIdPravo(),
                        pravo.getKod(),
                        pravo.getNazev(),
                        pravo.getPopis()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public ProfileMetaResponse getProfileMeta() {
        List<ProfileMetaResponse.RoleOption> roles = roleRepository.findAll().stream()
                .map(role -> new ProfileMetaResponse.RoleOption(role.getIdRole(), role.getNazev()))
                .toList();
        List<ProfileMetaResponse.CityOption> cities = mestoRepository.findAll().stream()
                .map(city -> new ProfileMetaResponse.CityOption(city.getPsc(), city.getNazev(), city.getKraj()))
                .toList();
        List<String> positions = zamestnanecRepository.findDistinctPositions();
        if (positions.isEmpty()) {
            positions = DEFAULT_POSITIONS;
        }
        return new ProfileMetaResponse(roles, cities, positions);
    }

    @Transactional
    public void updateProfile(Uzivatel currentUser, ProfileUpdateRequest request) {
        applyPersonalData(currentUser, request);
        applyRole(currentUser, request.getRoleCode());
        applyPassword(currentUser, request.getNewPassword());
        updateAddress(currentUser, request);
        uzivatelRepository.save(currentUser);

        Zamestnanec employee = zamestnanecRepository.findById(currentUser.getIdUzivatel()).orElse(null);
        Zakaznik customer = zakaznikRepository.findById(currentUser.getIdUzivatel()).orElse(null);
        Dodavatel supplier = dodavatelRepository.findById(currentUser.getIdUzivatel()).orElse(null);

        updateEmployeeData(currentUser, employee, request);
        updateCustomerData(customer, request);
        updateSupplierData(supplier, request);
    }

    private void applyPersonalData(Uzivatel user, ProfileUpdateRequest request) {
        validateUniqueEmail(user, request.getEmail());
        validateUniquePhone(user, request.getPhone());
        user.setJmeno(request.getFirstName().trim());
        user.setPrijmeni(request.getLastName().trim());
        user.setEmail(request.getEmail().trim().toLowerCase(Locale.ROOT));
        user.setTelefonniCislo(request.getPhone().trim());
    }

    private void validateUniqueEmail(Uzivatel currentUser, String email) {
        if (!StringUtils.hasText(email)) {
            return;
        }
        uzivatelRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .filter(other -> !other.getIdUzivatel().equals(currentUser.getIdUzivatel()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Email již používá jiný uživatel.");
                });
    }

    private void validateUniquePhone(Uzivatel currentUser, String phone) {
        if (!StringUtils.hasText(phone)) {
            return;
        }
        uzivatelRepository.findByTelefonniCislo(phone.trim())
                .filter(other -> !other.getIdUzivatel().equals(currentUser.getIdUzivatel()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Telefon již používá jiný uživatel.");
                });
    }

    private void applyRole(Uzivatel user, String roleCode) {
        if (!StringUtils.hasText(roleCode)) {
            return;
        }
        String requested = roleCode.trim();
        String currentRole = user.getRole() != null ? user.getRole().getNazev() : "";
        if ("ADMIN".equalsIgnoreCase(currentRole) && !requested.equalsIgnoreCase(currentRole)) {
            throw new IllegalArgumentException("Administrátor si nemůže změnit roli.");
        }
        Role role = roleRepository.findByNazev(requested)
                .orElseThrow(() -> new IllegalArgumentException("Role " + roleCode + " neexistuje."));
        user.setRole(role);
    }

    private void applyPassword(Uzivatel user, String newPassword) {
        if (!StringUtils.hasText(newPassword)) {
            return;
        }
        user.setHeslo(passwordEncoder.encode(newPassword));
    }

    private void updateAddress(Uzivatel user, ProfileUpdateRequest request) {
        if (!StringUtils.hasText(request.getStreet()) || !StringUtils.hasText(request.getCityPsc())) {
            return;
        }
        Mesto mesto = mestoRepository.findById(request.getCityPsc().trim())
                .orElseThrow(() -> new IllegalArgumentException("Město s PSČ " + request.getCityPsc() + " neexistuje."));
        Adresa adresa = user.getAdresa();
        if (adresa == null) {
            adresa = new Adresa();
        }
        adresa.setUlice(request.getStreet().trim());
        adresa.setCisloPopisne(request.getHouseNumber().trim());
        adresa.setCisloOrientacni(request.getOrientationNumber().trim());
        adresa.setMesto(mesto);
        Adresa saved = adresaRepository.save(adresa);
        user.setAdresa(saved);
    }

    private void updateEmployeeData(Uzivatel user, Zamestnanec existing, ProfileUpdateRequest request) {
        boolean payloadProvided = StringUtils.hasText(request.getPosition())
                || request.getSalary() != null
                || StringUtils.hasText(request.getHireDate());
        if (existing == null && !payloadProvided) {
            return;
        }
        if (!StringUtils.hasText(request.getPosition())
                || request.getSalary() == null
                || request.getSalary().compareTo(BigDecimal.ZERO) <= 0
                || !StringUtils.hasText(request.getHireDate())) {
            throw new IllegalArgumentException("Zaměstnanci musí mít vyplněnou pozici, mzdu a datum nástupu.");
        }
        Zamestnanec employee = existing;
        if (employee == null) {
            employee = Zamestnanec.builder()
                    .id(user.getIdUzivatel())
                    .uzivatel(user)
                    .build();
        }
        BigDecimal salary = request.getSalary().max(BigDecimal.ZERO);
        employee.setPozice(request.getPosition().trim());
        employee.setMzda(salary);
        employee.setDatumNastupa(LocalDate.parse(request.getHireDate().trim()));
        employee.setUzivatel(user);
        zamestnanecRepository.save(employee);
    }

    private void updateCustomerData(Zakaznik customer, ProfileUpdateRequest request) {
        if (customer == null) {
            return;
        }
        if (StringUtils.hasText(request.getLoyaltyCard())) {
            customer.setKartaVernosti(request.getLoyaltyCard().trim());
        } else {
            customer.setKartaVernosti(null);
        }
        zakaznikRepository.save(customer);
    }

    private void updateSupplierData(Dodavatel supplier, ProfileUpdateRequest request) {
        if (supplier == null) {
            return;
        }
        if (!StringUtils.hasText(request.getSupplierCompany())) {
            throw new IllegalArgumentException("Dodavatel musí mít uvedenou společnost.");
        }
        supplier.setFirma(request.getSupplierCompany().trim());
        dodavatelRepository.save(supplier);
    }
}

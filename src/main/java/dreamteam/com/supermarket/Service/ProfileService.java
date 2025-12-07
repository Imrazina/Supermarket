package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.PravoResponse;
import dreamteam.com.supermarket.controller.dto.ProfileMetaResponse;
import dreamteam.com.supermarket.controller.dto.ProfileUpdateRequest;
import dreamteam.com.supermarket.model.location.Adresa;
import dreamteam.com.supermarket.model.location.Mesto;
import dreamteam.com.supermarket.model.user.*;
import dreamteam.com.supermarket.Service.AdresaJdbcService;
import dreamteam.com.supermarket.Service.MestoJdbcService;
import dreamteam.com.supermarket.Service.RoleJdbcService;
import dreamteam.com.supermarket.Service.ZamestnanecJdbcService;
import dreamteam.com.supermarket.Service.ZakaznikJdbcService;
import dreamteam.com.supermarket.Service.DodavatelJdbcService;
import dreamteam.com.supermarket.Service.PravoJdbcService;
import dreamteam.com.supermarket.repository.RoleChangeDao;
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

    private final UserJdbcService userJdbcService;
    private final RoleJdbcService roleJdbcService;
    private final AdresaJdbcService adresaJdbcService;
    private final MestoJdbcService mestoJdbcService;
    private final ZamestnanecJdbcService zamestnanecJdbcService;
    private final ZakaznikJdbcService zakaznikJdbcService;
    private final DodavatelJdbcService dodavatelJdbcService;
    private final PasswordEncoder passwordEncoder;
    private final PravoJdbcService pravoJdbcService;
    private final RoleChangeDao roleChangeDao;

    @Transactional(readOnly = true)
    public List<PravoResponse> getPermissions() {
        return pravoJdbcService.findAll().stream()
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
        List<ProfileMetaResponse.RoleOption> roles = roleJdbcService.findAll().stream()
                .map(role -> new ProfileMetaResponse.RoleOption(role.getIdRole(), role.getNazev()))
                .toList();
        List<ProfileMetaResponse.CityOption> cities = mestoJdbcService.findAll().stream()
                .map(city -> new ProfileMetaResponse.CityOption(city.getPsc(), city.getNazev(), city.getKraj()))
                .toList();
        List<String> positions = zamestnanecJdbcService.findDistinctPositions();
        if (positions.isEmpty()) {
            positions = DEFAULT_POSITIONS;
        }
        return new ProfileMetaResponse(roles, cities, positions);
    }

    @Transactional
    public void updateProfile(Uzivatel currentUser, ProfileUpdateRequest request) {
        Uzivatel user = userJdbcService.findById(currentUser.getIdUzivatel());
        if (user == null) {
            throw new IllegalArgumentException("Uzivatel neexistuje.");
        }

        Long oldRoleId = user.getRole() != null ? user.getRole().getIdRole() : null;
        applyPersonalData(user, request);
        Role newRole = applyRole(user, request.getRoleCode());
        applyPassword(user, request.getNewPassword());
        updateAddress(user, request);
        userJdbcService.updateCore(user);

        boolean roleChanged = oldRoleId == null || !oldRoleId.equals(newRole.getIdRole());
        if (roleChanged) {
            roleChangeDao.changeRole(
                    user.getIdUzivatel(),
                    newRole.getIdRole(),
                    request.getSupplierCompany(),
                    request.getLoyaltyCard(),
                    request.getSalary(),
                    parseDate(request.getHireDate()),
                    request.getPosition(),
                    Boolean.TRUE.equals(request.getForce())
            );
        } else {
            Zamestnanec employee = zamestnanecJdbcService.findById(user.getIdUzivatel());
            Zakaznik customer = zakaznikJdbcService.findById(user.getIdUzivatel());
            Dodavatel supplier = dodavatelJdbcService.findById(user.getIdUzivatel());

            updateEmployeeData(user, employee, request);
            updateCustomerData(customer, request);
            updateSupplierData(supplier, request);
        }
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
        if (userJdbcService.emailUsedByOther(email.trim().toLowerCase(Locale.ROOT), currentUser.getIdUzivatel())) {
            throw new IllegalArgumentException("Email uz pouziva jiny uzivatel.");
        }
    }

    private void validateUniquePhone(Uzivatel currentUser, String phone) {
        if (!StringUtils.hasText(phone)) {
            return;
        }
        if (userJdbcService.phoneUsedByOther(phone.trim(), currentUser.getIdUzivatel())) {
            throw new IllegalArgumentException("Telefon uz pouziva jiny uzivatel.");
        }
    }

    private Role applyRole(Uzivatel user, String roleCode) {
        if (!StringUtils.hasText(roleCode)) {
            return user.getRole();
        }
        String requested = roleCode.trim();
        String currentRole = user.getRole() != null ? user.getRole().getNazev() : "";
        if ("ADMIN".equalsIgnoreCase(currentRole) && !requested.equalsIgnoreCase(currentRole)) {
            throw new IllegalArgumentException("Administrator si nemuze zmenit roli.");
        }
        Role role = roleJdbcService.findByNazev(requested);
        if (role == null) {
            throw new IllegalArgumentException("Role " + roleCode + " neexistuje.");
        }
        user.setRole(role);
        return role;
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
        Mesto mesto = mestoJdbcService.findById(request.getCityPsc().trim());
        if (mesto == null) {
            throw new IllegalArgumentException("Mesto s PSC " + request.getCityPsc() + " neexistuje.");
        }
        Adresa adresa = user.getAdresa();
        if (adresa == null) {
            adresa = new Adresa();
        }
        adresa.setUlice(request.getStreet().trim());
        adresa.setCisloPopisne(request.getHouseNumber().trim());
        adresa.setCisloOrientacni(request.getOrientationNumber().trim());
        adresa.setMesto(mesto);
        Adresa saved = adresaJdbcService.save(adresa);
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
            throw new IllegalArgumentException("Zamestnanec musi mit vyplnenou pozici, mzdu a datum nastupu.");
        }
        Zamestnanec employee = existing == null ? Zamestnanec.builder()
                .id(user.getIdUzivatel())
                .uzivatel(user)
                .build() : existing;
        BigDecimal salary = request.getSalary().max(BigDecimal.ZERO);
        employee.setPozice(request.getPosition().trim());
        employee.setMzda(salary);
        employee.setDatumNastupa(LocalDate.parse(request.getHireDate().trim()));
        employee.setUzivatel(user);
        zamestnanecJdbcService.save(employee);
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
        zakaznikJdbcService.save(customer);
    }

    private void updateSupplierData(Dodavatel supplier, ProfileUpdateRequest request) {
        if (supplier == null) {
            return;
        }
        if (!StringUtils.hasText(request.getSupplierCompany())) {
            throw new IllegalArgumentException("Dodavatel musi mit uvedenou spolecnost.");
        }
        supplier.setFirma(request.getSupplierCompany().trim());
        dodavatelJdbcService.save(supplier);
    }

    private LocalDate parseDate(String date) {
        if (!StringUtils.hasText(date)) {
            return null;
        }
        return LocalDate.parse(date.trim());
    }
}

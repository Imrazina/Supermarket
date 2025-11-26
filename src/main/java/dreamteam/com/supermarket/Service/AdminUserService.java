package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.AdminUserResponse;
import dreamteam.com.supermarket.controller.dto.AdminUserUpdateRequest;
import dreamteam.com.supermarket.controller.dto.ImpersonationResponse;
import dreamteam.com.supermarket.model.location.Adresa;
import dreamteam.com.supermarket.model.location.Mesto;
import dreamteam.com.supermarket.model.user.*;
import dreamteam.com.supermarket.repository.*;
import dreamteam.com.supermarket.jwt.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private static final Set<String> EMPLOYEE_ROLES = Set.of("MANAGER", "ANALYTIK", "SUPERVISER");

    private final UzivatelRepository uzivatelRepository;
    private final RoleRepository roleRepository;
    private final AdresaRepository adresaRepository;
    private final MestoRepository mestoRepository;
    private final ZamestnanecRepository zamestnanecRepository;
    private final ZakaznikRepository zakaznikRepository;
    private final DodavatelRepository dodavatelRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers(String roleFilter) {
        List<Uzivatel> users = uzivatelRepository.findAll();
        return users.stream()
                .filter(user -> {
                    if (!StringUtils.hasText(roleFilter)) {
                        return true;
                    }
                    return user.getRole() != null && roleFilter.equalsIgnoreCase(user.getRole().getNazev());
                })
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void updateUser(Long userId, AdminUserUpdateRequest request) {
        Uzivatel user = uzivatelRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Uživatel s ID " + userId + " neexistuje."));
        applyPersonalData(user, request);
        applyRole(user, request.getRoleCode());
        applyPassword(user, request.getNewPassword());
        updateAddress(user, request);
        uzivatelRepository.save(user);
        updateEmployeeData(user, request);
        updateCustomerData(user, request);
        updateSupplierData(user, request);
    }

    @Transactional
    public ImpersonationResponse impersonate(Long userId) {
        Uzivatel user = uzivatelRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Uživatel s ID " + userId + " neexistuje."));
        String token = jwtUtil.generateToken(user);
        String role = user.getRole() != null ? user.getRole().getNazev() : "Uživatel";
        String fullName = user.getJmeno() + " " + user.getPrijmeni();
        return new ImpersonationResponse(token, role, fullName, user.getEmail());
    }

    @Transactional
    public int encodePlainPasswords() {
        List<Uzivatel> users = uzivatelRepository.findAll();
        int updated = 0;
        for (Uzivatel user : users) {
            String current = user.getHeslo();
            if (current == null || current.startsWith("$2a$") || current.startsWith("$2b$") || current.startsWith("$2y$")) {
                continue;
            }
            user.setHeslo(passwordEncoder.encode(current));
            uzivatelRepository.save(user);
            updated++;
        }
        return updated;
    }

    private AdminUserResponse toResponse(Uzivatel user) {
        Adresa adresa = user.getAdresa();
        Zamestnanec zam = zamestnanecRepository.findById(user.getIdUzivatel()).orElse(null);
        Zakaznik zakaznik = zakaznikRepository.findById(user.getIdUzivatel()).orElse(null);
        Dodavatel dodavatel = dodavatelRepository.findById(user.getIdUzivatel()).orElse(null);
        AdminUserResponse.Address address = adresa == null ? null :
                new AdminUserResponse.Address(
                        adresa.getUlice(),
                        adresa.getCisloPopisne(),
                        adresa.getCisloOrientacni(),
                        adresa.getMesto() != null ? adresa.getMesto().getNazev() : "",
                        adresa.getMesto() != null ? adresa.getMesto().getPsc() : ""
                );
        return new AdminUserResponse(
                user.getIdUzivatel(),
                user.getJmeno(),
                user.getPrijmeni(),
                user.getEmail(),
                user.getTelefonniCislo(),
                user.getRole() != null ? user.getRole().getNazev() : "",
                zam != null ? zam.getPozice() : "",
                zam != null ? zam.getMzda() : BigDecimal.ZERO,
                zam != null && zam.getDatumNastupa() != null ? zam.getDatumNastupa().toString() : "",
                address,
                zakaznik != null ? zakaznik.getKartaVernosti() : "",
                dodavatel != null ? dodavatel.getFirma() : ""
        );
    }

    private void applyPersonalData(Uzivatel user, AdminUserUpdateRequest request) {
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
        Role role = roleRepository.findByNazev(roleCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Role " + roleCode + " neexistuje."));
        user.setRole(role);
    }

    private void applyPassword(Uzivatel user, String newPassword) {
        if (!StringUtils.hasText(newPassword)) {
            return;
        }
        user.setHeslo(passwordEncoder.encode(newPassword.trim()));
    }

    private void updateAddress(Uzivatel user, AdminUserUpdateRequest request) {
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
        user.setAdresa(adresaRepository.save(adresa));
    }

    private void updateEmployeeData(Uzivatel user, AdminUserUpdateRequest request) {
        boolean employeeRole = isEmployeeRole(request.getRoleCode());
        Zamestnanec existing = zamestnanecRepository.findById(user.getIdUzivatel()).orElse(null);
        boolean payloadProvided = StringUtils.hasText(request.getPosition())
                || request.getSalary() != null
                || StringUtils.hasText(request.getHireDate());

        if (!employeeRole) {
            if (existing != null) {
                zamestnanecRepository.delete(existing);
            }
            return;
        }

        if (existing == null && !payloadProvided) {
            throw new IllegalArgumentException("Zaměstnanci musí mít vyplněnou pozici, mzdu a datum nástupu.");
        }

        if (!StringUtils.hasText(request.getPosition())
                || request.getSalary() == null
                || request.getSalary().compareTo(BigDecimal.ZERO) <= 0
                || !StringUtils.hasText(request.getHireDate())) {
            throw new IllegalArgumentException("Zaměstnanci musí mít vyplněnou pozici, mzdu a datum nástupu.");
        }

        Zamestnanec zam = existing;
        if (zam == null) {
            zam = Zamestnanec.builder()
                    .id(user.getIdUzivatel())
                    .uzivatel(user)
                    .build();
        }
        BigDecimal salary = request.getSalary().max(BigDecimal.ZERO);
        zam.setPozice(request.getPosition().trim());
        zam.setMzda(salary);
        zam.setDatumNastupa(LocalDate.parse(request.getHireDate().trim()));
        zamestnanecRepository.save(zam);
    }

    private void updateCustomerData(Uzivatel user, AdminUserUpdateRequest request) {
        boolean customerRole = isCustomerRole(request.getRoleCode());
        Zakaznik existing = zakaznikRepository.findById(user.getIdUzivatel()).orElse(null);
        if (!customerRole) {
            if (existing != null) {
                zakaznikRepository.delete(existing);
            }
            return;
        }
        if (!StringUtils.hasText(request.getLoyaltyCard())) {
            throw new IllegalArgumentException("Zákazník musí mít vyplněnou věrnostní kartu.");
        }
        Zakaznik zakaznik = existing;
        if (zakaznik == null) {
            zakaznik = Zakaznik.builder()
                    .id(user.getIdUzivatel())
                    .uzivatel(user)
                    .build();
        }
        zakaznik.setKartaVernosti(request.getLoyaltyCard().trim());
        zakaznikRepository.save(zakaznik);
    }

    private void updateSupplierData(Uzivatel user, AdminUserUpdateRequest request) {
        boolean supplierRole = isSupplierRole(request.getRoleCode());
        Dodavatel existing = dodavatelRepository.findById(user.getIdUzivatel()).orElse(null);
        if (!supplierRole) {
            if (existing != null) {
                dodavatelRepository.delete(existing);
            }
            return;
        }
        if (!StringUtils.hasText(request.getSupplierCompany())) {
            throw new IllegalArgumentException("Dodavatel musí mít uvedenou společnost.");
        }
        Dodavatel dodavatel = existing;
        if (dodavatel == null) {
            dodavatel = Dodavatel.builder()
                    .id(user.getIdUzivatel())
                    .uzivatel(user)
                    .build();
        }
        dodavatel.setFirma(request.getSupplierCompany().trim());
        dodavatelRepository.save(dodavatel);
    }

    private boolean isEmployeeRole(String roleCode) {
        if (!StringUtils.hasText(roleCode)) {
            return false;
        }
        return EMPLOYEE_ROLES.contains(roleCode.trim().toUpperCase(Locale.ROOT));
    }

    private boolean isCustomerRole(String roleCode) {
        return StringUtils.hasText(roleCode) && "ZAKAZNIK".equalsIgnoreCase(roleCode.trim());
    }

    private boolean isSupplierRole(String roleCode) {
        return StringUtils.hasText(roleCode) && "DODAVATEL".equalsIgnoreCase(roleCode.trim());
    }
}

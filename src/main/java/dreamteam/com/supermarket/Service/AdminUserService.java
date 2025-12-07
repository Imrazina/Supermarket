package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.controller.dto.AdminUserResponse;
import dreamteam.com.supermarket.controller.dto.AdminUserUpdateRequest;
import dreamteam.com.supermarket.controller.dto.ImpersonationResponse;
import dreamteam.com.supermarket.jwt.JwtUtil;
import dreamteam.com.supermarket.model.location.Adresa;
import dreamteam.com.supermarket.model.location.Mesto;
import dreamteam.com.supermarket.model.user.*;
import dreamteam.com.supermarket.Service.AdresaJdbcService;
import dreamteam.com.supermarket.Service.MestoJdbcService;
import dreamteam.com.supermarket.Service.RoleJdbcService;
import dreamteam.com.supermarket.Service.ZamestnanecJdbcService;
import dreamteam.com.supermarket.Service.ZakaznikJdbcService;
import dreamteam.com.supermarket.Service.DodavatelJdbcService;
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
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private static final Set<String> EMPLOYEE_ROLES = Set.of("MANAGER", "ANALYTIK", "SUPERVISER");

    private final UserJdbcService userJdbcService;
    private final RoleJdbcService roleJdbcService;
    private final AdresaJdbcService adresaJdbcService;
    private final MestoJdbcService mestoJdbcService;
    private final ZamestnanecJdbcService zamestnanecJdbcService;
    private final ZakaznikJdbcService zakaznikJdbcService;
    private final DodavatelJdbcService dodavatelJdbcService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RoleChangeDao roleChangeDao;

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers(String roleFilter) {
        List<Uzivatel> users = userJdbcService.findAll();
        return users.stream()
                .filter(user -> {
                    if (!StringUtils.hasText(roleFilter)) return true;
                    return user.getRole() != null && roleFilter.equalsIgnoreCase(user.getRole().getNazev());
                })
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void updateUser(Long userId, AdminUserUpdateRequest request) {
        Uzivatel user = userJdbcService.findById(userId);
        if (user == null) {
            throw new IllegalArgumentException("Uzivatel s ID " + userId + " neexistuje.");
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
            updateEmployeeData(user, request);
            updateCustomerData(user, request);
            updateSupplierData(user, request);
        }
    }

    @Transactional
    public ImpersonationResponse impersonate(Long userId) {
        Uzivatel user = userJdbcService.findById(userId);
        if (user == null) {
            throw new IllegalArgumentException("Uzivatel s ID " + userId + " neexistuje.");
        }
        String token = jwtUtil.generateToken(user);
        String role = user.getRole() != null ? user.getRole().getNazev() : "Uzivatel";
        String fullName = user.getJmeno() + " " + user.getPrijmeni();
        return new ImpersonationResponse(token, role, fullName, user.getEmail());
    }

    @Transactional
    public int encodePlainPasswords() {
        List<Uzivatel> users = userJdbcService.findAll();
        int updated = 0;
        for (Uzivatel user : users) {
            String current = user.getHeslo();
            if (current == null || current.startsWith("$2a$") || current.startsWith("$2b$") || current.startsWith("$2y$")) {
                continue;
            }
            user.setHeslo(passwordEncoder.encode(current));
            userJdbcService.updateCore(user);
            updated++;
        }
        return updated;
    }

    private AdminUserResponse toResponse(Uzivatel user) {
        Adresa adresa = user.getAdresa();
        Zamestnanec zam = zamestnanecJdbcService.findById(user.getIdUzivatel());
        Zakaznik zakaznik = zakaznikJdbcService.findById(user.getIdUzivatel());
        Dodavatel dodavatel = dodavatelJdbcService.findById(user.getIdUzivatel());
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
        if (userJdbcService.emailUsedByOther(email.trim().toLowerCase(Locale.ROOT), currentUser.getIdUzivatel())) {
            throw new IllegalArgumentException("Email jiz pouziva jiny uzivatel.");
        }
    }

    private void validateUniquePhone(Uzivatel currentUser, String phone) {
        if (!StringUtils.hasText(phone)) {
            return;
        }
        if (userJdbcService.phoneUsedByOther(phone.trim(), currentUser.getIdUzivatel())) {
            throw new IllegalArgumentException("Telefon jiz pouziva jiny uzivatel.");
        }
    }

    private Role applyRole(Uzivatel user, String roleCode) {
        Role role = roleJdbcService.findByNazev(roleCode.trim());
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
        user.setHeslo(passwordEncoder.encode(newPassword.trim()));
    }

    private void updateAddress(Uzivatel user, AdminUserUpdateRequest request) {
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
        user.setAdresa(adresaJdbcService.save(adresa));
    }

    private void updateEmployeeData(Uzivatel user, AdminUserUpdateRequest request) {
        boolean employeeRole = isEmployeeRole(request.getRoleCode());
        Zamestnanec existing = zamestnanecJdbcService.findById(user.getIdUzivatel());
        boolean payloadProvided = StringUtils.hasText(request.getPosition())
                || request.getSalary() != null
                || StringUtils.hasText(request.getHireDate());

        if (!employeeRole) {
            if (existing != null) {
                zamestnanecJdbcService.deleteById(existing.getId());
            }
            return;
        }

        if (existing == null && !payloadProvided) {
            throw new IllegalArgumentException("Zamestnanci musi mit vyplnenou pozici, mzdu a datum nastupu.");
        }

        if (!StringUtils.hasText(request.getPosition())
                || request.getSalary() == null
                || request.getSalary().compareTo(BigDecimal.ZERO) <= 0
                || !StringUtils.hasText(request.getHireDate())) {
            throw new IllegalArgumentException("Zamestnanci musi mit vyplnenou pozici, mzdu a datum nastupu.");
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
        zamestnanecJdbcService.save(zam);
    }

    private void updateCustomerData(Uzivatel user, AdminUserUpdateRequest request) {
        boolean customerRole = isCustomerRole(request.getRoleCode());
        Zakaznik existing = zakaznikJdbcService.findById(user.getIdUzivatel());
        if (!customerRole) {
            if (existing != null) {
                zakaznikJdbcService.deleteById(existing.getId());
            }
            return;
        }
        if (!StringUtils.hasText(request.getLoyaltyCard())) {
            throw new IllegalArgumentException("Zakaznik musi mit vyplnenou vernostni kartu.");
        }
        Zakaznik zakaznik = existing;
        if (zakaznik == null) {
            zakaznik = Zakaznik.builder()
                    .id(user.getIdUzivatel())
                    .uzivatel(user)
                    .build();
        }
        zakaznik.setKartaVernosti(request.getLoyaltyCard().trim());
        zakaznikJdbcService.save(zakaznik);
    }

    private void updateSupplierData(Uzivatel user, AdminUserUpdateRequest request) {
        boolean supplierRole = isSupplierRole(request.getRoleCode());
        Dodavatel existing = dodavatelJdbcService.findById(user.getIdUzivatel());
        if (!supplierRole) {
            if (existing != null) {
                dodavatelJdbcService.deleteById(existing.getId());
            }
            return;
        }
        if (!StringUtils.hasText(request.getSupplierCompany())) {
            throw new IllegalArgumentException("Dodavatel musi mit uvedenou spolecnost.");
        }
        Dodavatel dodavatel = existing;
        if (dodavatel == null) {
            dodavatel = Dodavatel.builder()
                    .id(user.getIdUzivatel())
                    .uzivatel(user)
                    .build();
        }
        dodavatel.setFirma(request.getSupplierCompany().trim());
        dodavatelJdbcService.save(dodavatel);
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

    private LocalDate parseDate(String date) {
        if (!StringUtils.hasText(date)) {
            return null;
        }
        return LocalDate.parse(date.trim());
    }
}

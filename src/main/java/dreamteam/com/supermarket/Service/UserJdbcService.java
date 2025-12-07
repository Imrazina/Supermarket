package dreamteam.com.supermarket.Service;

import dreamteam.com.supermarket.model.location.Adresa;
import dreamteam.com.supermarket.model.location.Mesto;
import dreamteam.com.supermarket.model.user.Role;
import dreamteam.com.supermarket.model.user.Uzivatel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * JDBC-based access to UZIVATEL without JPA repositories.
 */
@Service
@RequiredArgsConstructor
public class UserJdbcService {

    private final dreamteam.com.supermarket.repository.UserProcedureDao userDao;

    public Uzivatel findByEmail(String email) {
        return userDao.getByEmail(email).stream().findFirst().map(this::map).orElse(null);
    }

    public boolean emailUsedByOther(String email, Long selfId) {
        return userDao.emailUsed(email, selfId);
    }

    public Uzivatel findById(Long id) {
        return userDao.getById(id).stream().findFirst().map(this::map).orElse(null);
    }

    public List<Uzivatel> findAll() {
        return userDao.listAll().stream().map(this::map).toList();
    }

    public Uzivatel findByTelefonniCislo(String telefon) {
        return userDao.getByPhone(telefon).stream().findFirst().map(this::map).orElse(null);
    }

    public boolean phoneUsedByOther(String phone, Long selfId) {
        return userDao.phoneUsed(phone, selfId);
    }

    public List<Uzivatel> findByRoleNazevIgnoreCase(String roleName) {
        return userDao.getByRole(roleName).stream().map(this::map).toList();
    }

    public void updateCore(Uzivatel user) {
        userDao.updateCore(toRow(user));
    }

    public Uzivatel create(String jmeno,
                           String prijmeni,
                           String email,
                           String hesloHashed,
                           String telefon,
                           Long roleId) {
        Long id = userDao.createUser(jmeno, prijmeni, email, hesloHashed, telefon, roleId);
        return Uzivatel.builder()
                .idUzivatel(id)
                .jmeno(jmeno)
                .prijmeni(prijmeni)
                .email(email)
                .heslo(hesloHashed)
                .telefonniCislo(telefon)
                .role(roleId != null ? Role.builder().idRole(roleId).build() : null)
                .build();
    }

    public void deleteById(Long id) {
        userDao.deleteUser(id);
    }

    private Uzivatel map(dreamteam.com.supermarket.repository.UserProcedureDao.UserRow row) {
        Adresa adresa = null;
        if (row.addrId() != null) {
            Mesto mesto = null;
            if (row.psc() != null) {
                mesto = Mesto.builder()
                        .psc(row.psc())
                        .nazev(row.mesto())
                        .kraj(row.kraj())
                        .build();
            }
            adresa = new Adresa(
                    row.addrId(),
                    row.ulice(),
                    row.cpop(),
                    row.corient(),
                    mesto
            );
        }
        return Uzivatel.builder()
                .idUzivatel(row.id())
                .jmeno(row.jmeno())
                .prijmeni(row.prijmeni())
                .email(row.email())
                .heslo(row.heslo())
                .telefonniCislo(row.phone())
                .adresa(adresa)
                .role(row.roleId() != null ? Role.builder().idRole(row.roleId()).nazev(row.roleName()).build() : null)
                .build();
    }

    private dreamteam.com.supermarket.repository.UserProcedureDao.UserRow toRow(Uzivatel u) {
        var adresa = u.getAdresa();
        Long addrId = adresa != null ? adresa.getIdAdresa() : null;
        String ulice = adresa != null ? adresa.getUlice() : null;
        String cpop = adresa != null ? adresa.getCisloPopisne() : null;
        String corient = adresa != null ? adresa.getCisloOrientacni() : null;
        String psc = (adresa != null && adresa.getMesto() != null) ? adresa.getMesto().getPsc() : null;
        String mesto = (adresa != null && adresa.getMesto() != null) ? adresa.getMesto().getNazev() : null;
        String kraj = (adresa != null && adresa.getMesto() != null) ? adresa.getMesto().getKraj() : null;
        return new dreamteam.com.supermarket.repository.UserProcedureDao.UserRow(
                u.getIdUzivatel(),
                u.getJmeno(),
                u.getPrijmeni(),
                u.getEmail(),
                u.getHeslo(),
                u.getTelefonniCislo(),
                u.getRole() != null ? u.getRole().getIdRole() : null,
                u.getRole() != null ? u.getRole().getNazev() : null,
                addrId,
                ulice,
                cpop,
                corient,
                psc,
                mesto,
                kraj
        );
    }
}

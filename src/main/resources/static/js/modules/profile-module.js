export default class ProfileModule {
    constructor(state, app, deps = {}) {
        this.state = state;
        this.app = app;
        this.overviewEl = document.getElementById('profile-overview');
        this.preferencesEl = document.getElementById('profile-preferences');
        this.securityEl = document.getElementById('profile-security');
        this.activityEl = document.getElementById('profile-activity');
        this.editing = false;
        this.formState = null;
        this.currentProfile = null;

        this.fetchDashboardSnapshot = deps.fetchDashboardSnapshot;
        this.fetchPermissionsCatalog = deps.fetchPermissionsCatalog;
        this.mergeDashboardData = deps.mergeDashboardData;
        this.apiUrl = deps.apiUrl;
    }

    get meta() {
        return this.state.profileMeta || { roles: [], cities: [], positions: [] };
    }

    createFormState(profile) {
        const address = profile.address || {};
        const employment = profile.employment || {};
        const customer = profile.customer || {};
        const supplier = profile.supplier || {};
        const cityValue = address.city || address.name || address.psc || '';
        return {
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            email: profile.email || '',
            phone: profile.phone || '',
            roleCode: profile.role || (localStorage.getItem('role') || ''),
            position: employment.position || profile.position || '',
            salary: employment.salary || 0,
            hireDate: employment.hireDate || new Date().toISOString().split('T')[0],
            street: address.street || '',
            houseNumber: address.houseNumber || '',
            orientationNumber: address.orientationNumber || '',
            cityPsc: cityValue,
            newPassword: '',
            confirmPassword: '',
            loyaltyCard: customer.loyaltyCard || '',
            supplierCompany: supplier.company || ''
        };
    }

    toggleEditMode(enable) {
        if (!this.currentProfile) {
            return;
        }
        if (enable) {
            this.editing = true;
            this.formState = this.createFormState(this.currentProfile);
        } else {
            this.editing = false;
            this.formState = null;
        }
        this.render();
    }

    handleFormInput(event) {
        if (!this.formState) {
            return;
        }
        const { name, value } = event.target;
        if (!name) {
            return;
        }
        this.formState[name] = value;
        if (name === 'newPassword' || name === 'confirmPassword') {
            this.showPasswordMatchHint();
        }
    }

    async saveProfile() {
        if (!this.formState) {
            return;
        }
        const newPassword = (this.formState.newPassword || '').trim();
        const confirmPassword = (this.formState.confirmPassword || '').trim();
        if (newPassword && newPassword !== confirmPassword) {
            alert('Zadaná hesla se neshodují.');
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'landing.html';
            return;
        }
        const payload = {
            firstName: this.formState.firstName.trim(),
            lastName: this.formState.lastName.trim(),
            email: this.formState.email.trim(),
            phone: this.formState.phone.trim(),
            roleCode: this.formState.roleCode,
            street: this.formState.street,
            houseNumber: this.formState.houseNumber,
            orientationNumber: this.formState.orientationNumber,
            cityPsc: this.normalizeCityValue(this.formState.cityPsc || ''),
            newPassword
        };
        if (this.shouldIncludeEmploymentSection()) {
            payload.position = (this.formState.position || '').trim();
            payload.salary = this.parseSalary(this.formState.salary);
            payload.hireDate = this.formState.hireDate || '';
        }
        if (this.shouldIncludeCustomerSection()) {
            payload.loyaltyCard = (this.formState.loyaltyCard || '').trim();
        }
        if (this.shouldIncludeSupplierSection()) {
            payload.supplierCompany = (this.formState.supplierCompany || '').trim();
        }
        try {
            const response = await fetch(this.apiUrl('/api/profile'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || 'Aktualizace profilu selhala.');
            }
            const [snapshot] = await Promise.all([
                this.fetchDashboardSnapshot()
            ]);
            if (snapshot) {
                this.state.data = this.mergeDashboardData(snapshot);
            }
            this.toggleEditMode(false);
            this.app?.renderAll();
        } catch (error) {
            console.error('Profile update failed', error);
            alert(error.message || 'Nepodařilo se uložit změny.');
        }
    }

    attachAdminHandlers(isAdmin) {
        if (!isAdmin) {
            return;
        }
        document.getElementById('profile-edit-btn')?.addEventListener('click', () => this.toggleEditMode(true));
        document.getElementById('profile-cancel-btn')?.addEventListener('click', () => this.toggleEditMode(false));
        document.getElementById('profile-save-btn')?.addEventListener('click', () => this.saveProfile());
        if (this.editing) {
            document.getElementById('profile-edit-form')?.addEventListener('input', event => this.handleFormInput(event));
        }
    }

    render() {
        const profile = this.state.data.profile;
        if (!profile) {
            return;
        }
        this.currentProfile = profile;
        if (this.editing && !this.formState) {
            this.formState = this.createFormState(profile);
        }
        if (!this.editing) {
            this.formState = null;
        }
        const security = profile.security || {};
        const isAdmin = ((localStorage.getItem('role') || '').trim().toUpperCase() === 'ADMIN');

        if (this.overviewEl) {
            this.overviewEl.innerHTML = this.editing ? this.renderEditForm(profile, isAdmin) : this.renderOverview(profile, isAdmin);
        }
        if (this.preferencesEl) {
            this.preferencesEl.innerHTML = this.renderAddressBlock(profile);
        }
        if (this.securityEl) {
            this.securityEl.innerHTML = this.renderSecurityBlock(security);
        }
        if (this.activityEl) {
            this.activityEl.innerHTML = '';
        }
        this.attachAdminHandlers(isAdmin);
        this.showPasswordMatchHint();
    }

    renderOverview(profile, isAdmin) {
        return `
            <div class="profile-hero">
                <div class="profile-identity">
                    <p class="profile-role">${profile.position || profile.role || '—'}</p>
                    <h2>${profile.fullName || '—'}</h2>
                </div>
                ${isAdmin ? `
                    <div class="profile-edit-actions">
                        <button type="button" id="profile-edit-btn" class="ghost-btn">Upravit</button>
                    </div>` : ''}
            </div>
            <div class="profile-contact-grid">
                <div><span>Jméno</span><p>${profile.fullName || '—'}</p></div>
                <div><span>E-mail</span><p>${profile.email || '—'}</p></div>
                <div><span>Telefon</span><p>${profile.phone || '—'}</p></div>
                <div><span>Role</span><p>${profile.role || '—'}</p></div>
            </div>
        `;
    }

    renderEditForm(profile, isAdmin) {
        const meta = this.meta;
        const form = this.formState || this.createFormState(profile);
        const activeGroup = (profile.group || form.roleCode || profile.role || '').trim().toUpperCase();
        const showEmployment = activeGroup === 'ZAMESTNANEC';
        const showCustomer = activeGroup === 'ZAKAZNIK';
        const showSupplier = activeGroup === 'DODAVATEL';
        const roleLocked = this.isRoleLocked(profile);
        const roleOptions = [`<option value="">Vyberte roli</option>`]
            .concat(meta.roles.map(role => `<option value="${role.name}" ${form.roleCode === role.name ? 'selected' : ''}>${role.name}</option>`))
            .join('');
        const cityOptions = meta.cities.map(city =>
            `<option value="${city.name}" label="${city.name}${city.region ? ' · ' + city.region : ''} (${city.psc})"></option>`
        ).join('');
        const positionOptions = [`<option value="">Vyberte pozici</option>`]
            .concat(meta.positions.map(pos => `<option value="${pos}" ${form.position === pos ? 'selected' : ''}>${pos}</option>`))
            .join('');
        return `
            <div class="profile-hero">
                <div class="profile-identity">
                    <p class="profile-role">${form.position || form.roleCode}</p>
                    <h2>${form.firstName} ${form.lastName}</h2>
                </div>
                <div class="profile-edit-actions">
                    <button type="button" id="profile-save-btn" class="ghost-btn ghost-strong">Uložit</button>
                    <button type="button" id="profile-cancel-btn" class="ghost-btn ghost-muted">Zrušit</button>
                </div>
            </div>
            <form id="profile-edit-form" class="profile-edit-form">
                <div class="profile-form-section">
                    <h4>Osobní údaje</h4>
                    <div class="profile-form-grid">
                        <label><span>Jméno</span><input type="text" name="firstName" value="${form.firstName}" required></label>
                        <label><span>Příjmení</span><input type="text" name="lastName" value="${form.lastName}" required></label>
                        <label><span>E-mail</span><input type="email" name="email" value="${form.email}" required></label>
                        <label><span>Telefon</span><input type="tel" name="phone" value="${form.phone}"></label>
                        ${roleLocked
                            ? `<label><span>Role</span><input type="text" value="${form.roleCode}" readonly></label>`
                            : `<label><span>Role</span><select name="roleCode">${roleOptions}</select></label>`}
                    </div>
                    ${roleLocked ? '<p class="profile-muted">Administrátor si nemůže změnit roli.</p>' : ''}
                </div>
                <div class="profile-form-section">
                    <h4>Adresní údaje</h4>
                    <div class="profile-form-grid">
                        <label><span>Ulice</span><input type="text" name="street" value="${form.street}" required></label>
                        <label><span>Číslo popisné</span><input type="text" name="houseNumber" value="${form.houseNumber}" required></label>
                        <label><span>Číslo orientační</span><input type="text" name="orientationNumber" value="${form.orientationNumber}" required></label>
                        <label><span>Město</span>
                            <input type="text" name="cityPsc" list="profile-city-options" class="city-picker" value="${form.cityPsc}" placeholder="PSČ nebo název" required>
                            <datalist id="profile-city-options">${cityOptions}</datalist>
                        </label>
                    </div>
                </div>
                ${showEmployment ? `
                <div class="profile-form-section">
                    <h4>Zaměstnanecké údaje</h4>
                    <div class="profile-form-grid">
                        <label><span>Pozice</span><select name="position">${positionOptions}</select></label>
                        <label><span>Mzda (Kč)</span><input type="number" name="salary" min="0" step="0.01" value="${form.salary}"></label>
                        <label><span>Datum nástupu</span><input type="date" name="hireDate" value="${form.hireDate}" required></label>
                    </div>
                </div>` : ''}
                ${showCustomer ? `
                <div class="profile-form-section">
                    <h4>Zákaznické údaje</h4>
                    <div class="profile-form-grid">
                        <label><span>Věrnostní karta</span><input type="text" name="loyaltyCard" value="${form.loyaltyCard || ''}"></label>
                    </div>
                </div>` : ''}
                ${showSupplier ? `
                <div class="profile-form-section">
                    <h4>Dodavatelské údaje</h4>
                    <div class="profile-form-grid">
                        <label><span>Společnost</span><input type="text" name="supplierCompany" value="${form.supplierCompany || ''}" required></label>
                    </div>
                </div>` : ''}
                <div class="profile-form-section">
                    <h4>Změna hesla</h4>
                    <div class="profile-form-grid">
                        <label><span>Nové heslo</span><input type="password" name="newPassword" autocomplete="new-password"></label>
                        <label><span>Potvrzení hesla</span><input type="password" name="confirmPassword" autocomplete="new-password"></label>
                        <div class="password-hint" id="password-hint" style="min-height:18px;font-size:12px;color:#c00;"></div>
                    </div>
                </div>
            </form>
        `;
    }

    isRoleLocked(profile) {
        return ((profile.role || '').trim().toUpperCase() === 'ADMIN');
    }

    getCurrentGroup() {
        return (this.currentProfile?.group || '').trim().toUpperCase();
    }

    shouldIncludeEmploymentSection() {
        return this.getCurrentGroup() === 'ZAMESTNANEC';
    }

    shouldIncludeCustomerSection() {
        return this.getCurrentGroup() === 'ZAKAZNIK';
    }

    shouldIncludeSupplierSection() {
        return this.getCurrentGroup() === 'DODAVATEL';
    }

    parseSalary(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    normalizeCityValue(value) {
        if (!value) return '';
        const trimmed = value.trim();
        const byName = this.meta.cities.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
        if (byName) return byName.psc;
        const direct = this.meta.cities.find(c => c.psc === trimmed);
        if (direct) return direct.psc;
        if (trimmed.length >= 5) {
            const prefix = trimmed.slice(0, 5);
            const prefixMatch = this.meta.cities.find(c => c.psc === prefix);
            if (prefixMatch) return prefixMatch.psc;
        }
        return trimmed;
    }

    renderAddressBlock(profile) {
        const address = profile.address;
        const locationLine = profile.location
            ? `<p>${profile.location}${profile.timezone ? ` · ${profile.timezone}` : ''}</p>`
            : '';
        return `
            <h3>Adresa</h3>
            ${address ? `
                <p>${address.street} ${address.houseNumber}/${address.orientationNumber}</p>
                <p>${address.city}${address.psc ? ` (${address.psc})` : ''}</p>
            ` : '<p class="profile-muted">Adresa není vyplněna.</p>'}
            ${locationLine}
        `;
    }

    renderSecurityBlock(security) {
        return `
            <h3>Bezpečnost</h3>
            <div class="profile-security-list">
                <div><span>MFA</span><p>${security.mfa || 'není nastaveno'}</p></div>
                <div><span>Zařízení</span><p>${security.devices || '—'}</p></div>
                <div><span>Poslední IP</span><p>${security.lastIp || '—'}</p></div>
            </div>
            <p class="profile-muted">Úpravy bezpečnostních údajů řeší administrátor.</p>
        `;
    }

    showPasswordMatchHint() {
        if (!this.formState || !this.editing) {
            return;
        }
        const hintEl = document.getElementById('password-hint');
        if (!hintEl) {
            return;
        }
        const pwd = (this.formState.newPassword || '').trim();
        const confirm = (this.formState.confirmPassword || '').trim();
        if (!pwd && !confirm) {
            hintEl.textContent = '';
            hintEl.style.color = '#666';
            return;
        }
        if (pwd === confirm) {
            hintEl.textContent = 'Hesla se shodují.';
            hintEl.style.color = 'green';
        } else {
            hintEl.textContent = 'Hesla se neshodují.';
            hintEl.style.color = '#c00';
        }
    }

    renderActivityBlock(activity) {
        return `
            <h3>Nedávná aktivita</h3>
            ${activity.length
                ? `<ul class="profile-activity-list">
                        ${activity.map(item => `
                            <li>
                                <strong>${item.time || '--:--'}</strong>
                                <p>${item.text || 'Bez popisu'}</p>
                                <span class="badge">${item.status || 'info'}</span>
                            </li>
                        `).join('')}
                   </ul>`
                : '<p class="profile-muted">Po prvních akcích se zde zobrazí poslední změny.</p>'}
        `;
    }
}

export default class UsersModule {
    constructor(state, deps = {}) {
        this.state = state;
        this.apiUrl = deps.apiUrl;
        this.refreshApp = deps.refreshApp;
        this.profileMeta = () => this.state.profileMeta || { roles: [], cities: [], positions: [] };
        this.view = document.querySelector('[data-view="people"]');
        this.employeeRoleAliases = [
            'MANAGER',
            'MANAZER',
            'ANALYTIK',
            'ANALYST',
            'SUPERVISER',
            'SUPERVIZOR'
        ];
        this.customerRoles = new Set(['ZAKAZNIK']);
        this.supplierRoles = new Set(['DODAVATEL']);
        this.roleChangeHandler = null;
        this.previousFocus = null;
        this.searchTerm = '';
        this.isLoading = false;
        this.lastError = '';
    }

    init() {
        this.panel = document.getElementById('admin-users-panel');
        if (!this.view || !this.panel) {
            return;
        }
        if (!this.hasPermission('MANAGE_USERS')) {
            this.renderLockedState();
            return;
        }
        this.tableEl = document.getElementById('admin-users-table');
        this.filterEl = document.getElementById('admin-users-role-filter');
        this.searchEl = document.getElementById('admin-users-search');
        this.modal = document.getElementById('user-edit-modal');
        this.modalForm = document.getElementById('user-edit-form');
        this.modalClose = document.getElementById('user-edit-close');
        this.modalCancel = document.getElementById('user-edit-cancel');
        if (this.modal && !this.modal.hasAttribute('aria-hidden')) {
            this.modal.setAttribute('aria-hidden', 'true');
            this.modal.setAttribute('inert', '');
        }
        if (!this.panel) {
            return;
        }
        this.bindEvents();
        this.populateFilter();
        this.renderTable(); // inicializační placeholder
        this.fetchUsers();
    }

    bindEvents() {
        this.filterEl?.addEventListener('change', () => {
            if (this.searchEl) {
                this.searchEl.value = '';
            }
            this.searchTerm = '';
            this.fetchUsers(this.filterEl.value);
        });
        this.searchEl?.addEventListener('input', () => {
            this.searchTerm = this.searchEl.value.trim().toLowerCase();
            this.renderTable();
        });
        this.modalClose?.addEventListener('click', () => this.closeModal());
        this.modalCancel?.addEventListener('click', () => this.closeModal());
        this.modal?.addEventListener('click', event => {
            if (event.target === this.modal) {
                this.closeModal();
            }
        });
        this.modalForm?.addEventListener('submit', event => this.handleSubmit(event));
    }

    hasPermission(code) {
        const permissions = this.state.data?.profile?.permissions;
        return Array.isArray(permissions) && permissions.some(item => item === code);
    }

    renderLockedState() {
        if (this.panel) {
            this.panel.innerHTML = '<p class="profile-muted">Nemáte oprávnění MANAGE_USERS.</p>';
        }
    }

    populateFilter() {
        const roles = this.profileMeta().roles || [];
        if (!this.filterEl || !roles.length) {
            return;
        }
        this.filterEl.innerHTML = ['<option value="">Všechny role</option>']
            .concat(roles.map(role => `<option value="${role.name}">${role.name}</option>`))
            .join('');
    }

    setLoading(flag) {
        this.isLoading = !!flag;
        if (flag) {
            this.lastError = '';
        }
    }

    renderStatus(message) {
        if (!this.tableEl) {
            return;
        }
        this.tableEl.innerHTML = `<p class="profile-muted">${message}</p>`;
    }

    async fetchUsers(role = '') {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'landing.html';
            return;
        }
        const params = role ? `?role=${encodeURIComponent(role)}` : '';
        this.setLoading(true);
        this.renderStatus('Načítám uživatele…');
        try {
            const response = await fetch(this.apiUrl(`/api/admin/users${params}`), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(await response.text());
            }
            const users = await response.json();
            this.state.adminUsers = Array.isArray(users) ? users : [];
            this.lastError = '';
        } catch (error) {
            console.error('Failed to load users', error);
            this.lastError = error.message || 'Nepodařilo se načíst uživatele.';
        } finally {
            this.setLoading(false);
            this.renderTable();
        }
    }

    renderTable() {
        if (!this.tableEl) {
            return;
        }
        if (this.isLoading) {
            this.renderStatus('Načítám uživatele…');
            return;
        }
        if (this.lastError) {
            this.renderStatus(this.lastError);
            return;
        }
        const users = this.state.adminUsers || [];
        const filtered = this.applySearch(users).sort((a, b) => {
            const left = `${(a.lastName || '').toLowerCase()} ${(a.firstName || '').toLowerCase()}`;
            const right = `${(b.lastName || '').toLowerCase()} ${(b.firstName || '').toLowerCase()}`;
            return left.localeCompare(right, 'cs');
        });
        if (!filtered.length) {
            this.tableEl.innerHTML = '<p class="profile-muted">Žádní uživatelé k zobrazení.</p>';
            return;
        }
        this.tableEl.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Jméno</th>
                            <th>Role</th>
                            <th>Email</th>
                            <th>Telefon</th>
                            <th>Akce</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(user => `
                            <tr>
                                <td>${this.escapeHtml(user.firstName)} ${this.escapeHtml(user.lastName)}</td>
                                <td>${this.escapeHtml(user.role)}</td>
                                <td>${this.escapeHtml(user.email)}</td>
                                <td>${this.escapeHtml(user.phone)}</td>
                                <td style="display:flex;gap:8px;flex-wrap:wrap;">
                                    <button type="button" class="ghost-btn" data-edit="${user.id}">Upravit</button>
                                    <button type="button" class="ghost-btn ghost-muted" data-impersonate="${user.id}">Simulovat</button>
                                    <button type="button" class="ghost-btn ghost-danger" data-delete="${user.id}">Smazat</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        this.tableEl.querySelectorAll('[data-edit]').forEach(btn => {
            const id = Number(btn.dataset.edit);
            const user = filtered.find(item => item.id === id);
            btn.addEventListener('click', () => this.openModal(user));
        });
        this.tableEl.querySelectorAll('[data-impersonate]').forEach(btn => {
            const id = Number(btn.dataset.impersonate);
            btn.addEventListener('click', () => this.impersonateUser(id));
        });
        this.tableEl.querySelectorAll('[data-delete]').forEach(btn => {
            const id = Number(btn.dataset.delete);
            btn.addEventListener('click', () => this.deleteUser(id));
        });
    }

    escapeHtml(text) {
        if (!text) {
            return '';
        }
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    openModal(user) {
        if (!this.modal || !this.modalForm || !user) {
            return;
        }
        const meta = this.profileMeta();
        this.previousFocus = document.activeElement;
        this.populateRoleSelect(meta.roles, user.role);
        this.populatePositionSelect(meta.positions, user.position);
        this.populateCityOptions(meta.cities, user.address?.psc);
        this.modalForm.elements.firstName.value = user.firstName || '';
        this.modalForm.elements.lastName.value = user.lastName || '';
        this.modalForm.elements.email.value = user.email || '';
        this.modalForm.elements.phone.value = user.phone || '';
        this.modalForm.elements.salary.value = user.salary || 0;
        this.modalForm.elements.hireDate.value = user.hireDate || '';
        this.modalForm.elements.street.value = user.address?.street || '';
        this.modalForm.elements.houseNumber.value = user.address?.houseNumber || '';
        this.modalForm.elements.orientationNumber.value = user.address?.orientationNumber || '';
        this.modalForm.elements.cityPsc.value = this.formatCityValue(meta.cities, user.address?.psc);
        if (this.modalForm.elements.loyaltyCard) {
            this.modalForm.elements.loyaltyCard.value = user.loyaltyCard || '';
        }
        if (this.modalForm.elements.supplierCompany) {
            this.modalForm.elements.supplierCompany.value = user.supplierCompany || '';
        }
        this.modalForm.elements.newPassword.value = '';
        this.modalForm.dataset.userId = user.id;
        this.modalForm.dataset.currentRole = user.role || '';
        this.roleSelect = this.modalForm.elements.roleCode;
        this.applyRoleSections(this.roleSelect?.value || user.role || '');
        if (this.roleSelect) {
            if (this.roleChangeHandler) {
                this.roleSelect.removeEventListener('change', this.roleChangeHandler);
            }
            this.roleChangeHandler = () => this.applyRoleSections(this.roleSelect.value);
            this.roleSelect.addEventListener('change', this.roleChangeHandler);
        }
        this.modal.removeAttribute('inert');
        this.modal.setAttribute('aria-hidden', 'false');
        this.modal.classList.add('active');
        const firstInput = this.modalForm.querySelector('input, select, button');
        firstInput?.focus();

        this.attachLoyaltyGenerator();
    }

    isEmployeeRole(role) {
        if (!role) {
            return false;
        }
        const upper = role.trim().toUpperCase();
        return this.employeeRoleAliases.some(alias => upper === alias);
    }

    isCustomerRole(role) {
        if (!role) {
            return false;
        }
        return this.customerRoles.has(role.trim().toUpperCase());
    }

    isSupplierRole(role) {
        if (!role) {
            return false;
        }
        return this.supplierRoles.has(role.trim().toUpperCase());
    }

    applyRoleSections(role) {
        const showEmployment = this.isEmployeeRole(role);
        const showCustomer = this.isCustomerRole(role);
        const showSupplier = this.isSupplierRole(role);
        this.toggleEmploymentFields(showEmployment);
        this.toggleCustomerFields(showCustomer);
        this.toggleSupplierFields(showSupplier);
    }

    toggleEmploymentFields(visible) {
        this.toggleFields(['position', 'salary', 'hireDate'], visible);
    }

    toggleCustomerFields(visible) {
        this.toggleFields(['loyaltyCard'], visible);
    }

    toggleSupplierFields(visible) {
        this.toggleFields(['supplierCompany'], visible);
    }

    toggleFields(fieldNames, visible) {
        fieldNames.forEach(name => {
            const control = this.modalForm?.elements[name];
            if (!control) {
                return;
            }
            const wrapper = control.closest('label');
            if (wrapper) {
                wrapper.style.display = visible ? 'block' : 'none';
            }
            control.required = visible;
            control.disabled = !visible;
            if (!visible) {
                if (control.tagName === 'SELECT') {
                    control.selectedIndex = 0;
                } else {
                    control.value = '';
                }
            }
        });
    }

    applySearch(list) {
        if (!this.searchTerm) {
            return list;
        }
        return list.filter(user => {
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
            const email = (user.email || '').toLowerCase();
            const phone = (user.phone || '').toLowerCase();
            return fullName.includes(this.searchTerm) || email.includes(this.searchTerm) || phone.includes(this.searchTerm);
        });
    }

    async deleteUser(id) {
        if (!id) return;
        const user = (this.state.adminUsers || []).find(u => u.id === id);
        const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
        if (!confirm(`Opravdu smazat uživatele ${name || id}?`)) {
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'landing.html';
            return;
        }
        try {
            const response = await fetch(this.apiUrl(`/api/admin/users/${id}`), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Smazání se nepodařilo.');
            }
            this.state.adminUsers = (this.state.adminUsers || []).filter(u => u.id !== id);
            this.renderTable();
        } catch (error) {
            alert(error.message || 'Smazání se nepodařilo.');
        }
    }

    populateRoleSelect(roles, current) {
        const selectEl = this.modalForm?.elements.roleCode;
        if (!selectEl) return;
        if (!roles.length) {
            selectEl.innerHTML = '<option value="">—</option>';
            return;
        }
        selectEl.innerHTML = roles.map(role => `<option value="${role.name}" ${role.name === current ? 'selected' : ''}>${role.name}</option>`).join('');
    }

    populatePositionSelect(positions, current) {
        const selectEl = this.modalForm?.elements.position;
        if (!selectEl) return;
        if (!positions.length) {
            selectEl.innerHTML = '<option value="">—</option>';
            return;
        }
        selectEl.innerHTML = positions.map(pos => `<option value="${pos}" ${pos === current ? 'selected' : ''}>${pos}</option>`).join('');
    }

    populateCityOptions(cities, current) {
        const inputEl = this.modalForm?.elements.cityPsc;
        const dataList = document.getElementById('admin-city-options');
        if (!inputEl || !dataList) return;
        if (!cities.length) {
            dataList.innerHTML = '';
            return;
        }
        dataList.innerHTML = cities.map(city =>
            `<option value="${city.name}" label="${city.name}${city.region ? ' · ' + city.region : ''} (${city.psc})"></option>`
        ).join('');
        inputEl.value = this.formatCityValue(cities, current);
    }

    closeModal() {
        if (this.modal?.contains(document.activeElement)) {
            document.activeElement.blur();
        }
        this.modal?.classList.remove('active');
        this.modal?.setAttribute('aria-hidden', 'true');
        this.modal?.setAttribute('inert', '');
        this.modalForm?.reset();
        if (this.modalForm) {
            delete this.modalForm.dataset.userId;
        }
        if (this.roleSelect && this.roleChangeHandler) {
            this.roleSelect.removeEventListener('change', this.roleChangeHandler);
            this.roleChangeHandler = null;
        }
        if (this.previousFocus) {
            this.previousFocus.focus();
            this.previousFocus = null;
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        if (!this.modalForm?.dataset.userId) {
            return;
        }
        const formData = new FormData(this.modalForm);
        const payload = {};
        formData.forEach((value, key) => {
            payload[key] = typeof value === 'string' ? value.trim() : value;
        });
        const role = (payload.roleCode || '').trim();
        if (this.isEmployeeRole(role)) {
            payload.salary = Number(payload.salary) || 0;
            payload.position = (payload.position || '').trim();
        } else {
            delete payload.position;
            delete payload.salary;
            delete payload.hireDate;
        }
        if (this.isCustomerRole(role)) {
            payload.loyaltyCard = (payload.loyaltyCard || '').trim();
        } else {
            delete payload.loyaltyCard;
        }
        if (this.isSupplierRole(role)) {
            payload.supplierCompany = (payload.supplierCompany || '').trim();
        } else {
            delete payload.supplierCompany;
        }
        payload.firstName = (payload.firstName || '').trim();
        payload.lastName = (payload.lastName || '').trim();
        payload.email = (payload.email || '').trim();
        payload.phone = (payload.phone || '').trim();
        payload.street = (payload.street || '').trim();
        payload.houseNumber = (payload.houseNumber || '').trim();
        payload.orientationNumber = (payload.orientationNumber || '').trim();
        payload.cityPsc = this.normalizeCityValue(payload.cityPsc || '', this.profileMeta().cities);
        payload.newPassword = (payload.newPassword || '').trim();
        const previousRole = (this.modalForm.dataset.currentRole || '').trim();
        const newRole = (payload.roleCode || '').trim();
        const roleChanged = previousRole && newRole && previousRole.toUpperCase() !== newRole.toUpperCase();

        if (roleChanged) {
            const deps = await this.fetchRoleDependencies(this.modalForm.dataset.userId);
            const userName = `${payload.firstName || ''} ${payload.lastName || ''}`.trim();
            this.showRoleWarningModal(userName, deps, () => this.updateUser(this.modalForm.dataset.userId, payload, { withForce: true }));
            return;
        }

        await this.updateUser(this.modalForm.dataset.userId, payload, { withForce: true });
    }

    formatCityValue(cities, psc) {
        if (!psc) return '';
        const match = cities.find(c => c.psc === psc);
        return match ? match.name : psc;
    }

    normalizeCityValue(value, cities) {
        if (!value) return '';
        const trimmed = value.trim();
        const byName = cities.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
        if (byName) return byName.psc;
        const direct = cities.find(c => c.psc === trimmed);
        if (direct) return direct.psc;
        if (trimmed.length >= 5) {
            const prefix = trimmed.slice(0, 5);
            const prefixMatch = cities.find(c => c.psc === prefix);
            if (prefixMatch) return prefixMatch.psc;
        }
        return trimmed;
    }

    async updateUser(userId, payload, options = {}) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'landing.html';
            return;
        }
        try {
            const logPayload = { ...payload };
            delete logPayload.newPassword;
            console.log('[users] update payload', logPayload);
            const requestPayload = { ...payload };
            if (options.withForce) {
                requestPayload.force = 1;
            } else {
                delete requestPayload.force;
            }
            const response = await fetch(this.apiUrl(`/api/admin/users/${userId}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestPayload)
            });
            console.log('[users] response status', response.status);
            if (!response.ok) {
                const message = await response.text();
                console.warn('[users] role change failed', { status: response.status, message });
                const shouldPrompt = options.allowForcePrompt && !options.withForce && (this.isRoleDependencyError(message) || response.status === 500);
                if (shouldPrompt) {
                    this.showRoleWarningModal(message || 'Změna role odstraní vazby na starou roli.', () =>
                        this.updateUser(userId, payload, { withForce: true })
                    );
                    return;
                }
                throw new Error(message || 'Uložení se nezdařilo.');
            }
            this.closeModal();
            await this.fetchUsers(this.filterEl?.value || '');
            if (typeof this.refreshApp === 'function') {
                await this.refreshApp();
            }
        } catch (error) {
            console.error('Failed to update user', error);
            alert(error.message || 'Uložení se nezdařilo.');
        }
    }

    isRoleDependencyError(message) {
        if (!message) return false;
        const lower = message.toLowerCase();
        return /-2000(1|16|17|99)/.test(message) || lower.includes('ora-20001') || lower.includes('zbozi_dodavatel') || lower.includes('dodavatel');
    }

    async fetchRoleDependencies(userId) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'landing.html';
            return null;
        }
        try {
            const response = await fetch(this.apiUrl(`/api/admin/users/${userId}/role-deps`), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(await response.text());
            }
            return await response.json();
        } catch (error) {
            console.warn('Failed to load role deps', error);
            return null;
        }
    }

    async fetchNextLoyaltyCard() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'landing.html';
            return null;
        }
        try {
            const response = await fetch(this.apiUrl('/api/admin/users/loyalty-next'), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'text/plain'
                }
            });
            if (!response.ok) {
                throw new Error(await response.text());
            }
            return await response.text();
        } catch (error) {
            console.warn('Failed to generate loyalty card', error);
            alert('Nepodařilo se vygenerovat kartu.');
            return null;
        }
    }

    showRoleWarningModal(userName, deps, onConfirm) {
        const tables = [];
        if (deps?.hasSupplier) {
            tables.push(`DODAVATEL${deps.supplierCompany ? ` (firma: ${deps.supplierCompany})` : ''}`);
        }
        if (deps?.supplierItems > 0) {
            tables.push(`ZBOZI_DODAVATEL (vazby: ${deps.supplierItems})`);
        }
        if (deps?.hasCustomer) {
            tables.push(`ZAKAZNIK${deps.loyaltyCard ? ` (karta: ${deps.loyaltyCard})` : ''}`);
        }
        if (deps?.hasEmployee) {
            const parts = [];
            if (deps.position) parts.push(deps.position);
            if (deps.salary) parts.push(`mzda: ${deps.salary}`);
            if (deps.hireDate) parts.push(`nástup: ${deps.hireDate}`);
            tables.push(`ZAMESTNANEC${parts.length ? ` (${parts.join(', ')})` : ''}`);
        }

        const listHtml = tables.length
            ? `<ul style="margin:12px 0 0 18px; padding-left:0; list-style: disc;">${tables.map(t => `<li>${t}</li>`).join('')}</ul>`
            : '<p class="profile-muted">Žádné vazby k odstranění.</p>';

        console.info('[users] showing role warning modal', tables);
        const overlay = document.createElement('div');
        overlay.className = 'modal active';
        overlay.style.zIndex = '9999';
        overlay.innerHTML = `
            <div class="modal-content" role="dialog" aria-modal="true" style="max-width:520px;">
                <div class="modal-header">
                    <h3 style="margin:0;">Opravdu změnit roli?</h3>
                    <button type="button" class="ghost-btn ghost-muted" id="role-force-cancel" aria-label="Zavřít">×</button>
                </div>
                <p>${userName ? `Uživatel: <strong>${userName}</strong><br>` : ''}Tato akce odstraní následující záznamy:</p>
                ${listHtml}
                <div class="modal-actions" style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
                    <button type="button" class="ghost-btn ghost-muted" id="role-force-cancel-2">Zavřít</button>
                    <button type="button" class="ghost-btn ghost-strong" id="role-force-confirm">Pokračovat a odstranit vazby</button>
                </div>
            </div>
        `;
        const cleanup = () => overlay.remove();
        overlay.querySelector('#role-force-cancel')?.addEventListener('click', cleanup);
        overlay.querySelector('#role-force-cancel-2')?.addEventListener('click', cleanup);
        overlay.querySelector('#role-force-confirm')?.addEventListener('click', async () => {
            cleanup();
            if (typeof onConfirm === 'function') {
                await onConfirm();
            }
        });
        document.body.appendChild(overlay);
    }

    attachLoyaltyGenerator() {
        const loyaltyInput = this.modalForm?.elements.loyaltyCard;
        if (!loyaltyInput) return;
        const parent = loyaltyInput.parentElement;
        if (!parent || parent.querySelector('.loyalty-generate-btn')) {
            return;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Generovat';
        btn.className = 'ghost-btn ghost-strong loyalty-generate-btn';
        btn.style.marginTop = '6px';
        btn.addEventListener('click', async () => {
            const value = await this.fetchNextLoyaltyCard();
            if (value) {
                loyaltyInput.value = value;
            }
        });
        parent.appendChild(btn);
    }

    async impersonateUser(userId) {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }
        try {
            const response = await fetch(this.apiUrl(`/api/admin/users/${userId}/impersonate`), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error(await response.text());
            }
            const data = await response.json();
            this.storeOriginalSession();
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role || 'USER');
            localStorage.setItem('fullName', data.fullName || '');
            localStorage.setItem('email', data.email || '');
            window.location.reload();
        } catch (error) {
            console.error('Impersonation failed', error);
            alert(error.message || 'Simulace se nezdařila.');
        }
    }

    storeOriginalSession() {
        if (localStorage.getItem('admin_original_token')) {
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }
        localStorage.setItem('admin_original_token', token);
        localStorage.setItem('admin_original_role', localStorage.getItem('role') || '');
        localStorage.setItem('admin_original_name', localStorage.getItem('fullName') || '');
        localStorage.setItem('admin_original_email', localStorage.getItem('email') || '');
    }
}

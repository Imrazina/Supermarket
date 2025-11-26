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
        this.fetchUsers();
    }

    bindEvents() {
        this.filterEl?.addEventListener('change', () => this.fetchUsers(this.filterEl.value));
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

    async fetchUsers(role = '') {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }
        const params = role ? `?role=${encodeURIComponent(role)}` : '';
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
            this.renderTable();
        } catch (error) {
            console.error('Failed to load users', error);
            this.tableEl.innerHTML = `<p class="profile-muted">${error.message || 'Nepodařilo se načíst uživatele.'}</p>`;
        }
    }

    renderTable() {
        if (!this.tableEl) {
            return;
        }
        const users = this.state.adminUsers || [];
        const filtered = this.applySearch(users);
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
                                <td>${user.firstName} ${user.lastName}</td>
                                <td>${user.role}</td>
                                <td>${user.email}</td>
                                <td>${user.phone}</td>
                                <td style="display:flex;gap:8px;flex-wrap:wrap;">
                                    <button type="button" class="ghost-btn" data-edit="${user.id}">Upravit</button>
                                    <button type="button" class="ghost-btn ghost-muted" data-impersonate="${user.id}">Simulovat</button>
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
    }

    openModal(user) {
        if (!this.modal || !this.modalForm || !user) {
            return;
        }
        const meta = this.profileMeta();
        this.previousFocus = document.activeElement;
        this.populateRoleSelect(meta.roles, user.role);
        this.populatePositionSelect(meta.positions, user.position);
        this.populateCitySelect(meta.cities, user.address?.psc);
        this.modalForm.elements.firstName.value = user.firstName || '';
        this.modalForm.elements.lastName.value = user.lastName || '';
        this.modalForm.elements.email.value = user.email || '';
        this.modalForm.elements.phone.value = user.phone || '';
        this.modalForm.elements.salary.value = user.salary || 0;
        this.modalForm.elements.hireDate.value = user.hireDate || '';
        this.modalForm.elements.street.value = user.address?.street || '';
        this.modalForm.elements.houseNumber.value = user.address?.houseNumber || '';
        this.modalForm.elements.orientationNumber.value = user.address?.orientationNumber || '';
        this.modalForm.elements.cityPsc.value = user.address?.psc || '';
        if (this.modalForm.elements.loyaltyCard) {
            this.modalForm.elements.loyaltyCard.value = user.loyaltyCard || '';
        }
        if (this.modalForm.elements.supplierCompany) {
            this.modalForm.elements.supplierCompany.value = user.supplierCompany || '';
        }
        this.modalForm.elements.newPassword.value = '';
        this.modalForm.dataset.userId = user.id;
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
            return fullName.includes(this.searchTerm) || email.includes(this.searchTerm);
        });
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

    populateCitySelect(cities, current) {
        const selectEl = this.modalForm?.elements.cityPsc;
        if (!selectEl) return;
        if (!cities.length) {
            selectEl.innerHTML = '<option value="">—</option>';
            return;
        }
        selectEl.innerHTML = cities.map(city => `<option value="${city.psc}" ${city.psc === current ? 'selected' : ''}>${city.psc} – ${city.name}</option>`).join('');
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
        const payload = Object.fromEntries(formData.entries());
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
        await this.updateUser(this.modalForm.dataset.userId, payload);
    }

    async updateUser(userId, payload) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        try {
            const response = await fetch(this.apiUrl(`/api/admin/users/${userId}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error(await response.text());
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

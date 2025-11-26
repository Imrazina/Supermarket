export default class PermissionsModule {
    constructor(state, deps = {}) {
        this.state = state;
        this.apiUrl = deps.apiUrl;
        this.fetchAdminPermissions = deps.fetchAdminPermissions;
        this.fetchRolePermissions = deps.fetchRolePermissions;
        this.container = document.querySelector('[data-view="permissions"]');
        this.editingId = null;
    }

    init() {
        if (!this.container) {
            return;
        }
        this.tableEl = document.getElementById('permissions-table');
        this.formEl = document.getElementById('permission-form');
        this.formTitle = document.getElementById('permission-form-title');
        this.resetBtn = document.getElementById('permission-reset-btn');
        this.cancelBtn = document.getElementById('permission-cancel-btn');

        this.formEl?.addEventListener('submit', event => this.handlePermissionSubmit(event));
        this.resetBtn?.addEventListener('click', () => this.resetForm());
        this.cancelBtn?.addEventListener('click', () => this.resetForm());
        const isAdmin = ((localStorage.getItem('role') || '').trim().toUpperCase() === 'ADMIN');
        if (isAdmin && (!this.state.adminPermissions?.length || !this.state.rolePermissions?.length)) {
            this.reloadAdminData();
        } else {
            this.render();
        }
    }

    async reloadAdminData() {
        if (this.fetchAdminPermissions && this.fetchRolePermissions) {
            const [permissions, rolePermissions] = await Promise.all([
                this.fetchAdminPermissions(),
                this.fetchRolePermissions()
            ]);
            this.state.adminPermissions = Array.isArray(permissions) ? permissions : [];
            this.state.rolePermissions = Array.isArray(rolePermissions) ? rolePermissions : [];
            this.render();
        }
    }

    handlePermissionSubmit(event) {
        event.preventDefault();
        const formData = new FormData(this.formEl);
        const payload = {
            name: formData.get('name')?.trim(),
            code: formData.get('code')?.trim(),
            description: formData.get('description')?.trim() || ''
        };
        this.savePermission(this.editingId, payload);
    }

    async savePermission(id, payload) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        try {
            const path = id ? `/api/admin/prava/${id}` : '/api/admin/prava';
            const response = await fetch(this.apiUrl(path), {
                method: id ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error(await response.text());
            }
            await this.reloadAdminData();
            this.resetForm();
        } catch (error) {
            console.error('Permission save failed', error);
            alert(error.message || 'Nepodařilo se uložit právo.');
        }
    }

    resetForm() {
        if (!this.formEl) {
            return;
        }
        this.formEl.reset();
        this.formEl.querySelector('[name="permissionId"]').value = '';
        this.editingId = null;
        if (this.formTitle) {
            this.formTitle.textContent = 'Nové právo';
        }
    }

    editPermission(permission) {
        if (!this.formEl || !permission) {
            return;
        }
        this.editingId = permission.id;
        this.formEl.querySelector('[name="permissionId"]').value = permission.id;
        this.formEl.querySelector('[name="name"]').value = permission.name;
        this.formEl.querySelector('[name="code"]').value = permission.code;
        this.formEl.querySelector('[name="description"]').value = permission.description || '';
        if (this.formTitle) {
            this.formTitle.textContent = 'Upravit právo';
        }
    }

    async deletePermission(id) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        if (!confirm('Opravdu chcete smazat toto právo?')) {
            return;
        }
        try {
            const response = await fetch(this.apiUrl(`/api/admin/prava/${id}`), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok && response.status !== 204) {
                throw new Error(await response.text());
            }
            await this.reloadAdminData();
        } catch (error) {
            console.error('Permission delete failed', error);
            alert(error.message || 'Právo se nepodařilo smazat.');
        }
    }

    render() {
        if (!this.container) {
            return;
        }
        const isAdmin = ((localStorage.getItem('role') || '').trim().toUpperCase() === 'ADMIN');
        if (!isAdmin) {
            this.container.innerHTML = '<div class="panel"><p class="profile-muted">Správu práv může provádět pouze administrátor.</p></div>';
            return;
        }
        this.renderPermissionsTable();
    }

    renderPermissionsTable() {
        if (!this.tableEl) {
            return;
        }
        const permissions = this.state.adminPermissions || [];
        if (!permissions.length) {
            this.tableEl.innerHTML = '<p class="profile-muted">Žádná práva nejsou definována.</p>';
            return;
        }
        const roles = this.state.rolePermissions || [];
        this.tableEl.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Název</th>
                            <th>Kód</th>
                            <th>Popis</th>
                            <th>Role</th>
                            <th>Akce</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${permissions.map(pravo => this.renderPermissionRow(pravo, roles)).join('')}
                    </tbody>
                </table>
            </div>
        `;
        this.tableEl.querySelectorAll('[data-edit]').forEach(btn => {
            const id = Number(btn.dataset.edit);
            const permission = permissions.find(item => item.id === id);
            btn.addEventListener('click', () => this.editPermission(permission));
        });
        this.tableEl.querySelectorAll('[data-delete]').forEach(btn => {
            const id = Number(btn.dataset.delete);
            btn.addEventListener('click', () => this.deletePermission(id));
        });
        this.tableEl.querySelectorAll('.permission-role-checkbox').forEach(box => {
            box.addEventListener('change', () => {
                this.handlePermissionRoleToggle(box.dataset.code, Number(box.dataset.roleId), box.checked);
            });
        });
    }

    renderPermissionRow(permission, roles) {
        const assignedRoleIds = new Set(
            (this.state.rolePermissions || [])
                .filter(role => (role.permissionCodes || []).includes(permission.code))
                .map(role => role.roleId)
        );
        const hasRoles = roles.length > 0;
        const roleBadges = hasRoles
            ? roles.map(role => `
                <label class="permission-role-item">
                    <input type="checkbox"
                           class="permission-role-checkbox"
                           data-code="${permission.code}"
                           data-role-id="${role.roleId}"
                           ${assignedRoleIds.has(role.roleId) ? 'checked' : ''}>
                    <span>${role.roleName}</span>
                </label>
            `).join('')
            : '<p class="profile-muted">Žádné role</p>';
        return `
            <tr>
                <td>${permission.name}</td>
                <td>${permission.code}</td>
                <td>${permission.description || '—'}</td>
                <td>
                    <div class="permission-role-grid">
                        ${roleBadges}
                    </div>
                </td>
                <td style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button type="button" class="ghost-btn" data-edit="${permission.id}">Upravit</button>
                    <button type="button" class="ghost-btn ghost-muted" data-delete="${permission.id}">Smazat</button>
                </td>
            </tr>
        `;
    }

    async handlePermissionRoleToggle(permissionCode, roleId, enabled) {
        const roles = this.state.rolePermissions || [];
        const role = roles.find(r => r.roleId === roleId);
        if (!role) {
            return;
        }
        const codes = new Set(role.permissionCodes || []);
        if (enabled) {
            codes.add(permissionCode);
        } else {
            codes.delete(permissionCode);
        }
        try {
            await this.saveRolePermissions(roleId, Array.from(codes));
            await this.reloadAdminData();
        } catch (error) {
            console.error('Role permission update failed', error);
            alert(error.message || 'Nepodařilo se upravit přiřazení rolí.');
        }
    }

    async saveRolePermissions(roleId, codes) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        const response = await fetch(this.apiUrl(`/api/admin/roles/${roleId}/permissions`), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ permissionCodes: codes })
        });
        if (!response.ok) {
            throw new Error(await response.text());
        }
    }
}

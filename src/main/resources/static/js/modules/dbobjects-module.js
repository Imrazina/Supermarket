export default class DbObjectsModule {
    constructor(state, deps = {}) {
        this.state = state;
        this.apiUrl = deps.apiUrl;
        this.view = document.querySelector('[data-view="dbobjects"]');
        this.navLink = document.querySelector('.nav-link[data-view="dbobjects"]');
        this.tableBody = document.getElementById('dbobj-table-body');
        this.ddlStatus = document.getElementById('dbobj-ddl-status');
        this.modal = document.getElementById('dbobj-modal');
        this.modalContent = document.getElementById('dbobj-modal-content');
        this.modalTitle = document.getElementById('dbobj-modal-title');
        this.modalClose = document.getElementById('dbobj-modal-close');
        this.searchInput = document.getElementById('dbobj-search');
        this.typeFilter = document.getElementById('dbobj-type-filter');
        this.items = [];
        this.filtered = [];
        this.selected = null;
    }

    init() {
        if (!this.hasAccess()) {
            this.hideView();
            return;
        }
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.applyFilters());
        }
        if (this.typeFilter) {
            this.typeFilter.addEventListener('change', () => this.applyFilters());
        }
        if (this.modal && this.modalClose) {
            this.modalClose.addEventListener('click', () => this.hideModal());
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hideModal();
                }
            });
        }
        if (this.tableBody) {
            this.tableBody.addEventListener('click', (e) => {
                const btn = e.target.closest('.dbobj-preview');
                const row = e.target.closest('tr[data-name]');
                if (btn && row) {
                    const name = row.dataset.name;
                    const type = row.dataset.type;
                    this.selected = { name, type };
                    this.highlightRow(row);
                    this.loadDdl(type, name);
                }
            });
        }
        this.load();
    }

    hasAccess() {
        const role = (this.state.data?.profile?.role || '').toUpperCase();
        const permissions = this.state.data?.profile?.permissions || [];
        return role === 'ADMIN' || permissions.includes('VIEW_DB_OBJECTS');
    }

    hideView() {
        this.view?.remove();
        this.navLink?.remove();
    }

    async load() {
        if (!this.tableBody) return;
        this.tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Načítám…</td></tr>`;
        const token = localStorage.getItem('token');
        if (!token) {
            this.tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Přihlaste se znovu.</td></tr>`;
            return;
        }
        try {
            const response = await fetch(this.apiUrl('/api/admin/db-objects'), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error(await response.text());
            }
            this.items = await response.json();
            this.populateTypeFilter();
            this.applyFilters();
        } catch (err) {
            console.error('DB objects load failed', err);
            this.tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#c00;">${err.message || 'Načtení selhalo.'}</td></tr>`;
        }
    }

    populateTypeFilter() {
        if (!this.typeFilter) return;
        const types = Array.from(new Set(this.items.map(i => i.type))).sort();
        this.typeFilter.innerHTML = `<option value="">Všechny typy</option>` +
            types.map(t => `<option value="${t}">${t}</option>`).join('');
    }

    applyFilters() {
        const term = (this.searchInput?.value || '').trim().toLowerCase();
        const type = (this.typeFilter?.value || '').trim();
        this.filtered = this.items.filter(item => {
            const matchesType = !type || item.type === type;
            const matchesTerm = !term || item.name.toLowerCase().includes(term) || item.type.toLowerCase().includes(term);
            return matchesType && matchesTerm;
        });
        this.render();
    }

    render() {
        if (!this.tableBody) return;
        if (!this.filtered.length) {
            this.tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nic k zobrazení.</td></tr>`;
            return;
        }
        this.tableBody.innerHTML = this.filtered.map(item => `
            <tr data-name="${item.name}" data-type="${item.type}">
                <td><span class="badge">${item.type}</span></td>
                <td>${item.name}</td>
                <td>${this.fmt(item.created)}</td>
                <td>${this.fmt(item.lastDdl)}</td>
                <td><button type="button" class="ghost-btn ghost-strong dbobj-preview">Zobrazit</button></td>
            </tr>
        `).join('');
    }

    async loadDdl(type, name) {
        if (!this.modalContent) return;
        const token = localStorage.getItem('token');
        if (!token) {
            this.modalContent.textContent = '-- Přihlaste se znovu.';
            this.showModal();
            return;
        }
        this.modalContent.textContent = '-- Načítám DDL…';
        this.ddlStatus.textContent = '';
        this.modalTitle.textContent = `${type} ${name}`;
        this.showModal();
        try {
            const response = await fetch(this.apiUrl(`/api/admin/db-objects/ddl?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error(await response.text());
            }
            const ddl = await response.text();
            this.modalContent.textContent = ddl || '-- Bez DDL.';
        } catch (err) {
            console.error('DDL load failed', err);
            this.modalContent.textContent = '-- Nepodařilo se načíst DDL.';
            this.ddlStatus.textContent = err.message || '';
        }
    }

    highlightRow(row) {
        this.tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('active'));
        row.classList.add('active');
    }

    fmt(value) {
        if (!value) return '—';
        return value.replace('T', ' ').slice(0, 19);
    }

    showModal() {
        if (!this.modal) return;
        document.body.classList.add('modal-open');
        this.modal.classList.add('active');
        this.modal.removeAttribute('aria-hidden');
    }

    hideModal() {
        if (!this.modal) return;
        document.body.classList.remove('modal-open');
        this.modal.classList.remove('active');
        this.modal.setAttribute('aria-hidden', 'true');
    }
}

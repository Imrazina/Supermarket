import ProfileModule from './modules/profile-module.js';
import PermissionsModule from './modules/permissions-module.js';
import UsersModule from './modules/users-module.js';

const currencyFormatter = new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0
});

function createEmptyData() {
    return {
        syncUpdatedAt: "",
        weeklyDemand: [],
        inventory: [],
        categories: [],
        warehouses: [],
        orders: [],
        orderItems: [],
        statuses: [],
        employees: [],
        customers: [],
        suppliers: [],
        roles: [],
        addresses: [],
        payments: [],
        logs: [],
        messages: [],
        subscribers: [],
        stores: [],
        folders: [],
        customerProducts: [],
        customerSuggestions: [],

        profile: {
            firstName: "",
            lastName: "",
            fullName: "",
            position: "",
            role: "",
            group: "UZIVATEL",
            email: "",
            phone: "",
            location: "",
            timezone: "",
            lastLogin: "",
            storesOwned: 0,
            approvals: 0,
            escalations: 0,
            automations: 0,
            permissions: [],

            preferences: {
                language: "",
                theme: "",
                notifications: "",
                weeklyDigest: false
            },

            security: {
                mfa: "",
                devices: "",
                lastIp: ""
            },

            activity: [],
            address: null,
            employment: null,
            customer: null,
            supplier: null
        }
    };
}


const state = {
    activeView: 'dashboard',
    inventoryFilter: 'all',
    paymentFilter: 'all',
    selectedOrderId: null,
    selectedFolder: null,
    customerCategoryFilter: 'all',
    customerCart: [],
    data: createEmptyData(),
    permissionsCatalog: [],
    profileMeta: { roles: [], cities: [], positions: [] },
    adminPermissions: [],
    rolePermissions: [],
    adminUsers: []
};

const currentOrigin = (window.location.origin && window.location.origin !== 'null') ? window.location.origin : '';
const guessedLocalApi = (!currentOrigin || (window.location.hostname === 'localhost' && window.location.port !== '8082'))
    ? 'http://localhost:8082'
    : currentOrigin;
const apiBaseUrl = (document.body.dataset.apiBase?.trim() || window.API_BASE_URL || guessedLocalApi).replace(/\/$/, '');
const apiUrl = (path) => `${apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

function mergeDashboardData(payload) {
    const base = createEmptyData();
    if (!payload || typeof payload !== 'object') {
        return base;
    }
    for (const [key, value] of Object.entries(payload)) {
        if (key === 'profile' && value) {
            base.profile = {
                ...base.profile,
                ...value,
                preferences: {
                    ...base.profile.preferences,
                    ...(value.preferences || {})
                },
                security: {
                    ...base.profile.security,
                    ...(value.security || {})
                },
                activity: value.activity || []
            };
        } else {
            base[key] = value ?? base[key];
        }
    }
    return base;
}

async function fetchDashboardSnapshot() {
    const token = localStorage.getItem('token');
    console.log('[dashboard] starting fetch, token present:', !!token);
    if (!token) {
        console.warn('[dashboard] missing token, redirecting to login');
        window.location.href = 'login.html';
        return null;
    }
    const response = await fetch(apiUrl('/api/dashboard'), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });
    console.log('[dashboard] response status:', response.status);
    if (response.status === 401) {
        console.error('[dashboard] 401 Unauthorized, clearing storage');
        localStorage.clear();
        window.location.href = 'login.html';
        return null;
    }
    if (!response.ok) {
        let message = 'Nepodařilo se načíst data z API.';
        try {
            const payload = await response.json();
            if (payload?.message) {
                message = payload.message;
            }
        } catch (err) {
            const text = await response.text();
            if (text) {
                message = text;
            }
        }
        throw new Error(message);
    }
    return response.json();
}

async function fetchPermissionsCatalog() {
    const token = localStorage.getItem('token');
    console.log('[permissions] starting fetch, token present:', !!token);
    if (!token) {
        return [];
    }
    try {
        const response = await fetch(apiUrl('/api/prava'), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = 'login.html';
            return [];
        }
        if (!response.ok) {
            const message = await response.text();
            console.error('Permissions API error', message);
            return [];
        }
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            console.warn('Permissions API returned unexpected content type:', contentType);
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to load permissions catalog', error);
        return [];
    }
}

async function fetchProfileMeta() {
    const token = localStorage.getItem('token');
    console.log('[profileMeta] starting fetch, token present:', !!token);
    if (!token) {
        return null;
    }
    try {
        const response = await fetch(apiUrl('/api/profile/meta'), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = 'login.html';
            return null;
        }
        if (!response.ok) {
            console.error('Profile meta error', await response.text());
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('Failed to load profile meta', error);
        return null;
    }
}

async function fetchAdminPermissions() {
    const role = (localStorage.getItem('role') || '').trim().toUpperCase();
    console.log('[adminPermissions] current role:', role);
    if (role !== 'ADMIN') {
        return [];
    }
    const token = localStorage.getItem('token');
    if (!token) {
        return [];
    }
    const response = await fetch(apiUrl('/api/admin/prava'), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });
    if (!response.ok) {
        return [];
    }
    return response.json();
}

async function fetchRolePermissions() {
    const role = (localStorage.getItem('role') || '').trim().toUpperCase();
    console.log('[rolePermissions] current role:', role);
    if (role !== 'ADMIN') {
        return [];
    }
    const token = localStorage.getItem('token');
    if (!token) {
        return [];
    }
    const response = await fetch(apiUrl('/api/admin/roles'), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });
    if (!response.ok) {
        return [];
    }
    return response.json();
}

const viewMeta = {
    dashboard: { label: 'Hlavní panel', title: 'Řízení operací' },
    profile: { label: 'Profil admina', title: 'Můj pracovní profil' },
    inventory: { label: 'Sklad & katalog', title: 'Zásoby a kategorie' },
    orders: { label: 'Dodavatelský řetězec', title: 'Objednávky a stavy' },
    people: { label: 'Lidé & přístupy', title: 'Tým a zákazníci' },
    finance: { label: 'Finanční řízení', title: 'Platby a účtenky' },
    records: { label: 'Archiv', title: 'Soubory, logy, zprávy' },
    customer: { label: 'Zákaznická zóna', title: 'Self-service objednávky' }
};

const fragmentUrl = document.body.dataset.fragment || 'fragments/app-shell.html';
state.activeView = document.body.dataset.initialView || state.activeView;

    async function bootstrapConsole() {
        const root = document.getElementById('app-root');
        try {
            const response = await fetch(fragmentUrl);
            if (!response.ok) {
                throw new Error(`Failed to load layout fragment (${response.status})`);
            }
            const markup = await response.text();
            root.innerHTML = markup;
            root.classList.remove('app-boot');

            const [snapshot, permissionsCatalog, profileMeta, adminPermissions, rolePermissions] = await Promise.all([
                fetchDashboardSnapshot(),
                fetchPermissionsCatalog(),
                fetchProfileMeta(),
                fetchAdminPermissions(),
                fetchRolePermissions()
            ]);
            if (!snapshot) {
                return;
            }
            state.data = mergeDashboardData(snapshot);
            state.permissionsCatalog = Array.isArray(permissionsCatalog) ? permissionsCatalog : [];
            state.profileMeta = profileMeta || state.profileMeta;
            state.adminPermissions = Array.isArray(adminPermissions) ? adminPermissions : [];
            state.rolePermissions = Array.isArray(rolePermissions) ? rolePermissions : [];

            const app = new BDASConsole(state, viewMeta);
            app.init();
        } catch (error) {
            console.error('Chyba inicializace rozhraní', error);
            root.innerHTML = `
                <div class="boot-card error">
                    <p>${error.message || 'Nepodařilo se načíst rozhraní. Obnovte prosím stránku.'}</p>
                </div>`;
        }
    }

    class AuthGuard {
        constructor(state) {
            this.state = state;
        }

        enforce() {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return false;
            }
            document.getElementById('user-name').textContent = localStorage.getItem('fullName') || localStorage.getItem('email') || 'Uživatel';
            document.getElementById('user-role').textContent = localStorage.getItem('role') || 'NEW_USER';
            document.getElementById('sync-time').textContent = this.state.data.syncUpdatedAt || new Date().toLocaleString('cs-CZ');
            document.getElementById('logout-btn').addEventListener('click', () => {
                localStorage.clear();
                window.location.href = 'login.html';
            });
            return true;
        }
    }

    function allowSpaHandling(event) {
        return !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0);
    }

    class NavigationController {
        constructor(state, meta) {
            this.state = state;
            this.meta = meta;
            this.navButtons = document.querySelectorAll('.nav-link[data-view]');
            this.views = document.querySelectorAll('.view');
            this.labelEl = document.getElementById('view-label');
            this.titleEl = document.getElementById('view-title');
        }

        init() {
            this.navButtons.forEach(btn => {
                btn.addEventListener('click', event => {
                    const targetView = btn.dataset.view;
                    const targetUrl = btn.dataset.url || btn.getAttribute('href') || window.location.pathname;
                    if (!allowSpaHandling(event)) {
                        return;
                    }
                    event.preventDefault();
                    this.setActive(targetView);
                    window.history.pushState({ view: targetView }, '', targetUrl);
                });
            });
            window.addEventListener('popstate', event => {
                const viewFromState = event.state?.view || document.body.dataset.initialView || 'dashboard';
                this.setActive(viewFromState);
            });
            this.setActive(this.state.activeView);
            window.history.replaceState({ view: this.state.activeView }, '', window.location.pathname);
        }

        setActive(view) {
            this.state.activeView = view;
            this.navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
            this.views.forEach(section => section.classList.toggle('active', section.dataset.view === view));
            const meta = this.meta[view];
            if (meta) {
                this.labelEl.textContent = meta.label;
                this.titleEl.textContent = meta.title;
            }
        }
    }

    class DashboardModule {
        constructor(state) {
            this.state = state;
            this.kpiSku = document.getElementById('kpi-sku');
            this.kpiOrders = document.getElementById('kpi-orders');
            this.kpiRevenue = document.getElementById('kpi-revenue');
            this.kpiCritical = document.getElementById('kpi-critical');
            this.kpiSkuTrend = document.getElementById('kpi-sku-trend');
            this.kpiOrdersTrend = document.getElementById('kpi-orders-trend');
            this.kpiCriticalTrend = document.getElementById('kpi-critical-trend');
            this.chart = document.getElementById('demand-chart');
            this.lowStockList = document.getElementById('low-stock-list');
            this.statusBoard = document.getElementById('overall-status-board');
            this.storeTable = document.getElementById('stores-table');
        }

        render() {
            const revenue = this.state.data.payments.reduce((sum, p) => sum + p.amount, 0);
            const critical = this.state.data.inventory.filter(item => item.stock <= item.minStock);
            const openOrders = this.state.data.orders.filter(order => order.statusCode !== 'DONE').length;

            this.kpiSku.textContent = this.state.data.inventory.length;
            this.kpiOrders.textContent = this.state.data.orders.length;
            this.kpiRevenue.textContent = currencyFormatter.format(revenue);
            this.kpiCritical.textContent = critical.length;
            this.kpiSkuTrend.textContent = `${new Set(this.state.data.inventory.map(item => item.category)).size} kategorií`;
            this.kpiOrdersTrend.textContent = `${openOrders} v práci`;
            this.kpiCriticalTrend.textContent = critical.length ? 'nutné doplnit' : 'vše stabilní';

            const maxValue = Math.max(...this.state.data.weeklyDemand.map(point => point.value));
            this.chart.innerHTML = this.state.data.weeklyDemand.map(point => {
                const height = Math.round((point.value / maxValue) * 100);
                return `<div class="spark-bar" style="height:${height}%"><span>${point.label}</span></div>`;
            }).join('');

            this.lowStockList.innerHTML = critical.length
                ? critical.map(item => `<li>${item.sku} · ${item.name} — zbývá ${item.stock}, minimum ${item.minStock}</li>`).join('')
                : '<p>Všechny položky jsou nad minimem.</p>';

            this.statusBoard.innerHTML = this.state.data.statuses.map(stat => `
                <div class="pill-card">
                    <strong>${stat.label}</strong>
                    <p>${stat.count} záznamů</p>
                    <div class="progress"><span style="width:${Math.min(stat.count * 8, 100)}%"></span></div>
                </div>
            `).join('');

            this.storeTable.innerHTML = this.state.data.stores.map(store => `
                <tr>
                    <td>${store.name}</td>
                    <td>${store.city}</td>
                    <td>${store.address}</td>
                    <td>${store.warehouse}</td>
                    <td>${store.manager}</td>
                    <td><span class="status-badge ${store.status === 'Otevřeno' ? 'success' : 'warning'}">${store.status}</span></td>
                </tr>`).join('');
    }
}

    class InventoryModule {
        constructor(state) {
            this.state = state;
            this.searchInput = document.getElementById('inventory-search');
            this.countEl = document.getElementById('inventory-count');
            this.tableBody = document.getElementById('inventory-table-body');
            this.chipContainer = document.getElementById('inventory-chips');
            this.categoryBoard = document.getElementById('category-board');
            this.warehouseGrid = document.getElementById('warehouse-grid');
            this.form = document.getElementById('new-sku-form');
            this.messageEl = document.getElementById('sku-form-msg');
            this.categorySelect = document.getElementById('sku-category');
            this.warehouseSelect = document.getElementById('sku-warehouse');
        }

        init() {
            this.searchInput?.addEventListener('input', () => this.render());
            this.form?.addEventListener('submit', event => this.handleSubmit(event));
            this.populateSelects();
        }

        populateSelects() {
            if (this.categorySelect) {
                this.categorySelect.innerHTML = '<option value="">Vyberte kategorii</option>' +
                    this.state.data.categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
            }
            if (this.warehouseSelect) {
                this.warehouseSelect.innerHTML = '<option value="">Vyberte sklad</option>' +
                    this.state.data.warehouses.map(w => `<option value="${w.id}">${w.id} — ${w.name}</option>`).join('');
            }
        }

        handleSubmit(event) {
            event.preventDefault();
            const formData = new FormData(this.form);
            const sku = formData.get('sku')?.trim();
            if (!sku) {
                this.messageEl.textContent = 'Zadejte SKU.';
                return;
            }
            this.state.data.inventory.unshift({
                sku,
                name: formData.get('name'),
                category: formData.get('category'),
                warehouse: formData.get('warehouse'),
                supermarket: 'Nová prodejna',
                supplier: formData.get('supplier'),
                stock: Number(formData.get('stock')) || 0,
                minStock: Number(formData.get('minStock')) || 0,
                leadTime: '—',
                status: 'draft'
            });
            this.form.reset();
            this.messageEl.textContent = `Koncept ${sku} byl přidán do seznamu.`;
            this.render();
        }

        render() {
            if (!this.tableBody) return;
            const searchTerm = (this.searchInput?.value.trim().toLowerCase()) || '';
            const filtered = this.state.data.inventory.filter(item => {
                const matchesFilter = this.state.inventoryFilter === 'all' || item.category === this.state.inventoryFilter;
                const matchesSearch = !searchTerm ||
                    item.name.toLowerCase().includes(searchTerm) ||
                    item.sku.toLowerCase().includes(searchTerm);
                return matchesFilter && matchesSearch;
            });
            this.countEl.textContent = filtered.length;
            this.tableBody.innerHTML = filtered.map(item => `
                <tr>
                    <td>${item.sku}</td>
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td>${item.warehouse}</td>
                    <td>${item.supermarket}</td>
                    <td>${item.supplier}</td>
                    <td>${item.stock}</td>
                    <td>${item.minStock}</td>
                </tr>
            `).join('');

            this.renderChips();
            this.categoryBoard.innerHTML = this.state.data.categories.map(cat => `
                <div class="pill-card">
                    <strong>${cat.name}</strong>
                    <p>${cat.assortment} SKU · Obrat ${cat.turnover}</p>
                    <small>Zodpovídá: ${cat.manager}</small>
                </div>
            `).join('');

            this.warehouseGrid.innerHTML = this.state.data.warehouses.map(w => `
                <div class="pill-card">
                    <strong>${w.name}</strong>
                    <p>${w.id} · ${w.contact}</p>
                    <div class="progress">
                        <span style="width:${w.used}%"></span>
                    </div>
                    <small>Vytížení ${w.used}% z ${w.capacity.toLocaleString()} míst</small>
                </div>
            `).join('');
        }

        renderChips() {
            const categories = ['all', ...new Set(this.state.data.inventory.map(item => item.category))];
            this.chipContainer.innerHTML = categories.map(cat => `
                <button class="chip ${this.state.inventoryFilter === cat ? 'active' : ''}" data-category="${cat}">
                    ${cat === 'all' ? 'Všechny kategorie' : cat}
                </button>
            `).join('');
            this.chipContainer.querySelectorAll('.chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.state.inventoryFilter = btn.dataset.category;
                    this.render();
                });
            });
        }
    }

    class OrdersModule {
        constructor(state) {
            this.state = state;
            this.tableBody = document.getElementById('orders-table-body');
            this.statusBoard = document.getElementById('order-status-board');
            this.orderLines = document.getElementById('order-lines');
            this.orderLinesTitle = document.getElementById('order-lines-title');
            this.orderLinesBadge = document.getElementById('order-lines-badge');
            this.ordersCount = document.getElementById('orders-count');
        }

        init() {
            this.tableBody?.addEventListener('click', event => {
                const row = event.target.closest('tr[data-order-id]');
                if (!row) return;
                this.state.selectedOrderId = row.dataset.orderId;
                this.highlightSelection();
                this.renderOrderLines();
            });
        }

        render() {
            if (!this.tableBody) return;
            this.tableBody.innerHTML = this.state.data.orders.map(order => `
                <tr data-order-id="${order.id}">
                    <td>${order.id}</td>
                    <td>${order.type}</td>
                    <td>${order.store}</td>
                    <td>${order.employee}</td>
                    <td>${order.supplier}</td>
                    <td><span class="status-badge info">${order.status}</span></td>
                    <td>${new Date(order.date).toLocaleString('cs-CZ')}</td>
                    <td>${currencyFormatter.format(order.amount)}</td>
                </tr>
            `).join('');
            this.ordersCount.textContent = this.state.data.orders.length;
            if (!this.state.selectedOrderId && this.state.data.orders.length) {
                this.state.selectedOrderId = this.state.data.orders[0].id;
            }
            this.highlightSelection();
            this.renderStatusBoard();
            this.renderOrderLines();
        }

        renderStatusBoard() {
            if (!this.statusBoard) return;
            this.statusBoard.innerHTML = this.state.data.statuses.map(stat => `
                <div class="pill-card">
                    <strong>${stat.label}</strong>
                    <p>${stat.count} objednávek</p>
                    <div class="progress"><span style="width:${Math.min(stat.count * 8, 100)}%"></span></div>
                </div>
            `).join('');
        }

        highlightSelection() {
            if (!this.tableBody) return;
            this.tableBody.querySelectorAll('tr').forEach(row => {
                row.classList.toggle('selected', row.dataset.orderId === this.state.selectedOrderId);
            });
        }

        renderOrderLines() {
            if (!this.orderLines) return;
            const orderId = this.state.selectedOrderId;
            this.orderLinesTitle.textContent = orderId ? `Složení ${orderId}` : 'Složení objednávky';
            this.orderLinesBadge.textContent = orderId || '—';
            const lines = this.state.data.orderItems.filter(item => item.orderId === orderId);
            this.orderLines.innerHTML = lines.length
                ? lines.map(line => `<li>${line.sku} · ${line.name} — ${line.qty} ks × ${currencyFormatter.format(line.price)}</li>`).join('')
                : '<p>Žádná data o položkách.</p>';
        }
    }

    class PeopleModule {
        constructor(state) {
            this.state = state;
            this.view = document.querySelector('[data-view="people"]');
            this.navLink = document.querySelector('.nav-link[data-view="people"]');
            this.roleSummary = document.getElementById('role-summary-list');
        }

        init() {
            if (!this.view) {
                return;
            }
            if (!this.hasAccess()) {
                this.hideView();
                return;
            }
        }

        hasAccess() {
            const permissions = this.state.data?.profile?.permissions;
            if (!Array.isArray(permissions)) {
                return false;
            }
            return permissions.includes('MANAGE_USERS') || permissions.includes('MANAGE_SUPPLIERS');
        }

        hideView() {
            if (this.view) {
                this.view.remove();
                this.view = null;
            }
            this.navLink?.remove();
        }

        render() {
            if (!this.view || !this.hasAccess()) {
                return;
            }
            this.renderRoleSummary();
        }

        renderRoleSummary() {
            if (!this.roleSummary) {
                return;
            }
            const roles = this.state.data.roles || [];
            this.roleSummary.innerHTML = roles.length
                ? roles.map(role => `
                    <div class="pill-card">
                        <strong>${role.name}</strong>
                        <p>${role.description || 'Bez popisu'}</p>
                        <small>${role.count} uživatelů</small>
                    </div>
                `).join('')
                : '<p class="profile-muted">Žádné role nejsou k dispozici.</p>';
        }
    }

    class FinanceModule {
        constructor(state) {
            this.state = state;
            this.tableBody = document.getElementById('payments-table-body');
            this.statsEl = document.getElementById('payment-stats');
            this.receiptList = document.getElementById('receipt-list');
            this.filterButtons = document.querySelectorAll('[data-payment-filter]');
        }

        init() {
            this.filterButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.filterButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.state.paymentFilter = btn.dataset.paymentFilter;
                    this.render();
                });
            });
        }

        render() {
            if (!this.tableBody) return;
            const filtered = this.state.data.payments.filter(p => this.state.paymentFilter === 'all' || p.type === this.state.paymentFilter);
            this.tableBody.innerHTML = filtered.map(p => `
                <tr>
                    <td>${p.id}</td>
                    <td>${p.orderId}</td>
                    <td>${p.type === 'K' ? 'Karta' : 'Hotově'}</td>
                    <td>${currencyFormatter.format(p.amount)}</td>
                    <td>${p.date}</td>
                    <td><span class="status-badge ${p.status === 'Zpracováno' ? 'success' : 'warning'}">${p.status}</span></td>
                </tr>
            `).join('');

            const cash = this.state.data.payments.filter(p => p.type === 'H').reduce((sum, payment) => sum + payment.amount, 0);
            const card = this.state.data.payments.filter(p => p.type === 'K').reduce((sum, payment) => sum + payment.amount, 0);
            if (this.statsEl) {
                this.statsEl.innerHTML = `
                    <div class="pill-card">
                        <strong>Platební karty</strong>
                        <p>${currencyFormatter.format(card)}</p>
                        <div class="progress"><span style="width:76%"></span></div>
                    </div>
                    <div class="pill-card">
                        <strong>Hotovostní pokladny</strong>
                        <p>${currencyFormatter.format(cash)}</p>
                        <div class="progress"><span style="width:24%"></span></div>
                    </div>
                `;
            }

            if (this.receiptList) {
                this.receiptList.innerHTML = this.state.data.payments
                    .filter(p => p.receipt)
                    .map(p => `<li>Účtenka k ${p.orderId} — ${currencyFormatter.format(p.amount)} (${p.method})</li>`)
                    .join('');
            }
        }
    }

    class RecordsModule {
        constructor(state) {
            this.state = state;
            this.fileTable = document.getElementById('file-table-body');
            this.folderList = document.getElementById('folder-list');
            this.logTimeline = document.getElementById('log-timeline');
            this.messageList = document.getElementById('message-list');
            this.subscriberList = document.getElementById('subscriber-list');
        }
        init() {
            if (!this.state.selectedFolder && this.state.data.folders.length) {
                this.state.selectedFolder = this.state.data.folders[0].name;
            }
            this.folderList?.addEventListener('click', event => {
                const btn = event.target.closest('button[data-folder]');
                if (!btn) return;
                this.state.selectedFolder = btn.dataset.folder;
                this.render();
            });
        }

        render() {
            const folders = this.state.data.folders || [];
            const activeFolder = this.state.selectedFolder || folders[0]?.name;
            if (this.folderList) {
                this.folderList.innerHTML = folders.length
                    ? folders.map(folder => `
                        <button class="chip ${folder.name === activeFolder ? 'active' : ''}" data-folder="${folder.name}">
                            ${folder.name}
                        </button>`).join('')
                    : '<p>Žádné složky.</p>';
            }

            if (this.fileTable) {
                const files = folders.find(folder => folder.name === activeFolder)?.files || [];
                this.fileTable.innerHTML = files.length
                    ? files.map(file => `
                        <tr>
                            <td>${file.name}</td>
                            <td>${file.type}</td>
                            <td>${file.archive}</td>
                            <td>${file.owner}</td>
                            <td>${file.updated}</td>
                        </tr>`).join('')
                    : '<tr><td colspan="5">Vybraná složka je prázdná.</td></tr>';
            }

            if (this.logTimeline) {
                this.logTimeline.innerHTML = this.state.data.logs.map(log => `
                    <div class="log-item">
                        <strong>${log.table}</strong> · ${log.operation}<br>
                        <small>${log.timestamp} · ${log.user}</small>
                        <p>${log.descr}</p>
                    </div>
                `).join('');
            }

            if (this.messageList) {
                this.messageList.innerHTML = this.state.data.messages.map(message => `
                    <div class="message-item">
                        <strong>${message.sender} → ${message.receiver}</strong>
                        <small>${message.date}</small>
                        <p>${message.preview}</p>
                    </div>
                `).join('');
            }

            if (this.subscriberList) {
                this.subscriberList.innerHTML = this.state.data.subscribers.map(sub => `
                <div class="pill-card">
                    <strong>${sub.endpoint}</strong>
                    <p>auth ${sub.auth}</p>
                    <small>aktualizováno ${sub.updated}</small>
                </div>
            `).join('');
            }
        }
    }

    class CustomerModule {
        constructor(state) {
            this.state = state;
            this.categoryContainer = document.getElementById('customer-category-chips');
            this.grid = document.getElementById('customer-product-grid');
            this.cartEl = document.getElementById('customer-cart');
            this.suggestionsEl = document.getElementById('customer-suggestions');
        }

        init() {
            this.state.customerCart = this.state.customerCart || [];
            if (!this.categoryContainer) return;
            this.categoryContainer.addEventListener('click', event => {
                const btn = event.target.closest('button[data-category]');
                if (!btn) return;
                this.state.customerCategoryFilter = btn.dataset.category;
                this.render();
            });
            this.grid?.addEventListener('click', event => {
                const btn = event.target.closest('button[data-add-product]');
                if (!btn) return;
                this.addToCart(btn.dataset.sku);
            });
            this.cartEl?.addEventListener('click', event => {
                if (event.target.matches('[data-clear-cart]')) {
                    this.state.customerCart = [];
                    this.render();
                }
            });
        }

        addToCart(sku) {
            const product = this.state.data.customerProducts.find(item => item.sku === sku);
            if (!product) return;
            const existing = this.state.customerCart.find(item => item.sku === sku);
            if (existing) {
                existing.qty += 1;
            } else {
                this.state.customerCart.push({ sku, name: product.name, price: product.price, qty: 1 });
            }
            this.render();
        }

        render() {
            this.renderChips();
            this.renderProducts();
            this.renderCart();
            this.renderSuggestions();
        }

        renderChips() {
            if (!this.categoryContainer) return;
            const categories = ['all', ...new Set(this.state.data.customerProducts.map(prod => prod.category))];
            this.categoryContainer.innerHTML = categories.map(category => `
                <button class="chip ${this.state.customerCategoryFilter === category ? 'active' : ''}" data-category="${category}">
                    ${category === 'all' ? 'Vše' : category}
                </button>
            `).join('');
        }

        renderProducts() {
            if (!this.grid) return;
            const filter = this.state.customerCategoryFilter;
            const products = this.state.data.customerProducts.filter(prod => filter === 'all' || prod.category === filter);
            this.grid.innerHTML = products.map(prod => `
                <article class="product-card">
                    <div class="product-icon">${prod.image || '🛒'}</div>
                    <div>
                        <strong>${prod.name}</strong>
                        <p>${prod.description}</p>
                    </div>
                    <div class="product-meta">
                        <span>${prod.category}</span>
                        <span class="badge">${prod.badge}</span>
                    </div>
                    <div class="product-footer">
                        <strong>${currencyFormatter.format(prod.price)}</strong>
                        <button data-add-product="${prod.sku}">Do košíku</button>
                    </div>
                </article>
            `).join('');
        }

        renderCart() {
            if (!this.cartEl) return;
            const cart = this.state.customerCart;
            if (!cart.length) {
                this.cartEl.innerHTML = '<p>Košík je prázdný.</p>';
                return;
            }
            const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
            this.cartEl.innerHTML = `
                <div class="cart-card">
                    <ul>
                        ${cart.map(item => `<li>${item.qty} × ${item.name}<span>${currencyFormatter.format(item.price * item.qty)}</span></li>`).join('')}
                    </ul>
                    <div class="cart-total">
                        <strong>Celkem</strong>
                        <span>${currencyFormatter.format(total)}</span>
                    </div>
                    <div class="cart-actions">
                        <button data-clear-cart>Vyprázdnit</button>
                        <button class="cart-submit" type="button">Odeslat požadavek</button>
                    </div>
                </div>`;
        }

        renderSuggestions() {
            if (!this.suggestionsEl) return;
            this.suggestionsEl.innerHTML = this.state.data.customerSuggestions.map(text => `
                <div class="pill-card">
                    <p>${text}</p>
                </div>
            `).join('');
        }
    }

    class GlobalSearch {
        constructor(state) {
            this.state = state;
            this.input = document.getElementById('global-search');
            this.results = document.getElementById('search-results');
        }

        init() {
            if (!this.input) return;
            this.input.addEventListener('input', () => this.handleInput());
            document.addEventListener('click', event => {
                if (!event.target.closest('.search')) {
                    this.hide();
                }
            });
        }

        handleInput() {
            const term = this.input.value.trim().toLowerCase();
            if (term.length < 2) {
                this.hide();
                return;
            }
            const hits = [];
            this.state.data.inventory.forEach(item => {
                if (item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term)) {
                    hits.push({ type: 'SKU', label: `${item.sku} · ${item.name}` });
                }
            });
            this.state.data.orders.forEach(order => {
                if (order.id.toLowerCase().includes(term) || order.store.toLowerCase().includes(term)) {
                    hits.push({ type: 'ORDER', label: `${order.id} · ${order.store}` });
                }
            });
            this.state.data.customers.forEach(customer => {
                if (customer.name.toLowerCase().includes(term)) {
                    hits.push({ type: 'CLIENT', label: `${customer.name} · ${customer.phone}` });
                }
            });
            this.results.innerHTML = hits.length
                ? hits.slice(0, 6).map(hit => `<div class="search-hit"><span class="badge">${hit.type}</span> ${hit.label}</div>`).join('')
                : '<p>Žádné výsledky, zkuste jiný dotaz.</p>';
            this.results.classList.add('visible');
        }

        hide() {
            if (!this.results) return;
            this.results.classList.remove('visible');
            this.results.innerHTML = '';
        }
    }

    class BDASConsole {
        constructor(state, meta) {
            this.state = state;
            this.authGuard = new AuthGuard(state);
            this.navigation = new NavigationController(state, meta);
            this.dashboard = new DashboardModule(state);
            this.profile = new ProfileModule(state, this, {
                apiUrl,
                fetchDashboardSnapshot,
                fetchPermissionsCatalog,
                mergeDashboardData
            });
            this.permissionsModule = new PermissionsModule(state, {
                apiUrl,
                fetchAdminPermissions,
                fetchRolePermissions
            });
            this.usersModule = new UsersModule(state, {
                apiUrl,
                refreshApp: () => this.refreshData()
            });
            this.inventory = new InventoryModule(state);
            this.orders = new OrdersModule(state);
            this.people = new PeopleModule(state);
            this.finance = new FinanceModule(state);
            this.records = new RecordsModule(state);
            this.customer = new CustomerModule(state);
            this.search = new GlobalSearch(state);
        }

        init() {
            if (!this.authGuard.enforce()) {
                return;
            }
            this.navigation.init();
            this.permissionsModule.init();
            this.usersModule.init();
            this.inventory.init();
            this.orders.init();
            this.people.init();
            this.finance.init();
            this.records.init();
            this.customer.init();
            this.search.init();
            this.registerUtilityButtons();
            this.renderAll();
        }

        registerUtilityButtons() {
            const refreshBtn = document.getElementById('refresh-btn');
            refreshBtn?.addEventListener('click', async () => {
                if (refreshBtn.disabled) {
                    return;
                }
                refreshBtn.disabled = true;
                try {
                    await this.refreshData();
                } catch (error) {
                    console.error('Refresh failed', error);
                    alert(error.message || 'Nepodařilo se načíst aktuální data.');
                } finally {
                    refreshBtn.disabled = false;
                }
            });
            document.getElementById('new-order-btn')?.addEventListener('click', () => alert('Průvodce vytvořením objednávky bude brzy dostupný.'));
            document.getElementById('new-store-btn')?.addEventListener('click', () => alert('Průvodce otevřením prodejny bude brzy dostupný.'));
            document.getElementById('export-store-btn')?.addEventListener('click', () => alert('Export seznamu prodejen bude brzy připraven.'));
            document.getElementById('upload-btn')?.addEventListener('click', () => alert('Nahrávání souborů přidáme později.'));
            const exitBtn = document.getElementById('impersonation-exit-btn');
            if (exitBtn) {
                const isImpersonating = !!localStorage.getItem('admin_original_token');
                exitBtn.style.display = isImpersonating ? 'inline-flex' : 'none';
                exitBtn.addEventListener('click', () => {
                    const originalToken = localStorage.getItem('admin_original_token');
                    if (originalToken) {
                        localStorage.setItem('token', originalToken);
                        localStorage.setItem('role', localStorage.getItem('admin_original_role') || '');
                        localStorage.setItem('fullName', localStorage.getItem('admin_original_name') || '');
                        localStorage.setItem('email', localStorage.getItem('admin_original_email') || '');
                        localStorage.removeItem('admin_original_token');
                        localStorage.removeItem('admin_original_role');
                        localStorage.removeItem('admin_original_name');
                        localStorage.removeItem('admin_original_email');
                        window.location.reload();
                    }
                });
            }
        }

        async refreshData() {
            const [snapshot, permissionsCatalog, profileMeta, adminPermissions, rolePermissions] = await Promise.all([
                fetchDashboardSnapshot(),
                fetchPermissionsCatalog(),
                fetchProfileMeta(),
                fetchAdminPermissions(),
                fetchRolePermissions()
            ]);
            if (!snapshot) {
                return false;
            }
            this.state.data = mergeDashboardData(snapshot);
            this.state.permissionsCatalog = Array.isArray(permissionsCatalog) ? permissionsCatalog : [];
            this.state.profileMeta = profileMeta || this.state.profileMeta;
            this.state.adminPermissions = Array.isArray(adminPermissions) ? adminPermissions : this.state.adminPermissions;
            this.state.rolePermissions = Array.isArray(rolePermissions) ? rolePermissions : this.state.rolePermissions;
            const syncLabel = document.getElementById('sync-time');
            if (syncLabel) {
                syncLabel.textContent = this.state.data.syncUpdatedAt || new Date().toLocaleString('cs-CZ');
            }
            this.renderAll();
            return true;
        }

        renderAll() {
            if (!this.state.selectedOrderId && this.state.data.orders.length) {
                this.state.selectedOrderId = this.state.data.orders[0].id;
            }
            this.dashboard.render();
            this.profile.render();
            this.inventory.render();
            this.orders.render();
            this.people.render();
            this.finance.render();
            this.records.render();
            this.customer.render();
            this.permissionsModule.render();
        }
    }

    document.addEventListener('DOMContentLoaded', bootstrapConsole);

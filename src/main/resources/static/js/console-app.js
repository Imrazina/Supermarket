import ProfileModule from './modules/profile-module.js';
import PermissionsModule from './modules/permissions-module.js';
import DbObjectsModule from './modules/dbobjects-module.js';
import UsersModule from './modules/users-module.js';
import RecordsModule from './modules/archive-module.js';
import CustomerOrdersView from './modules/customer-orders-view.js';

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
        unreadMessages: 0,
        lastMessageSummary: "",
        subscribers: [],
        stores: [],
        folders: [],
        archiveTree: [],
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
    inventoryFilters: {
        category: 'all',
        warehouse: 'all',
        store: 'all',
        supplier: 'all',
        status: 'all',
        criticalOnly: false
    },
    paymentFilter: 'all',
    selectedOrderId: null,
    selectedFolder: null,
    customerCategoryFilter: 'all',
    customerSearchTerm: '',
    customerCart: [],
    customerCartLoaded: false,
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
const webpushPublicKey = document.body.dataset.webpushKey || 'BBoYaoc8zDDFcRjeUDuO4HI15lrxOhtqEgdWfcfkn5vqTHmUeZc_DU6yodFwDNcthvOyKSK-K_Us9xdEDVYR_5I';
const serviceWorkerPath = document.body.dataset.swPath || '/sw.js';

function restoreOriginalSession() {
    const originalToken = localStorage.getItem('admin_original_token');
    if (!originalToken) {
        return false;
    }
    localStorage.setItem('token', originalToken);
    localStorage.setItem('role', localStorage.getItem('admin_original_role') || '');
    localStorage.setItem('fullName', localStorage.getItem('admin_original_name') || '');
    localStorage.setItem('email', localStorage.getItem('admin_original_email') || '');
    localStorage.removeItem('admin_original_token');
    localStorage.removeItem('admin_original_role');
    localStorage.removeItem('admin_original_name');
    localStorage.removeItem('admin_original_email');
    return true;
}

function updateMessageSidebar(data) {
    const unreadEl = document.getElementById('message-unread');
    const timeEl = document.getElementById('message-last-time');
    const fromEl = document.getElementById('message-last-from');
    const textEl = document.getElementById('message-last-text');
    if (!unreadEl || !timeEl || !fromEl || !textEl) {
        return;
    }
    const unread = (data && typeof data.unreadMessages === 'number') ? data.unreadMessages : '—';
    const rawSummary = (data && data.lastMessageSummary) ? data.lastMessageSummary : 'Žádné zprávy';
    const parsed = parseMessageSummary(rawSummary);
    unreadEl.textContent = unread;
    if (unread === 0) {
        timeEl.textContent = '—';
        fromEl.textContent = '';
        textEl.textContent = 'Žádné zprávy';
    } else {
        timeEl.textContent = parsed.time || '—';
        fromEl.textContent = parsed.from ? `od ${parsed.from}` : '';
        textEl.textContent = parsed.text || 'Message …';
    }
}

function parseMessageSummary(summary) {
    if (!summary || summary.toLowerCase().includes('žádné')) {
        return { time: '', from: '', text: 'Žádné zprávy' };
    }
    const parts = summary.split('|');
    const time = parts[0]?.trim() || '';
    const rest = parts.slice(1).join('|').trim();
    let from = '';
    let text = rest;
    const colonIdx = rest.indexOf(':');
    if (colonIdx !== -1) {
        from = rest.slice(0, colonIdx).replace(/^od\s*/i, '').trim();
        text = rest.slice(colonIdx + 1).trim();
    }
    if (text.length > 120) {
        text = `${text.slice(0, 117)}…`;
    }
    return { time, from, text };
}

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
        console.warn('[dashboard] missing token, redirecting to landing');
        window.location.href = 'landing.html';
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
        window.location.href = 'landing.html';
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
            window.location.href = 'landing.html';
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
            window.location.href = 'landing.html';
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
    dbobjects: { label: 'DB objekty', title: 'Systémový katalog' },
    customer: { label: 'Zákaznická zóna', title: 'Self-service objednávky' },
    'customer-orders': { label: 'Moje objednávky', title: 'Objednávky zákazníka' },
    'customer-payment': { label: 'Platba', title: 'Zaplaťte objednávku' },
    chat: { label: 'Komunikace', title: 'Chat & push centrum' }
};

const fragmentUrl = document.body.dataset.fragment || 'fragments/app-shell.html';
state.activeView = document.body.dataset.initialView || state.activeView;

const allViews = [
    'dashboard', 'profile', 'inventory', 'orders', 'people', 'finance', 'records',
    'dbobjects', 'permissions', 'customer', 'customer-cart', 'customer-payment', 'chat'
];

function resolveAllowedViews(role, permissions = []) {
    const normalizedRole = (role || '').trim().toUpperCase();
    const permSet = new Set(Array.isArray(permissions) ? permissions.map(p => (p || '').toUpperCase()) : []);
    const allowed = new Set(['dashboard', 'profile', 'chat']);
    const add = (...views) => views.forEach(view => allowed.add(view));

    if (normalizedRole === 'ADMIN') {
        add(...allViews);
        return allowed;
    }

    if (permSet.has('MANAGE_USERS')) {
        allowed.add('people');
    }

    if (normalizedRole === 'ZAKAZNIK' || normalizedRole === 'CUSTOMER' || normalizedRole === 'NEW_USER') {
        add('customer', 'customer-cart', 'customer-payment');
        return allowed;
    }

    if (normalizedRole.startsWith('DORUCOVATEL') || normalizedRole === 'COURIER' || normalizedRole === 'DORUČOVATEL') {
        add('orders');
        return allowed;
    }

    add('inventory', 'orders', 'finance', 'records', 'customer', 'customer-cart', 'customer-payment');
    return allowed;
}

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

            const paymentModule = new PaymentModule(state, { apiUrl });
            paymentModule.init();
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
                window.location.href = 'landing.html';
                return false;
            }
            document.getElementById('user-name').textContent = localStorage.getItem('fullName') || localStorage.getItem('email') || 'Uživatel';
            document.getElementById('user-role').textContent = localStorage.getItem('role') || 'NEW_USER';
            updateMessageSidebar(this.state.data);
            document.getElementById('logout-btn').addEventListener('click', () => {
                localStorage.clear();
                window.location.href = 'landing.html';
            });
            return true;
        }
    }

    function allowSpaHandling(event) {
        return !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0);
    }

    class NavigationController {
        constructor(state, meta, options = {}) {
            this.state = state;
            this.meta = meta;
            this.allowedViews = options.allowedViews || new Set();
            this.defaultView = options.defaultView || 'dashboard';
            this.onBlocked = options.onBlocked;
            this.navButtons = document.querySelectorAll('.nav-link[data-view]');
            this.views = document.querySelectorAll('.view');
            this.labelEl = document.getElementById('view-label');
            this.titleEl = document.getElementById('view-title');
        }

        isAllowed(view) {
            if (!this.allowedViews || !this.allowedViews.size) {
                return true;
            }
            return this.allowedViews.has(view);
        }

        ensureAllowed(view) {
            if (this.isAllowed(view)) {
                return view;
            }
            if (typeof this.onBlocked === 'function') {
                this.onBlocked(view, this.defaultView);
            }
            return this.defaultView;
        }

        refreshNavVisibility() {
            this.navButtons.forEach(btn => {
                const view = btn.dataset.view;
                btn.style.display = this.isAllowed(view) ? '' : 'none';
            });
        }

        getUrlForView(view) {
            const match = Array.from(this.navButtons).find(btn => btn.dataset.view === view);
            return match?.dataset.url || match?.getAttribute('href') || window.location.pathname;
        }

        init() {
            this.refreshNavVisibility();
            const initialView = this.ensureAllowed(this.state.activeView || this.defaultView);
            this.state.activeView = initialView;
            this.setActive(initialView);
            window.history.replaceState({ view: initialView }, '', this.getUrlForView(initialView) || window.location.pathname);
            this.navButtons.forEach(btn => {
                btn.addEventListener('click', event => {
                    const targetView = btn.dataset.view;
                    const targetUrl = btn.dataset.url || btn.getAttribute('href') || window.location.pathname;
                    if (!allowSpaHandling(event)) {
                        return;
                    }
                    event.preventDefault();
                    const appliedView = this.setActive(targetView);
                    window.history.pushState({ view: appliedView }, '', this.getUrlForView(appliedView) || targetUrl);
                });
            });
            window.addEventListener('popstate', event => {
                const viewFromState = event.state?.view || document.body.dataset.initialView || 'dashboard';
                const appliedView = this.setActive(viewFromState);
                if (appliedView !== viewFromState) {
                    window.history.replaceState({ view: appliedView }, '', this.getUrlForView(appliedView) || window.location.pathname);
                }
            });
        }

        setActive(view) {
            const target = this.ensureAllowed(view);
            this.state.activeView = target;
            this.navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === target));
            this.views.forEach(section => section.classList.toggle('active', section.dataset.view === target));
            const meta = this.meta[target];
            if (meta) {
                this.labelEl.textContent = meta.label;
                this.titleEl.textContent = meta.title;
            }
            return target;
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
            this.activeFilters = document.getElementById('inventory-active-filters');
            this.categoryBoard = document.getElementById('category-board');
            this.warehouseGrid = document.getElementById('warehouse-grid');
            this.form = document.getElementById('new-sku-form');
            this.messageEl = document.getElementById('sku-form-msg');
            this.categorySelect = document.getElementById('sku-category');
            this.warehouseSelect = document.getElementById('sku-warehouse');
            this.filterCategory = document.getElementById('inventory-filter-category');
            this.filterWarehouse = document.getElementById('inventory-filter-warehouse');
            this.filterStore = document.getElementById('inventory-filter-store');
            this.filterSupplier = document.getElementById('inventory-filter-supplier');
            this.filterStatus = document.getElementById('inventory-filter-status');
            this.filterCritical = document.getElementById('inventory-filter-critical');
            this.resetBtn = document.getElementById('inventory-reset');
            this.optionsSignature = '';
        }

        init() {
            this.searchInput?.addEventListener('input', () => this.render());
            this.form?.addEventListener('submit', event => this.handleSubmit(event));
            [
                [this.filterCategory, 'category'],
                [this.filterWarehouse, 'warehouse'],
                [this.filterStore, 'store'],
                [this.filterSupplier, 'supplier'],
                [this.filterStatus, 'status']
            ].forEach(([select, key]) => {
                select?.addEventListener('change', () => {
                    this.state.inventoryFilters[key] = select.value || 'all';
                    this.render();
                });
            });
            this.filterCritical?.addEventListener('change', () => {
                this.state.inventoryFilters.criticalOnly = !!this.filterCritical.checked;
                this.render();
            });
            this.resetBtn?.addEventListener('click', () => this.resetFilters());
            this.populateSelects();
        }

        buildOptionsSignature() {
            const categories = (this.state.data.categories || []).map(cat => cat.name).filter(Boolean).sort();
            const warehouses = (this.state.data.warehouses || []).map(w => w.name || w.id).filter(Boolean).sort();
            const stores = (this.state.data.inventory || []).map(item => item.supermarket).filter(Boolean).sort();
            const suppliers = (this.state.data.inventory || []).map(item => item.supplier).filter(Boolean).sort();
            const statuses = (this.state.data.inventory || []).map(item => this.resolveStatus(item)).filter(Boolean).sort();
            return JSON.stringify({ categories, warehouses, stores, suppliers, statuses });
        }

        populateSelects() {
            const signature = this.buildOptionsSignature();
            const shouldUpdate = signature !== this.optionsSignature;
            if (shouldUpdate) {
                this.optionsSignature = signature;
                if (this.categorySelect) {
                    this.categorySelect.innerHTML = '<option value="">Vyberte kategorii</option>' +
                        (this.state.data.categories || []).map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
                }
                if (this.warehouseSelect) {
                    this.warehouseSelect.innerHTML = '<option value="">Vyberte sklad</option>' +
                        (this.state.data.warehouses || []).map(w => {
                            const value = w.name || w.id || '';
                            return `<option value="${value}">${w.id} — ${w.name}</option>`;
                        }).join('');
                }
                const categoryOptions = (this.state.data.categories || []).map(cat => cat.name);
                const warehouseOptions = (this.state.data.warehouses || []).map(w => w.name || w.id);
                const storeOptions = (this.state.data.inventory || []).map(item => item.supermarket);
                const supplierOptions = (this.state.data.inventory || []).map(item => item.supplier);
                const statusOptions = ['critical', 'ok', 'draft', ...(this.state.data.inventory || []).map(item => this.resolveStatus(item))];
                this.applyFilterOptions(this.filterCategory, categoryOptions, 'Všechny kategorie', this.state.inventoryFilters.category);
                this.applyFilterOptions(this.filterWarehouse, warehouseOptions, 'Všechny sklady', this.state.inventoryFilters.warehouse);
                this.applyFilterOptions(this.filterStore, storeOptions, 'Všechny prodejny', this.state.inventoryFilters.store);
                this.applyFilterOptions(this.filterSupplier, supplierOptions, 'Všichni dodavatelé', this.state.inventoryFilters.supplier);
                this.applyFilterOptions(this.filterStatus, statusOptions, 'Všechny stavy', this.state.inventoryFilters.status, {
                    critical: 'Pod minimem',
                    ok: 'V normě',
                    draft: 'Koncept'
                });
            }
            this.syncFilterControls();
        }

        applyFilterOptions(select, values, allLabel, currentValue, labelMap = {}) {
            if (!select) return;
            const unique = Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'cs'));
            const options = ['all', ...unique];
            select.innerHTML = options.map(option => {
                const label = option === 'all' ? allLabel : (labelMap[option] || option);
                return `<option value="${option}">${label}</option>`;
            }).join('');
            const normalized = options.includes(currentValue) ? currentValue : 'all';
            select.value = normalized;
        }

        syncFilterControls() {
            const filters = this.state.inventoryFilters;
            const sync = (select, key) => {
                if (!select) return;
                const hasOption = Array.from(select.options).some(opt => opt.value === filters[key]);
                const value = hasOption ? filters[key] : 'all';
                select.value = value;
                if (filters[key] !== value) {
                    filters[key] = value;
                }
            };
            sync(this.filterCategory, 'category');
            sync(this.filterWarehouse, 'warehouse');
            sync(this.filterStore, 'store');
            sync(this.filterSupplier, 'supplier');
            sync(this.filterStatus, 'status');
            if (this.filterCritical) {
                this.filterCritical.checked = !!filters.criticalOnly;
            }
        }

        resetFilters() {
            Object.assign(this.state.inventoryFilters, {
                category: 'all',
                warehouse: 'all',
                store: 'all',
                supplier: 'all',
                status: 'all',
                criticalOnly: false
            });
            if (this.searchInput) {
                this.searchInput.value = '';
            }
            if (this.filterCritical) {
                this.filterCritical.checked = false;
            }
            this.syncFilterControls();
            this.render();
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

        resolveStatus(item) {
            if (!item) return 'unknown';
            if (item.status === 'draft') {
                return 'draft';
            }
            if (Number(item.stock) <= Number(item.minStock)) {
                return 'critical';
            }
            return item.status || 'ok';
        }

        getStatusLabel(status) {
            const labels = {
                critical: 'Pod minimem',
                ok: 'V normě',
                draft: 'Koncept',
                unknown: 'Neznámý'
            };
            return labels[status] || status || '—';
        }

        getStatusClass(status) {
            if (status === 'critical') return 'danger';
            if (status === 'draft') return 'info';
            if (status === 'ok') return 'success';
            return 'warning';
        }

        render() {
            if (!this.tableBody) return;
            this.populateSelects();
            const rawSearch = (this.searchInput?.value.trim()) || '';
            const searchTerm = rawSearch.toLowerCase();
            const filters = this.state.inventoryFilters;
            const filtered = (this.state.data.inventory || []).filter(item => {
                const status = this.resolveStatus(item);
                const matchesCategory = filters.category === 'all' || item.category === filters.category;
                const matchesWarehouse = filters.warehouse === 'all' || item.warehouse === filters.warehouse;
                const matchesStore = filters.store === 'all' || item.supermarket === filters.store;
                const matchesSupplier = filters.supplier === 'all' || item.supplier === filters.supplier;
                const matchesStatus = filters.status === 'all' || status === filters.status;
                const matchesCritical = !filters.criticalOnly || status === 'critical';
                const matchesSearch = !searchTerm ||
                    (item.name && item.name.toLowerCase().includes(searchTerm)) ||
                    (item.sku && item.sku.toLowerCase().includes(searchTerm));
                return matchesCategory && matchesWarehouse && matchesStore && matchesSupplier && matchesStatus && matchesCritical && matchesSearch;
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
                    <td><span class="status-badge ${this.getStatusClass(this.resolveStatus(item))}">${this.getStatusLabel(this.resolveStatus(item))}</span></td>
                </tr>
            `).join('');

            this.renderActiveFilters(rawSearch);
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

        renderActiveFilters(searchTerm = '') {
            if (!this.activeFilters) return;
            const filters = this.state.inventoryFilters;
            const chips = [];
            if (filters.category !== 'all') chips.push({ key: 'category', label: `Kategorie: ${filters.category}` });
            if (filters.warehouse !== 'all') chips.push({ key: 'warehouse', label: `Sklad: ${filters.warehouse}` });
            if (filters.store !== 'all') chips.push({ key: 'store', label: `Prodejna: ${filters.store}` });
            if (filters.supplier !== 'all') chips.push({ key: 'supplier', label: `Dodavatel: ${filters.supplier}` });
            if (filters.status !== 'all') chips.push({ key: 'status', label: `Stav: ${this.getStatusLabel(filters.status)}` });
            if (filters.criticalOnly) chips.push({ key: 'criticalOnly', label: 'Jen pod minimem' });
            if (searchTerm) chips.push({ key: 'search', label: `Hledat: ${searchTerm}` });

            if (!chips.length) {
                this.activeFilters.innerHTML = '<p class="profile-muted" style="margin:4px 0;">Žádné filtry nejsou použité.</p>';
                this.resetBtn?.setAttribute('disabled', 'disabled');
                return;
            }
            this.resetBtn?.removeAttribute('disabled');
            this.activeFilters.innerHTML = chips.map(chip => `
                <button class="chip active" data-filter-key="${chip.key}">
                    ${chip.label}
                    <span aria-hidden="true">×</span>
                </button>
            `).join('');
            this.activeFilters.querySelectorAll('[data-filter-key]').forEach(btn => {
                btn.addEventListener('click', () => this.clearFilter(btn.dataset.filterKey));
            });
        }

        clearFilter(key) {
            if (!key) return;
            if (key === 'search') {
                if (this.searchInput) {
                    this.searchInput.value = '';
                }
            } else if (key === 'criticalOnly') {
                this.state.inventoryFilters.criticalOnly = false;
                if (this.filterCritical) {
                    this.filterCritical.checked = false;
                }
            } else if (this.state.inventoryFilters.hasOwnProperty(key)) {
                this.state.inventoryFilters[key] = 'all';
            }
            this.syncFilterControls();
            this.render();
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

    class ChatModule {
        constructor(state, deps) {
            this.state = state;
            this.apiUrl = deps.apiUrl;
            this.publicKey = deps.publicKey;
            this.serviceWorkerPath = deps.serviceWorkerPath;
            this.view = document.querySelector('[data-view="chat"]');
            this.feed = document.getElementById('chat-feed');
            this.form = document.getElementById('chat-form');
            this.messageInput = document.getElementById('chat-message');
            this.receiverInput = document.getElementById('chat-receiver');
            this.formStatus = document.getElementById('chat-form-status');
            this.pushToggle = document.getElementById('chat-push-toggle');
            this.pushToggleLabel = document.getElementById('chat-push-text');
            this.pushTestBtn = document.getElementById('chat-push-test');
            this.pushEnabled = false;
            this.pushToggleLocked = false;
            this.pushToggleLoading = false;
            this.subscriberList = document.getElementById('chat-subscriber-list');
            this.contactsList = document.getElementById('chat-people-list');
            this.contactSearch = document.getElementById('chat-contact-search');
            this.selectedLabel = document.getElementById('chat-selected-label');
            this.grid = document.getElementById('chat-grid');
            this.collapseBtn = document.getElementById('chat-collapse-btn');
            this.selectToggle = document.getElementById('chat-select-toggle');
            this.editBtn = document.getElementById('chat-edit-btn');
            this.deleteBtn = document.getElementById('chat-delete-btn');
            this.emojiBtn = document.getElementById('chat-emoji-btn');
            this.emojiPanel = document.getElementById('chat-emoji-panel');
            this.contactSearchTerm = '';
            this.contacts = [];
            this.activeContactEmail = '';
            this.activeContactLabel = '';
            this.selectionMode = false;
            this.selectedIds = new Set();
            this.editingMessageId = null;
            this.currentUserEmail = localStorage.getItem('email') || localStorage.getItem('username') || '';
            this.currentUserNormalized = this.normalizeEmail(this.currentUserEmail);
            this.client = null;
            this.connected = false;
            this.connecting = false;
            this.swRegistration = null;
            this.refreshTimer = null;
            this.refreshInFlight = false;
            this.manualContacts = new Map();
            this.directory = [];
            this.logger = (...args) => console.log('[chat]', ...args);
            this.messageIds = new Set();
            this.pushError = '';
            this.adminUsersRequestPending = false;
            this.adminUsersLoadFailed = false;
            this.isPanelOpen = false;
            this.isEmojiOpen = false;
            this.messageMaxHeight = 200;
        }

        getAuthToken(options = { redirect: true }) {
            const token = localStorage.getItem('token') || '';
            if (!token && options.redirect) {
                window.location.href = 'landing.html';
            }
            return token;
        }

        init() {
            if (!this.view) {
                return;
            }
            this.logger('init');
            this.restoreReceiver();
            this.bindEvents();
            this.loadDirectoryUsers();
            this.refreshPushState();
            this.setPanelOpen(false);
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register(this.serviceWorkerPath).then(reg => {
                    this.swRegistration = reg;
                    this.refreshPushState();
                }).catch(error => {
                    console.warn('Service worker registration failed', error);
                });
            }
            this.initWebsocket();
            this.refreshMessages();
            this.refreshInboxMeta({ silent: true });
            this.startRefreshLoop();
        }

        restoreReceiver() {
            const stored = (localStorage.getItem('chat.receiver') || '').trim();
            if (stored) {
                this.activeContactEmail = stored;
            }
            this.logger('restoreReceiver', stored || '(none)');
            if (this.receiverInput) {
                this.receiverInput.value = stored;
            }
            this.updateSelectedLabel();
            this.receiverInput?.addEventListener('input', () => {
                const value = this.receiverInput.value.trim();
                if (value) {
                    localStorage.setItem('chat.receiver', value);
                } else {
                    localStorage.removeItem('chat.receiver');
                }
                const previousEmail = this.activeContactEmail;
                this.activeContactEmail = value;
                if (this.normalizeEmail(previousEmail) !== this.normalizeEmail(value)) {
                    this.activeContactLabel = '';
                }
                if (!value) {
                    this.activeContactLabel = '';
                }
                this.updateSelectedLabel();
                this.highlightActiveContact();
                this.renderFeed();
            });
        }

        bindEvents() {
            this.form?.addEventListener('submit', event => {
                event.preventDefault();
                this.submitChatMessage();
            });
            this.pushToggle?.addEventListener('click', () => this.handlePushToggle());
            this.pushTestBtn?.addEventListener('click', () => this.sendTestPush());
            this.contactsList?.addEventListener('click', event => {
                const item = event.target.closest('[data-contact-email]');
                if (!item) {
                    return;
                }
                const email = item.dataset.contactEmail;
                const contact = this.contacts.find(entry => entry.email === email);
                this.setActiveContact(contact || { email, label: email });
            });
            this.contactSearch?.addEventListener('input', () => {
                this.updateContactSearchTerm(this.contactSearch.value);
            });
            this.contactSearch?.addEventListener('search', () => {
                this.updateContactSearchTerm(this.contactSearch.value);
            });
            this.emojiBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleEmojiPanel();
            });
            document.addEventListener('click', (e) => {
                if (!this.emojiPanel || !this.emojiBtn) return;
                if (this.emojiPanel.hidden) return;
                if (this.emojiPanel.contains(e.target) || this.emojiBtn.contains(e.target)) {
                    return;
                }
                this.setEmojiPanelOpen(false);
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.emojiPanel && !this.emojiPanel.hidden) {
                    this.setEmojiPanelOpen(false);
                }
            });
            this.selectToggle?.addEventListener('click', () => {
                this.selectionMode = !this.selectionMode;
                if (!this.selectionMode) {
                    this.selectedIds.clear();
                    this.editingMessageId = null;
                    if (this.messageInput) {
                        this.messageInput.value = '';
                    }
                }
                this.updateSelectionActions();
                this.renderFeed();
            });
            this.editBtn?.addEventListener('click', () => this.startEditSelected());
            this.deleteBtn?.addEventListener('click', () => this.deleteSelected());
            this.collapseBtn?.addEventListener('click', () => this.setPanelOpen(!this.isPanelOpen));
            this.messageInput?.addEventListener('focus', () => this.setPanelOpen(true));
            this.messageInput?.addEventListener('keydown', event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    this.submitChatMessage();
                }
            });
            this.messageInput?.addEventListener('input', () => this.autoResizeMessage());
            this.autoResizeMessage();
            window.addEventListener('beforeunload', () => this.stopRefreshLoop());
        }

        render() {
            if (!this.view) {
                return;
            }
            this.renderContacts();
            this.renderFeed();
            this.updateSelectedLabel();
            this.highlightActiveContact();
        }

        renderPlaceholder(text) {
            if (!this.feed) {
                return;
            }
            const safeText = this.escapeHtml(text || 'Žádné zprávy zatím nemáme.');
            this.feed.innerHTML = `<p class="profile-muted chat-empty">${safeText}</p>`;
            this.scrollFeedToBottom();
        }

        hasPermission(code) {
            const permissions = this.state.data?.profile?.permissions;
            return Array.isArray(permissions) && permissions.includes(code);
        }

        setPanelOpen(open) {
            this.isPanelOpen = !!open;
            const grid = this.grid;
            if (grid) {
                grid.classList.toggle('chat-panel-open', this.isPanelOpen);
                grid.classList.toggle('chat-panel-collapsed', !this.isPanelOpen);
            }
            if (this.collapseBtn) {
                this.collapseBtn.setAttribute('aria-label', this.isPanelOpen ? 'Zavřít chat' : 'Otevřít chat');
                this.collapseBtn.title = this.isPanelOpen ? 'Zavřít chat' : 'Otevřít chat';
            }
        }

        loadDirectoryUsers() {
            if (this.adminUsersRequestPending) {
                return;
            }
            if (Array.isArray(this.state.adminUsers) && this.state.adminUsers.length) {
                return;
            }
            if (this.adminUsersLoadFailed) {
                return;
            }
            const token = this.getAuthToken({ redirect: false });
            if (!token) {
                return;
            }
            this.adminUsersRequestPending = true;
            this.logger('contacts:load directory contacts');
            fetch(this.apiUrl('/api/chat/contacts'), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }).then(async response => {
                if (!response.ok) {
                    throw new Error(await response.text());
                }
                const payload = await response.json();
                this.state.adminUsers = Array.isArray(payload) ? payload : [];
                this.logger('contacts:directory loaded', this.state.adminUsers.length);
                this.renderContacts();
                if (this.activeContactEmail) {
                    this.activeContactLabel = this.resolveDisplayLabel(this.activeContactEmail) || this.activeContactLabel;
                    this.updateSelectedLabel();
                    this.highlightActiveContact();
                }
            }).catch(error => {
                console.warn('contacts:directory fetch failed', error);
                this.adminUsersLoadFailed = true;
            }).finally(() => {
                this.adminUsersRequestPending = false;
            });
        }

        renderFeed() {
            if (!this.feed) {
                return;
            }
            const stick = this.isNearBottom();
            const messages = this.state.data.messages || [];
            const targetEmail = this.getActiveEmail();
            const filtered = targetEmail
                ? messages.filter(message => this.isConversationMessage(message, targetEmail))
                : messages;
            if (!filtered.length) {
                this.renderPlaceholder('Žádné zprávy zatím nemáme.');
                return;
            }
            const ordered = filtered.slice().reverse();
            this.feed.innerHTML = ordered.map(message => {
                const normalizedSender = this.normalizeEmail(message.sender);
                const isOutgoing = normalizedSender && normalizedSender === this.currentUserNormalized;
                const canSelect = isOutgoing || this.hasPermission('EDIT_MSGS');
                const checked = this.selectedIds.has(String(message.id));
                const selectionCheckbox = (this.selectionMode && canSelect) ? `
                    <label class="chat-select">
                        <input type="checkbox" data-message-id="${this.escapeHtml(message.id)}" ${checked ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                ` : '';
                return `
                <article class="chat-message ${isOutgoing ? 'chat-message-outgoing' : 'chat-message-incoming'}" data-message-id="${this.escapeHtml(message.id)}">
                    <div class="chat-meta">
                        ${selectionCheckbox}
                        <time>${this.escapeHtml(message.date || '')}</time>
                    </div>
                    <p>${this.escapeHtml(message.content || message.preview || '')}</p>
                </article>
            `;
            }).join('');
            if (this.selectionMode) {
                this.feed.querySelectorAll('input[type=\"checkbox\"][data-message-id]').forEach(input => {
                    input.addEventListener('change', (e) => {
                        const id = e.target.getAttribute('data-message-id');
                        if (!id) return;
                        if (e.target.checked) {
                            this.selectedIds.add(String(id));
                        } else {
                            this.selectedIds.delete(String(id));
                        }
                        this.updateSelectionActions();
                    });
                });
            }
            this.scrollFeedToBottom(stick);
        }

        renderContacts() {
            if (!this.contactsList) {
                return;
            }
            this.contacts = this.collectContacts();
            this.directory = this.collectDirectory();
            if (!this.directory.length) {
                this.loadDirectoryUsers();
            }
            const term = this.contactSearchTerm;
            const sourceList = term ? this.directory : this.contacts;
            const filtered = term
                ? sourceList.filter(contact => contact.search.includes(term))
                : sourceList;
            if (!filtered.length) {
                this.contactsList.innerHTML = `<p class="profile-muted">${term ? 'Žádné výsledky hledání.' : 'Zatím nemáte žádná vlákna.'}</p>`;
                return;
            }
            this.contactsList.innerHTML = filtered.map(contact => `
                <div class="chat-person${this.normalizeEmail(contact.email) === this.normalizeEmail(this.activeContactEmail) ? ' active' : ''}"
                     data-contact-email="${this.escapeHtml(contact.email)}"
                     data-initials="${this.escapeHtml(this.initials(contact.label || contact.email))}">
                    <div>
                        <strong>${this.escapeHtml(this.resolveDisplayLabel(contact.email) || contact.label || contact.email)}</strong>
                        <small>${this.escapeHtml(contact.email)}</small>
                        ${contact.preview ? `<p class="chat-person-preview">${this.escapeHtml(contact.preview)}</p>` : ''}
                    </div>
                </div>
            `).join('');
            this.highlightActiveContact();
        }

        updateContactSearchTerm(raw) {
            this.contactSearchTerm = (raw || '').trim().toLowerCase();
            this.renderContacts();
            if (!this.contactSearchTerm) {
                const active = this.normalizeEmail(this.activeContactEmail);
                const hasHistory = this.contacts.some(item => this.normalizeEmail(item.email) === active);
                if (active && !hasHistory) {
                    this.setActiveContact(null);
                }
            }
        }

        collectContacts() {
            const map = new Map();
            const directoryMap = this.buildDirectoryMap();
            (this.state.data.messages || []).forEach(message => {
                const peer = this.resolvePeerFromMessage(message);
                if (!peer) {
                    return;
                }
                const directoryInfo = directoryMap.get(this.normalizeEmail(peer.email));
                const displayLabel = directoryInfo?.label || peer.label || peer.email;
                const meta = directoryInfo?.meta || '';
                const descriptor = this.makeContactDescriptor(
                        peer.email,
                        displayLabel,
                        meta,
                        message.content || message.preview || '',
                        message.date || '',
                        true
                );
                if (!descriptor) {
                    return;
                }
                const key = this.normalizeEmail(descriptor.email);
                if (!map.has(key)) {
                    map.set(key, descriptor);
                }
            });
            this.manualContacts.forEach((descriptor, key) => {
                if (!map.has(key) && descriptor?.hasHistory) {
                    map.set(key, descriptor);
                }
            });
            return Array.from(map.values());
        }

        collectDirectory() {
            const map = new Map();
            const addDescriptor = (descriptor) => {
                if (!descriptor) {
                    return;
                }
                const key = this.normalizeEmail(descriptor.email);
                if (!key || key === this.currentUserNormalized || map.has(key)) {
                    return;
                }
                map.set(key, descriptor);
            };
            this.contacts.forEach(addDescriptor);
            this.manualContacts.forEach(descriptor => addDescriptor(descriptor));
            (Array.isArray(this.state.adminUsers) ? this.state.adminUsers : []).forEach(user => {
                if (!user?.email) {
                    return;
                }
                const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
                addDescriptor(this.makeContactDescriptor(
                        user.email,
                        fullName || user.email,
                        user.role || user.roleCode || 'Uživatel'
                ));
            });
            (this.state.data.customers || []).forEach(customer => {
                if (!customer?.email) {
                    return;
                }
                addDescriptor(this.makeContactDescriptor(
                        customer.email,
                        customer.name || customer.email,
                        'Zákazník'
                ));
            });
            return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'cs'));
        }

        buildDirectoryMap() {
            const map = new Map();
            (Array.isArray(this.state.adminUsers) ? this.state.adminUsers : []).forEach(user => {
                if (!user?.email) {
                    return;
                }
                const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
                map.set(this.normalizeEmail(user.email), {
                    label: fullName || user.email,
                    meta: user.role || user.roleCode || 'Uživatel'
                });
            });
            (this.state.data.customers || []).forEach(customer => {
                if (!customer?.email) {
                    return;
                }
                map.set(this.normalizeEmail(customer.email), {
                    label: customer.name || customer.email,
                    meta: 'Zákazník'
                });
            });
            return map;
        }

        setActiveContact(contact) {
            const descriptor = contact
                ? (contact.search ? contact : this.makeContactDescriptor(
                        contact.email,
                        contact.label || this.resolveDisplayLabel(contact.email) || contact.email,
                        contact.meta || '',
                        contact.preview || '',
                        contact.updated || '',
                        !!contact.hasHistory
                ))
                : null;
            if (descriptor) {
                this.activeContactEmail = descriptor.email;
                this.activeContactLabel = this.resolveDisplayLabel(descriptor.email) || descriptor.label || descriptor.email;
                const normalized = this.normalizeEmail(descriptor.email);
                if (normalized && !this.manualContacts.has(normalized) && !this.contacts.some(item => this.normalizeEmail(item.email) === normalized)) {
                    this.manualContacts.set(normalized, descriptor);
                }
            } else {
                this.activeContactEmail = '';
                this.activeContactLabel = '';
            }
            if (this.receiverInput) {
                this.receiverInput.value = this.activeContactEmail || '';
            }
            if (this.activeContactEmail) {
                localStorage.setItem('chat.receiver', this.activeContactEmail);
            } else {
                localStorage.removeItem('chat.receiver');
            }
            this.updateSelectedLabel();
            this.highlightActiveContact();
            this.renderFeed();
            this.refreshMessages({ force: true, silent: true });
            this.loadDirectoryUsers();
            this.setPanelOpen(!!this.activeContactEmail);
        }

        updateSelectedLabel() {
            if (!this.selectedLabel) {
                return;
            }
            const email = this.getActiveEmail();
            if (email) {
                const label = this.activeContactLabel || this.resolveDisplayLabel(email) || email;
                this.selectedLabel.textContent = `Komunikace s ${label}`;
            } else {
                this.selectedLabel.textContent = 'Vyberte kontakt vlevo nebo použijte vyhledávání.';
            }
        }

        getActiveEmail() {
            const inputValue = this.receiverInput?.value?.trim();
            const email = this.activeContactEmail || inputValue || '';
            return email.trim();
        }

        highlightActiveContact() {
            if (!this.contactsList) {
                return;
            }
            const active = this.normalizeEmail(this.activeContactEmail);
            this.contactsList.querySelectorAll('[data-contact-email]').forEach(item => {
                const email = this.normalizeEmail(item.dataset.contactEmail);
                item.classList.toggle('active', !!active && email === active);
            });
        }

        resolveDisplayLabel(email) {
            if (!email) return '';
            const normalized = this.normalizeEmail(email);
            const directoryMap = this.buildDirectoryMap();
            const fromDirectory = directoryMap.get(normalized)?.label;
            if (fromDirectory) {
                return fromDirectory;
            }
            const fromContacts = (this.contacts || []).find(item => this.normalizeEmail(item.email) === normalized);
            if (fromContacts?.label) {
                return fromContacts.label;
            }
            const fromManual = this.manualContacts.get(normalized);
            return fromManual?.label || '';
        }

        initials(label) {
            const text = (label || '').trim();
            if (!text) return '??';
            const parts = text.split(/\s+/).filter(Boolean);
            if (parts.length === 1) {
                return parts[0].slice(0, 2).toUpperCase();
            }
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }

        scrollFeedToBottom(force = false) {
            if (!this.feed) {
                return;
            }
            if (!force && !this.isNearBottom()) {
                return;
            }
            this.feed.scrollTop = this.feed.scrollHeight;
        }

        isNearBottom() {
            if (!this.feed) {
                return true;
            }
            const threshold = 120;
            return (this.feed.scrollTop + this.feed.clientHeight) >= (this.feed.scrollHeight - threshold);
        }

        async refreshInboxMeta(options = {}) {
            const token = this.getAuthToken({ redirect: false });
            if (!token) {
                return;
            }
            try {
                const response = await fetch(this.apiUrl('/api/chat/inbox'), {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
                if (!response.ok) {
                    throw new Error(await response.text());
                }
                const data = await response.json();
                if (typeof updateMessageSidebar === 'function') {
                    updateMessageSidebar(data);
                }
            } catch (error) {
                if (!options.silent) {
                    console.warn('refreshInboxMeta failed', error);
                }
            }
        }

        async refreshMessages(options = {}) {
            if (!this.view) {
                return;
            }
            const token = this.getAuthToken();
            if (!token) {
                return;
            }
            if (this.refreshInFlight && !options.force) {
                this.logger('refresh:skip', { reason: 'inflight', peer: this.getActiveEmail() });
                return;
            }
            this.refreshInFlight = true;
            this.logger('refresh:start', { peer: this.getActiveEmail(), force: !!options.force, silent: !!options.silent, inflight: this.refreshInFlight });
            try {
                const response = await fetch(this.apiUrl(`/api/chat/messages`), {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = 'landing.html';
                    return;
                }
                if (!response.ok) {
                    throw new Error(await response.text());
                }
                const payload = await response.json();
                if (Array.isArray(payload)) {
                    const existing = Array.isArray(this.state.data.messages) ? this.state.data.messages : [];
                    const preserved = existing;
                    const mapped = payload
                        .filter(m => m.content !== '__PUSH_SUBSCRIPTION__')
                        .map(message => ({
                            ...message,
                            preview: message.preview || message.content
                        }));

                    const keyFor = (msg) => {
                        if (!msg) return null;
                        if (msg.id) return `id:${msg.id}`;
                        const sender = this.normalizeEmail(msg.sender);
                        const receiver = this.normalizeEmail(msg.receiver);
                        const body = (msg.content || msg.preview || '').slice(0, 80);
                        const stamp = msg.date || msg.datumZasilani || '';
                        return `tmp:${sender}|${receiver}|${body}|${stamp}`;
                    };

                    const merged = [];
                    const seen = new Set();
                    const pushUnique = (msg) => {
                        const key = keyFor(msg);
                        if (!key || seen.has(key)) return;
                        seen.add(key);
                        merged.push(msg);
                    };

                    mapped.forEach(pushUnique);
                    preserved.forEach(pushUnique);

                    // Update ids set for WS dedup
                    this.messageIds = new Set();
                    merged.forEach(m => {
                        if (m.id) {
                            this.messageIds.add(m.id);
                        }
                    });

                    this.state.data.messages = merged;
                    this.renderContacts();
                    this.renderFeed();
                    this.updateSelectedLabel();
                    this.highlightActiveContact();
                    this.logger('refresh:success', { count: this.state.data.messages.length });
                }
            } catch (error) {
                this.logger('refresh:error', { message: error?.message, silent: !!options.silent });
                if (!options.silent) {
                    console.error('Failed to refresh chat messages', error);
                    if (!(this.state.data.messages || []).length) {
                        this.renderPlaceholder('Nepodařilo se načíst zprávy.');
                    }
                    this.setFormStatus('Nepodařilo se načíst zprávy.', false);
                }
            } finally {
                this.refreshInFlight = false;
                this.logger('refresh:done');
            }
        }

        startRefreshLoop() {
            this.stopRefreshLoop();
            const tick = async () => {
                // пытаемся восстановить WS, параллельно периодически пуллим сообщения/inbox
                if (!this.connected && !this.connecting) {
                    await this.initWebsocket();
                }
                await this.refreshMessages({ silent: true });
                await this.refreshInboxMeta({ silent: true });
            };
            tick();
            this.refreshTimer = setInterval(tick, 8000);
            this.logger('refreshLoop:enabled');
        }

        stopRefreshLoop() {
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
                this.refreshTimer = null;
                this.logger('refreshLoop:stopped');
            }
        }

        isConversationMessage(message, contactEmail) {
            const contact = this.normalizeEmail(contactEmail);
            const current = this.currentUserNormalized;
            if (!contact || !current) {
                return true;
            }
            const sender = this.normalizeEmail(message.sender);
            const receiver = this.normalizeEmail(message.receiver);
            return (sender === contact && receiver === current) || (sender === current && receiver === contact);
        }

        normalizeEmail(value) {
            return (value || '').toString().trim().toLowerCase();
        }

        setEmojiPanelOpen(open) {
            if (!this.emojiPanel || !this.emojiBtn) return;
            const isOpen = !!open;
            this.emojiPanel.hidden = !isOpen;
            this.emojiPanel.style.display = isOpen ? 'grid' : 'none';
            this.emojiBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            this.isEmojiOpen = isOpen;
        }

        toggleEmojiPanel() {
            if (!this.emojiPanel || !this.emojiBtn) return;
            const shouldOpen = !this.isEmojiOpen;
            if (shouldOpen) {
                this.populateEmojis();
            }
            this.setEmojiPanelOpen(shouldOpen);
        }

        populateEmojis() {
            if (!this.emojiPanel) return;
            if (this.emojiPanel.dataset.ready === '1') return;
            const emojis = [
                '😀','😁','😂','🤣','😊','😍','😘','😉','😎','🤔','😇','😅','🥰','🤩','🥳','🤯',
                '😭','😢','😤','😡','😴','🤗','🤭','😱','🤤','🤒','🤕','🤧','🤮','🤡','👀','🤝',
                '👍','👎','👏','🙏','🙌','✌️','🤞','👌','👊','💪','💅','🤙','🫶','🤲','🫰','🤌',
                '🔥','✨','🎉','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💯','✅','❗','❓',
                '⚡','🌟','🍀','☕','🍕','🍰','🎂','🍎','🍪','🍺','🥂','🍾','🚀','🏆','📌','📝'
            ];
            this.emojiPanel.innerHTML = emojis.map(e => `<button type="button" data-emoji="${e}">${e}</button>`).join('');
            this.emojiPanel.querySelectorAll('button[data-emoji]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.insertEmoji(btn.dataset.emoji);
                    // Панель оставляем открытой — закрывает только основная кнопка или клик вне.
                });
            });
            this.emojiPanel.dataset.ready = '1';
        }

        insertEmoji(emoji) {
            if (!emoji || !this.messageInput) return;
            const el = this.messageInput;
            const start = el.selectionStart ?? el.value.length;
            const end = el.selectionEnd ?? el.value.length;
            const before = el.value.slice(0, start);
            const after = el.value.slice(end);
            el.value = before + emoji + after;
            const pos = start + emoji.length;
            el.focus();
            el.selectionStart = el.selectionEnd = pos;
        }

        makeContactDescriptor(email, label, meta = '', preview = '', updated = '', hasHistory = false) {
            const rawEmail = (email || '').toString().trim();
            if (!rawEmail) {
                return null;
            }
            const resolvedLabel = (label || '').toString().trim() || rawEmail;
            const descriptor = {
                email: rawEmail,
                label: resolvedLabel,
                meta: meta,
                preview: preview || '',
                updated: updated || '',
                search: `${resolvedLabel.toLowerCase()} ${rawEmail.toLowerCase()}`,
                hasHistory: !!hasHistory
            };
            return descriptor;
        }

        updateSelectionActions() {
            if (!this.selectToggle || !this.editBtn || !this.deleteBtn) {
                return;
            }
            const count = this.selectedIds.size;
            this.selectToggle.classList.toggle('ghost-strong', this.selectionMode);
            this.editBtn.disabled = count !== 1;
            this.deleteBtn.disabled = count === 0;
        }

        startEditSelected() {
            if (this.selectedIds.size !== 1) {
                return;
            }
            const id = Array.from(this.selectedIds)[0];
            const msg = (this.state.data.messages || []).find(m => String(m.id) === String(id));
            if (!msg) {
                return;
            }
            this.editingMessageId = id;
            this.selectionMode = false;
            this.updateSelectionActions();
            if (this.messageInput) {
                this.messageInput.value = msg.content || msg.preview || '';
                this.messageInput.focus();
                this.autoResizeMessage();
            }
            const peer = this.normalizeEmail(msg.sender) === this.currentUserNormalized ? msg.receiver : msg.sender;
            if (peer && this.receiverInput) {
                this.receiverInput.value = peer;
                this.activeContactEmail = peer;
                this.updateSelectedLabel();
                this.highlightActiveContact();
            }
        }

        async deleteSelected() {
            if (!this.selectedIds.size) {
                return;
            }
            const token = this.getAuthToken();
            const ids = Array.from(this.selectedIds);
            for (const id of ids) {
                try {
                    const response = await fetch(this.apiUrl(`/api/chat/messages/${id}`), {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) {
                        console.warn('delete failed', id, response.status);
                    }
                } catch (error) {
                    console.warn('delete error', id, error);
                }
            }
            this.selectedIds.clear();
            this.selectionMode = false;
            this.updateSelectionActions();
            await this.refreshMessages({ force: true });
        }

        async patchMessage(id, content) {
            const token = this.getAuthToken();
            const response = await fetch(this.apiUrl(`/api/chat/messages/${id}`), {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });
            if (!response.ok) {
                throw new Error('Upravit zprávu se nepodařilo.');
            }
        }

        resolvePeerFromMessage(message) {
            const current = this.currentUserNormalized;
            const sender = message.sender || '';
            const receiver = message.receiver || '';
            const normalizedSender = this.normalizeEmail(sender);
            const normalizedReceiver = this.normalizeEmail(receiver);
            if (current && normalizedSender === current && receiver) {
                return { email: receiver, label: receiver };
            }
            if (current && normalizedReceiver === current && sender) {
                return { email: sender, label: sender };
            }
            if (!current && sender) {
                return { email: sender, label: sender };
            }
            return null;
        }

        isSameMessage(a, b) {
            if (!a || !b) {
                return false;
            }
            const senderA = this.normalizeEmail(a.sender);
            const receiverA = this.normalizeEmail(a.receiver);
            const senderB = this.normalizeEmail(b.sender);
            const receiverB = this.normalizeEmail(b.receiver);
            return senderA === senderB && receiverA === receiverB && (a.content || a.preview || '') === (b.content || b.preview || '');
        }

        truncateWords(text, limit) {
            if (!text) {
                return '';
            }
            const words = text.trim().split(/\s+/);
            if (words.length <= limit) {
                return text.trim();
            }
            return words.slice(0, limit).join(' ') + ' …';
        }

        async showSystemNotification(message) {
            if (!this.pushEnabled) {
                return;
            }
            // Дополнительный триггер системного уведомления (как кнопка Test), чтобы убедиться, что OS рендерит баннер.
            try {
                const current = this.currentUserNormalized;
                const senderNormalized = this.normalizeEmail(message.sender);
                if (current && senderNormalized === current) {
                    return; // не дублируем свои сообщения
                }
                if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
                    this.logger('push:local skip', { reason: 'permission', permission: Notification?.permission });
                    return;
                }
                const registration = await this.getServiceWorkerRegistration();
                const title = message.sender || 'Nová zpráva';
                const body = this.truncateWords(message.content || message.preview || '', 12);
                this.logger('push:local show', { title, body });
                await registration.showNotification(title, {
                    body,
                    tag: `bdas-local-${Date.now()}`,
                    renotify: false
                });
            } catch (error) {
                console.warn('push:local failed', error);
            }
        }

        async sendTestPush() {
            try {
                this.logger('push:test start');
                const registration = await this.getServiceWorkerRegistration();
                const permission = Notification.permission === 'granted'
                    ? 'granted'
                    : await Notification.requestPermission();
                this.logger('push:test permission', permission);
                if (permission !== 'granted') {
                    alert('Povolte prosím notifikace v prohlížeči.');
                    return;
                }
                await registration.showNotification('Test push', {
                    body: 'Tohle je ukázkové upozornění z aplikace.',
                    tag: `bdas-test-${Date.now()}`,
                    renotify: false
                });
                this.logger('push:test shown');
            } catch (error) {
                console.error('Test push failed', error);
                alert(error.message || 'Test push se nepodařil.');
            }
        }

        async refreshPushState() {
            if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
                this.pushToggleLocked = true;
                this.pushError = 'Push nepodporuje prohlížeč.';
                this.setPushToggleState(false, 'Push nedostupný');
                return;
            }
            try {
                const registration = await this.getServiceWorkerRegistration();
                const subscription = await registration.pushManager.getSubscription();
                const isGranted = Notification.permission === 'granted';
                this.pushToggleLocked = false;
                this.pushError = '';
                this.setPushToggleState(isGranted && !!subscription);
                this.logger('push:state', { granted: isGranted, subscribed: !!subscription });
            } catch (error) {
                console.warn('Failed to refresh push state', error);
                this.pushError = error?.message || 'Push není dostupný.';
                this.pushToggleLocked = true;
                this.setPushToggleState(false, 'Push nedostupný');
            }
        }

        setPushToggleState(enabled, labelOverride) {
            this.pushEnabled = !!enabled;
            if (this.pushToggle) {
                this.pushToggle.classList.toggle('active', this.pushEnabled);
                this.pushToggle.setAttribute('aria-checked', this.pushEnabled ? 'true' : 'false');
                this.pushToggle.classList.toggle('disabled', !!this.pushToggleLocked);
            }
            if (this.pushToggleLabel) {
                this.pushToggleLabel.textContent = labelOverride || (this.pushEnabled ? 'Push on' : 'Push off');
            }
            const body = document.body;
            if (body) {
                body.classList.toggle('push-enabled', this.pushEnabled);
            }
        }

        async handlePushToggle() {
            if (this.pushToggleLocked || this.pushToggleLoading) {
                if (this.pushError) {
                    alert(this.pushError);
                }
                return;
            }
            this.logger('push:toggle click', { enabled: this.pushEnabled });
            this.pushToggleLoading = true;
            this.pushToggle?.classList.add('loading');
            try {
                if (this.pushEnabled) {
                    await this.unsubscribeFromPush();
                    this.setPushToggleState(false);
                } else {
                    await this.subscribeToPush();
                    this.setPushToggleState(true);
                }
                await this.refreshPushState();
            } catch (error) {
                console.error('Push toggle failed', error);
                alert(error.message || 'Nepodařilo se změnit stav push upozornění.');
            } finally {
                this.pushToggleLoading = false;
                this.pushToggle?.classList.remove('loading');
            }
        }

        async subscribeToPush() {
            if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
                throw new Error('Prohlížeč nepodporuje push notifikace.');
            }
            const token = this.getAuthToken();
            const username = localStorage.getItem('username') || localStorage.getItem('email');
            if (!token || !username) {
                throw new Error('Pro přihlášení odběru se nejdřív přihlaste.');
            }
            this.logger('push:subscribe request');
            const registration = await this.getServiceWorkerRegistration();
            const permission = await Notification.requestPermission();
            this.logger('push:permission', permission);
            if (permission !== 'granted') {
                this.setPushToggleState(false, 'Povolte push v prohlížeči');
                throw new Error('Povolení pro upozornění bylo zamítnuto. Povolit v nastavení prohlížeče.');
            }
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.publicKey)
            });
            await this.sendSubscriptionToServer(subscription, token, username);
            this.logger('push:subscribe success');
            this.pushError = '';
        }

        async unsubscribeFromPush() {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                return;
            }
            this.logger('push:unsubscribe request');
            const registration = await this.getServiceWorkerRegistration();
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
            }
            const token = this.getAuthToken({ redirect: false });
            if (token) {
                try {
                    await fetch(this.apiUrl('/api/push/unsubscribe'), {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    this.logger('push:unsubscribe server cleanup done');
                } catch (error) {
                    console.warn('Failed to notify server about push unsubscribe', error);
                }
            }
        }

        async getServiceWorkerRegistration() {
            if (this.swRegistration) {
                return this.swRegistration;
            }
            try {
                this.swRegistration = await navigator.serviceWorker.register(this.serviceWorkerPath);
            } catch (error) {
                this.pushError = error?.message || 'Service worker se nepodařilo zaregistrovat.';
                this.pushToggleLocked = true;
                this.setPushToggleState(false, 'Push nedostupný');
                throw error;
            }
            return this.swRegistration;
        }

        async sendSubscriptionToServer(subscription, token, username) {
            const payload = {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: this.bufferToBase64(subscription.getKey('p256dh')),
                    auth: this.bufferToBase64(subscription.getKey('auth'))
                },
                username
            };
            const response = await fetch(this.apiUrl('/api/push/subscribe'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error('Server odběr odmítl.');
            }
            this.logger('push:server subscription stored');
            this.pushError = '';
        }

        bufferToBase64(buffer) {
            if (!buffer) {
                return '';
            }
            let binary = '';
            const bytes = new Uint8Array(buffer);
            bytes.forEach(byte => {
                binary += String.fromCharCode(byte);
            });
            return btoa(binary);
        }

        urlBase64ToUint8Array(base64String) {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
        }

        async initWebsocket() {
            if (!this.view || this.connected || this.connecting) {
                return;
            }
            const token = this.getAuthToken({ redirect: false });
            if (!token) {
                return;
            }
            this.connecting = true;
            try {
                this.logger('websocket:init');
                await this.ensureSocketLibs();
                const socket = new window.SockJS(this.apiUrl('/ws'));
                this.client = window.Stomp.over(socket);
                if (this.client) {
                    this.client.debug = null;
                }
                this.client?.connect(
                    { Authorization: `Bearer ${token}` },
                    () => {
                        this.connected = true;
                        this.logger('websocket:connected');
                        this.client.subscribe('/topic/messages', payload => this.handleIncomingMessage(payload));
                    },
                    error => {
                        console.warn('Chat connection error', error);
                        this.logger('websocket:error', error?.message || 'unknown');
                        this.connected = false;
                    }
                );
            } catch (error) {
                console.error('Failed to init websocket', error);
            } finally {
                this.connecting = false;
            }
        }

        async ensureSocketLibs() {
            if (!window.SockJS) {
                await this.injectScript('https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js');
            }
            if (!window.Stomp) {
                await this.injectScript('https://cdn.jsdelivr.net/npm/stompjs@2.3.3/lib/stomp.min.js');
            }
        }

        injectScript(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Script load failed: ${src}`));
                document.head.appendChild(script);
            });
        }

        handleIncomingMessage(payload) {
            if (!payload?.body) {
                return;
            }
            try {
                const data = JSON.parse(payload.body);
                const body = data.content || data.preview || '';
                const message = {
                    id: data.id || data.messageId,
                    sender: data.sender?.email || data.senderEmail || data.sender || 'Neznámý',
                    receiver: data.receiver?.email || data.receiverEmail || data.receiver || 'Broadcast',
                    content: body,
                    preview: body,
                    date: data.datumZasilani
                        ? new Date(data.datumZasilani).toLocaleString('cs-CZ')
                        : new Date().toLocaleString('cs-CZ')
                };
                const normalizedSender = this.normalizeEmail(message.sender);
                const normalizedReceiver = this.normalizeEmail(message.receiver);
                if (message.content === '__PUSH_SUBSCRIPTION__') {
                    this.logger('websocket:skip-marker');
                    return;
                }
                if (this.currentUserNormalized && normalizedSender !== this.currentUserNormalized && normalizedReceiver !== this.currentUserNormalized) {
                    this.logger('websocket:ignore-foreign', { sender: normalizedSender, receiver: normalizedReceiver });
                    return;
                }
                // Dedup: remove any existing optimistic copy of the same message and skip already delivered IDs
                if (message.id && this.messageIds.has(message.id)) {
                    this.logger('websocket:skip-duplicate', message.id);
                    return;
                }
                this.state.data.messages = (this.state.data.messages || []).filter(existing => {
                    if (message.id) {
                        if (existing.id && existing.id === message.id) {
                            return false;
                        }
                        const isTemp = typeof existing.id === 'string' && existing.id.startsWith('temp-');
                        if (existing.id && isTemp && this.isSameMessage(existing, message)) {
                            return false;
                        }
                        if (!existing.id && this.isSameMessage(existing, message)) {
                            return false;
                        }
                        return true;
                    }
                    return !this.isSameMessage(existing, message);
                });
                if (message.id) {
                    this.messageIds.add(message.id);
                }
                this.state.data.messages = [message, ...(this.state.data.messages || [])];
                this.renderContacts();
                this.renderFeed();
                this.highlightActiveContact();
                this.logger('websocket:received', message);
                this.showSystemNotification(message);
                this.refreshInboxMeta({ silent: true });
            } catch (error) {
                console.warn('Failed to parse incoming chat message', error);
            }
        }

        async submitChatMessage(customPayload = null) {
            if (!this.view) {
                return false;
            }
            const content = (customPayload?.content ?? this.messageInput?.value ?? '').trim();
            const receiver = (customPayload?.receiver ?? this.receiverInput?.value ?? '').trim();
            if (!content) {
                this.setFormStatus('Zpráva je prázdná.', false);
                return false;
            }
            if (!receiver) {
                this.setFormStatus('Vyplňte prosím adresáta.', false);
                return false;
            }
            const token = this.getAuthToken();
            if (!token) {
                return false;
            }
            try {
                if (this.editingMessageId) {
                    await this.patchMessage(this.editingMessageId, content);
                    this.editingMessageId = null;
                    this.selectedIds.clear();
                    this.selectionMode = false;
                    this.updateSelectionActions();
                    if (this.messageInput) {
                        this.messageInput.value = '';
                        this.autoResizeMessage();
                    }
                    await this.refreshMessages({ force: true });
                    this.setFormStatus('✓ Upraveno', true);
                    return true;
                } else {
                    if (!this.connected) {
                        await this.initWebsocket();
                    }
                    if (!this.client || !this.connected) {
                        throw new Error('Spojení s chatem není dostupné.');
                    }
                    this.logger('send:payload', { receiver, length: content.length });
                    this.client.send('/app/chat', { Authorization: `Bearer ${token}` }, JSON.stringify({ content, receiver }));
                    if (!customPayload && this.messageInput) {
                        this.messageInput.value = '';
                        this.autoResizeMessage();
                    }
                    const optimisticMessage = {
                        id: `temp-${Date.now()}`,
                        sender: this.state.data.profile?.email || this.currentUserEmail || localStorage.getItem('email') || 'já',
                        receiver,
                        content,
                        preview: content,
                        date: new Date().toLocaleString('cs-CZ')
                    };
                    // remove any previous optimistic duplicates for the same text/receiver before adding
                    this.state.data.messages = (this.state.data.messages || []).filter(existing => !(!existing.id && this.isSameMessage(existing, optimisticMessage)));
                    this.state.data.messages = [optimisticMessage, ...(this.state.data.messages || [])];
                    this.messageIds.add(optimisticMessage.id);
                    this.renderContacts();
                    this.renderFeed();
                    this.highlightActiveContact();
                    this.setFormStatus('✓ Odesláno', true);
                    this.logger('send:optimistic', optimisticMessage);
                    return true;
                }
            } catch (error) {
                console.error('Chat send failed', error);
                this.setFormStatus(error.message || 'Odeslání selhalo.', false);
                return false;
            }
        }

        setFormStatus(text, success) {
            if (!this.formStatus) {
                return;
            }
            this.formStatus.textContent = text;
            this.formStatus.classList.toggle('chat-status-success', !!success);
        }

        autoResizeMessage() {
            if (!this.messageInput) return;
            const el = this.messageInput;
            el.style.height = 'auto';
            const max = this.messageMaxHeight || 200;
            const next = Math.min(el.scrollHeight, max);
            el.style.height = `${next}px`;
            el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
        }

        escapeHtml(text) {
            if (text === undefined || text === null) {
                return '';
            }
            const str = typeof text === 'string' ? text : String(text);
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    }

    class CustomerModule {
        constructor(state) {
            this.state = state;
            this.categoryContainer = document.getElementById('customer-category-chips');
            this.searchInput = document.getElementById('customer-search');
            this.grid = document.getElementById('customer-product-grid');
            this.cartEls = Array.from(document.querySelectorAll('[data-customer-cart]'));
            this.cartCountEl = document.getElementById('customer-cart-count');
            this.suggestionsEl = document.getElementById('customer-suggestions');
        }

        init() {
            if (!this.state.customerCartLoaded) {
                this.state.customerCart = this.loadCart();
                this.state.customerCartLoaded = true;
            }
            this.state.customerSearchTerm = this.state.customerSearchTerm || '';
            if (this.categoryContainer) {
                this.categoryContainer.addEventListener('click', event => {
                    const btn = event.target.closest('button[data-category]');
                    if (!btn) return;
                    this.state.customerCategoryFilter = btn.dataset.category;
                    this.render();
                });
            }
            if (this.searchInput) {
                this.searchInput.value = this.state.customerSearchTerm;
                this.searchInput.addEventListener('input', () => {
                    this.state.customerSearchTerm = this.searchInput.value.trim();
                    this.render();
                });
            }
            this.grid?.addEventListener('click', event => {
                const btn = event.target.closest('button[data-add-product]');
                if (!btn) return;
                const sku = btn.dataset.addProduct;
                if (!sku) return;
                this.addToCart(sku, {
                    sku,
                    name: btn.dataset.name,
                    price: Number(btn.dataset.price) || 0
                });
            });
            this.cartEls.forEach(cartEl => {
                cartEl.addEventListener('click', event => {
                    const minus = event.target.closest('[data-cart-minus]');
                    const plus = event.target.closest('[data-cart-plus]');
                    if (minus) {
                        this.updateQty(minus.dataset.cartMinus, -1);
                        return;
                    }
                    if (plus) {
                        this.updateQty(plus.dataset.cartPlus, 1);
                        return;
                    }
                    if (event.target.matches('[data-clear-cart]')) {
                        this.state.customerCart = [];
                        this.saveCart();
                        this.render();
                        return;
                    }
                });
            });
        }

        addToCart(sku, fallback = {}) {
            if (!sku) return;
            const product = this.state.data.customerProducts.find(item => item.sku === sku) || {
                sku,
                name: fallback.name || sku,
                price: fallback.price || 0
            };
            const existing = this.state.customerCart.find(item => item.sku === sku);
            if (existing) {
                existing.qty += 1;
            } else {
                this.state.customerCart.push({ sku, name: product.name, price: product.price, qty: 1 });
            }
            this.saveCart();
            this.render();
        }

        updateQty(sku, delta) {
            const item = this.state.customerCart.find(row => row.sku === sku);
            if (!item) return;
            item.qty += delta;
            if (item.qty <= 0) {
                this.state.customerCart = this.state.customerCart.filter(row => row.sku !== sku);
            }
            this.saveCart();
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
            const categories = ['all', ...new Set(this.state.data.customerProducts.map(prod => prod.category || 'Bez kategorie'))];
            this.categoryContainer.innerHTML = categories.map(category => `
                <button class="chip ${this.state.customerCategoryFilter === category ? 'active' : ''}" data-category="${category}">
                    ${category === 'all' ? 'Vse' : category}
                </button>
            `).join('');
        }

        renderProducts() {
            if (!this.grid) return;
            const filter = this.state.customerCategoryFilter;
            const term = (this.state.customerSearchTerm || '').toLowerCase();
            const products = this.state.data.customerProducts
                .filter(prod => filter === 'all' || (prod.category || 'Bez kategorie') === filter)
                .filter(prod => {
                    if (!term) return true;
                    const name = (prod.name || '').toLowerCase();
                    const sku = (prod.sku || '').toLowerCase();
                    const description = (prod.description || '').toLowerCase();
                    return name.includes(term) || sku.includes(term) || description.includes(term);
                });
            if (!products.length) {
                this.grid.innerHTML = '<p>Zadne produkty pro zadany filtr.</p>';
                return;
            }
            this.grid.innerHTML = products.map(prod => `
                <article class="product-card">
                    <div class="product-icon">${prod.image || '🛒'}</div>
                    <div>
                        <strong>${prod.name}</strong>
                        <p>${prod.description}</p>
                    </div>
                    <div class="product-meta">
                        <span>${prod.category}</span>
                        <span class="badge">${prod.badge || ''}</span>
                    </div>
                    <div class="product-footer">
                        <strong>${currencyFormatter.format(prod.price)}</strong>
                        <button type="button" data-add-product="${prod.sku}" data-name="${prod.name}" data-price="${prod.price}">Do kosiku</button>
                    </div>
                </article>
            `).join('');
        }

        renderCart() {
            const cart = this.state.customerCart;
            const itemsCount = cart.reduce((sum, item) => sum + item.qty, 0);
            if (this.cartCountEl) {
                this.cartCountEl.textContent = itemsCount;
            }
            if (!this.cartEls.length) return;
            if (!cart.length) {
                this.cartEls.forEach(el => el.innerHTML = '<p>Kosik je prazdny.</p>');
                return;
            }
            const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
            const markup = `
                <div class="cart-card">
                    <ul>
                        ${cart.map(item => `
                            <li class="cart-line">
                                <div>
                                    <strong>${item.name}</strong>
                                    <p style="margin:0;">${item.sku}</p>
                                </div>
                                <div class="cart-qty">
                                    <button type="button" data-cart-minus="${item.sku}" aria-label="Odebrat">-</button>
                                    <span>${item.qty}</span>
                                    <button type="button" data-cart-plus="${item.sku}" aria-label="Pridat">+</button>
                                </div>
                                <span>${currencyFormatter.format(item.price * item.qty)}</span>
                            </li>
                        `).join('')}
                    </ul>
                    <div class="cart-total">
                        <strong>Celkem</strong>
                        <span>${currencyFormatter.format(total)}</span>
                    </div>
                    <div class="cart-actions">
                        <button data-clear-cart type="button">Vyprzdnit</button>
                        <a class="cart-submit" data-view="customer-payment" href="pay.html">Zaplatit</a>
                    </div>
                </div>`;
            this.cartEls.forEach(el => el.innerHTML = markup);
        }

        renderSuggestions() {
            if (!this.suggestionsEl) return;
            this.suggestionsEl.innerHTML = this.state.data.customerSuggestions.map(text => `
                <div class="pill-card">
                    <p>${text}</p>
                </div>
            `).join('');
        }

        loadCart() {
            try {
                const raw = localStorage.getItem('customerCart');
                if (!raw) return [];
                const parsed = JSON.parse(raw);
                if (!Array.isArray(parsed)) return [];
                return parsed.filter(item => item?.sku).map(item => ({
                    sku: item.sku,
                    name: item.name || item.sku,
                    price: Number(item.price) || 0,
                    qty: Number(item.qty) || 0
                })).filter(item => item.qty > 0);
            } catch (e) {
                console.warn('Failed to load cart from storage', e);
                return [];
            }
        }

        saveCart() {
            try {
                localStorage.setItem('customerCart', JSON.stringify(this.state.customerCart));
            } catch (e) {
                console.warn('Failed to save cart', e);
            }
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
            this.messagePoller = null;
            const allowedViews = resolveAllowedViews(localStorage.getItem('role') || this.state.data.profile?.role, this.state.data.profile?.permissions);
            this.authGuard = new AuthGuard(state);
            this.navigation = new NavigationController(state, meta, {
                allowedViews,
                defaultView: 'dashboard',
                onBlocked: () => alert('Na tuto sekci nemáte přístup. Přesměrovávám na Přehled.')
            });
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
            this.dbObjects = new DbObjectsModule(state, { apiUrl });
            this.usersModule = new UsersModule(state, {
                apiUrl,
                refreshApp: () => this.refreshData()
            });
            this.inventory = new InventoryModule(state);
            this.orders = new OrdersModule(state);
            this.people = new PeopleModule(state);
            this.finance = new FinanceModule(state);
            this.records = new RecordsModule(state);
        this.chat = new ChatModule(state, {
            apiUrl,
            publicKey: webpushPublicKey,
            serviceWorkerPath
        });
        this.customer = new CustomerModule(state);
        this.customerOrders = new CustomerOrdersView(state, currencyFormatter);
        this.search = new GlobalSearch(state);
        }

        init() {
            if (!this.authGuard.enforce()) {
                return;
            }
            this.navigation.init();
            this.permissionsModule.init();
            this.dbObjects.init();
            this.usersModule.init();
            this.inventory.init();
            this.orders.init();
            this.people.init();
            this.finance.init();
            this.records.init();
            this.chat.init();
            this.customer.init();
            this.customerOrders.render();
            this.search.init();
            this.registerUtilityButtons();
            this.renderAll();
            this.startMessagePolling();
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
                    if (restoreOriginalSession()) {
                        window.location.reload();
                    }
                });
                this.renderImpersonationChip(isImpersonating);
            } else {
                this.renderImpersonationChip(false);
            }
        }

        renderImpersonationChip(isImpersonating) {
            const chipId = 'impersonation-return-chip';
            const existing = document.getElementById(chipId);
            if (!isImpersonating) {
                existing?.remove();
                return;
            }
            if (existing) {
                return;
            }
            const chip = document.createElement('button');
            chip.id = chipId;
            chip.type = 'button';
            chip.textContent = '← Zpět k původnímu účtu';
            chip.style.position = 'fixed';
            chip.style.right = '20px';
            chip.style.bottom = '20px';
            chip.style.padding = '14px 20px';
            chip.style.borderRadius = '16px';
            chip.style.border = 'none';
            chip.style.background = 'linear-gradient(120deg, #4361ee, #6c63ff)';
            chip.style.color = '#fff';
            chip.style.boxShadow = '0 14px 32px rgba(67,97,238,0.35)';
            chip.style.fontSize = '15px';
            chip.style.cursor = 'pointer';
            chip.style.fontWeight = '600';
            chip.style.zIndex = '999';
            chip.style.transition = 'transform 0.15s ease, box-shadow 0.2s ease';
            chip.addEventListener('mouseenter', () => {
                chip.style.transform = 'translateY(-1px)';
                chip.style.boxShadow = '0 18px 38px rgba(67,97,238,0.4)';
            });
            chip.addEventListener('mouseleave', () => {
                chip.style.transform = 'translateY(0)';
                chip.style.boxShadow = '0 14px 32px rgba(67,97,238,0.35)';
            });
            chip.addEventListener('click', () => {
                if (restoreOriginalSession()) {
                    window.location.reload();
                }
            });
            document.body.appendChild(chip);
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
            updateMessageSidebar(this.state.data);
            this.renderAll();
            return true;
        }

        startMessagePolling() {
            const poll = async () => {
                try {
                    const snapshot = await fetchDashboardSnapshot();
                    if (!snapshot) {
                        return;
                    }
                    this.state.data.unreadMessages = snapshot.unreadMessages ?? this.state.data.unreadMessages;
                    this.state.data.lastMessageSummary = snapshot.lastMessageSummary ?? this.state.data.lastMessageSummary;
                    this.state.data.messages = snapshot.messages ?? this.state.data.messages;
                    updateMessageSidebar(this.state.data);
                } catch (err) {
                    console.warn('Message poll failed', err);
                }
            };
            poll();
            if (this.messagePoller) {
                clearInterval(this.messagePoller);
            }
            this.messagePoller = setInterval(poll, 20000);
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
            this.chat.render();
            this.customer.render();
            this.permissionsModule.render();
        }
    }

    document.addEventListener('DOMContentLoaded', bootstrapConsole);


    class PaymentModule {
        constructor(state, opts) {
            this.state = state;
            this.apiUrl = opts.apiUrl;
            this.form = document.getElementById('payment-form');
            this.totalEl = document.getElementById('payment-total');
            this.cashGiven = document.getElementById('cash-given');
            this.cashChange = document.getElementById('cash-change');
            this.cardNumber = document.getElementById('card-number');
            this.cashSection = document.getElementById('cash-section');
            this.cardSection = document.getElementById('card-section');
            this.statusEl = document.getElementById('payment-status');
            this.backBtn = document.getElementById('payment-back');
        }

        init() {
            if (!this.form) return;
            if (!this.state.customerCart.length) {
                if (this.statusEl) {
                    this.statusEl.textContent = 'Kosik je prazdny. Vratte se a pridejte zbozi.';
                }
                this.form.querySelector('button[type="submit"]')?.setAttribute('disabled', 'disabled');
                return;
            }
            this.renderTotal();
            this.form.addEventListener('change', () => {
                this.updateMethod();
                this.updateChange();
            });
            this.form.addEventListener('input', () => this.updateChange());
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            this.backBtn?.addEventListener('click', () => {
                window.location.href = 'cart.html';
            });
            this.updateMethod();
            this.updateChange();
        }

        renderTotal() {
            const total = this.state.customerCart.reduce((sum, item) => sum + item.price * item.qty, 0);
            this.totalEl.textContent = currencyFormatter.format(total);
            this.totalAmount = total;
        }

        updateMethod() {
            const method = new FormData(this.form).get('paymentType');
            const isCash = method === 'CASH';
            this.cashSection.style.display = isCash ? 'block' : 'none';
            this.cardSection.style.display = isCash ? 'none' : 'block';
            this.cashGiven.required = isCash;
            this.cardNumber.required = !isCash;
        }

        updateChange() {
            const method = new FormData(this.form).get('paymentType');
            if (method !== 'CASH') {
                this.cashChange.textContent = currencyFormatter.format(0);
                return;
            }
            const given = Number(this.cashGiven.value || 0);
            const change = Math.max(0, given - this.totalAmount);
            this.cashChange.textContent = currencyFormatter.format(change);
        }

        async handleSubmit(event) {
            event.preventDefault();
            const method = new FormData(this.form).get('paymentType');
            const payload = {
                items: this.state.customerCart.map(item => ({ sku: item.sku, qty: item.qty })),
                paymentType: method,
                cashGiven: method === 'CASH' ? Number(this.cashGiven.value || 0) : null,
                cardNumber: method === 'CARD' ? (this.cardNumber.value || '').replace(/\s+/g, '') : null,
                note: ''
            };
            this.statusEl.textContent = 'Zpracovavam platbu...';
            this.statusEl.classList.remove('chat-status-success');
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(this.apiUrl('/api/customer/checkout'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'Platbu se nepodarilo dokoncit.');
                }
                this.state.customerCart = [];
                try { localStorage.removeItem('customerCart'); } catch (e) {}
                this.statusEl.textContent = 'Objednavka a platba byly ulozeny.';
                this.statusEl.classList.add('chat-status-success');
            } catch (error) {
                this.statusEl.textContent = error.message;
            }
        }
    }

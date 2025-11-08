const currencyFormatter = new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0
});

const state = {
    activeView: 'dashboard',
    inventoryFilter: 'all',
    paymentFilter: 'all',
    selectedOrderId: null,
    selectedFolder: null,
    customerCategoryFilter: 'all',
    customerCart: [],
    data: {
        syncUpdatedAt: '2024-11-10 06:45',
        weeklyDemand: [
            { label: 'Po', value: 920 },
            { label: 'Út', value: 860 },
            { label: 'St', value: 1040 },
            { label: 'Čt', value: 780 },
            { label: 'Pá', value: 1260 },
            { label: 'So', value: 1420 },
            { label: 'Ne', value: 1180 }
        ],
        inventory: [
            { sku: 'SKU-70423', name: 'Organická jablka Pink Lady', category: 'Čerstvé produkty', warehouse: 'CZ-PRG1', supermarket: 'Praha Anděl', supplier: 'Farma Liška', stock: 860, minStock: 200, leadTime: '24 h', status: 'ok' },
            { sku: 'SKU-18590', name: 'Bio kefír 1 l', category: 'Mléčné výrobky', warehouse: 'CZ-BRN2', supermarket: 'Brno Olympia', supplier: 'Madeta', stock: 140, minStock: 180, leadTime: '48 h', status: 'critical' },
            { sku: 'SKU-90011', name: 'Káva BDAS Signature 500 g', category: 'Nápoje', warehouse: 'CZ-OST2', supermarket: 'Ostrava Avion', supplier: 'BDAS Roast Lab', stock: 92, minStock: 80, leadTime: '72 h', status: 'ok' },
            { sku: 'SKU-66770', name: 'Bezlepkový chléb 700 g', category: 'Pečivo', warehouse: 'CZ-PRG1', supermarket: 'Praha Anděl', supplier: 'BezLepek s.r.o.', stock: 45, minStock: 90, leadTime: '36 h', status: 'critical' },
            { sku: 'SKU-50888', name: 'Kompostovatelné pytle 30 l', category: 'Non-Food', warehouse: 'CZ-OST2', supermarket: 'Ostrava Avion', supplier: 'EcoPack', stock: 1650, minStock: 400, leadTime: '96 h', status: 'ok' },
            { sku: 'SKU-40220', name: 'Český lipový med 450 g', category: 'Delikatesy', warehouse: 'CZ-BRN2', supermarket: 'Brno Olympia', supplier: 'Med.cz', stock: 260, minStock: 120, leadTime: '72 h', status: 'ok' },
            { sku: 'SKU-30010', name: 'Lososí filet chlazený', category: 'Čerstvé produkty', warehouse: 'CZ-PRG1', supermarket: 'Praha Anděl', supplier: 'Nordic Sea', stock: 180, minStock: 120, leadTime: '24 h', status: 'notice' }
        ],
        categories: [
            { name: 'Čerstvé produkty', assortment: 112, turnover: '+12 %', manager: 'Filip Janda' },
            { name: 'Mléčné výrobky', assortment: 38, turnover: '+4 %', manager: 'Eva Cerná' },
            { name: 'Non-Food', assortment: 57, turnover: '+18 %', manager: 'Veronika Slámová' },
            { name: 'Delikatesy', assortment: 24, turnover: '+7 %', manager: 'Adam Kovář' }
        ],
        warehouses: [
            { id: 'CZ-PRG1', name: 'Praha Anděl Darkstore', capacity: 120000, used: 78, contact: '+420 600 123 456' },
            { id: 'CZ-BRN2', name: 'Brno Olympia Hub', capacity: 90000, used: 66, contact: '+420 720 333 210' },
            { id: 'CZ-OST2', name: 'Ostrava Fulfillment', capacity: 75000, used: 82, contact: '+420 700 555 011' }
        ],
        orders: [
            { id: 'PO-45078', type: 'B2B', store: 'Praha Anděl', employee: 'Marek Havel', supplier: 'Danone CZ', status: 'Na cestě', statusCode: 'IN_TRANSIT', date: '2024-11-08T10:30', amount: 412500, priority: 'high' },
            { id: 'PO-45079', type: 'Click&Collect', store: 'Brno Olympia', employee: 'Lenka Kubová', supplier: 'FreshBox', status: 'Kompletace', statusCode: 'PICKING', date: '2024-11-09T08:00', amount: 18540, priority: 'medium' },
            { id: 'PO-45060', type: 'Transfer', store: 'Ostrava Avion', employee: 'Jan Mareš', supplier: 'Internal', status: 'Příjem', statusCode: 'INBOUND', date: '2024-11-07T14:45', amount: 95680, priority: 'medium' },
            { id: 'PO-44998', type: 'B2B', store: 'Plzeň Bory', employee: 'Iveta Malá', supplier: 'Nestlé CZ', status: 'Uzavřeno', statusCode: 'DONE', date: '2024-11-05T09:10', amount: 288900, priority: 'low' },
            { id: 'PO-45082', type: 'Delivery', store: 'Praha Anděl', employee: 'Marek Havel', supplier: 'Nordic Sea', status: 'Čeká na platbu', statusCode: 'PENDING_PAYMENT', date: '2024-11-10T07:55', amount: 122200, priority: 'high' }
        ],
        orderItems: [
            { orderId: 'PO-45078', sku: 'SKU-70423', name: 'Organická jablka', qty: 480, price: 86 },
            { orderId: 'PO-45078', sku: 'SKU-18590', name: 'Bio kefír 1 l', qty: 300, price: 45 },
            { orderId: 'PO-45079', sku: 'SKU-66770', name: 'Bezlepkový chléb', qty: 80, price: 52 },
            { orderId: 'PO-45060', sku: 'SKU-50888', name: 'Pytle 30 l', qty: 1200, price: 8 },
            { orderId: 'PO-45082', sku: 'SKU-30010', name: 'Lososí filet', qty: 90, price: 340 }
        ],
        statuses: [
            { code: 'NEW', label: 'Nová', count: 3 },
            { code: 'PICKING', label: 'Kompletace', count: 4 },
            { code: 'IN_TRANSIT', label: 'Na cestě', count: 5 },
            { code: 'INBOUND', label: 'Příjem', count: 2 },
            { code: 'DONE', label: 'Uzavřeno', count: 12 },
            { code: 'PENDING_PAYMENT', label: 'Čeká na platbu', count: 1 }
        ],
        employees: [
            { id: 'EMP-041', name: 'Marek Havel', position: 'Specialista nákupu', start: '2021-03-01', mzda: 42000, phone: '+420 700 123 456', role: 'BUYER' },
            { id: 'EMP-017', name: 'Lenka Kubová', position: 'Vedoucí prodejny', start: '2019-11-14', mzda: 51000, phone: '+420 720 321 100', role: 'STORE_MANAGER' },
            { id: 'EMP-055', name: 'Jan Mareš', position: 'Logistik skladu', start: '2022-05-09', mzda: 36000, phone: '+420 730 440 880', role: 'LOGISTICS' },
            { id: 'EMP-012', name: 'Iveta Malá', position: 'Finanční kontrolor', start: '2018-02-19', mzda: 61000, phone: '+420 604 545 901', role: 'FINANCE' }
        ],
        customers: [
            { id: 'CST-1001', name: 'Štěpán Novák', loyalty: 'CZ-9930-11', email: 'stepan@novak.cz', phone: '+420 777 222 111' },
            { id: 'CST-1002', name: 'Alena Vavřínová', loyalty: 'CZ-7742-03', email: 'alena@vavrin.cz', phone: '+420 605 555 666' },
            { id: 'CST-1003', name: 'Roman Kříž', loyalty: null, email: 'roman.kriz@gmail.com', phone: '+420 608 910 222' }
        ],
        suppliers: [
            { id: 'SUP-01', company: 'Danone CZ', contact: 'Polská 54, Praha', phone: '+420 234 620 111', rating: 'A' },
            { id: 'SUP-02', company: 'Nordic Sea', contact: 'Havnevej 12, DK', phone: '+45 90 22 11 00', rating: 'A' },
            { id: 'SUP-03', company: 'EcoPack', contact: 'U Plynárny 10, Ostrava', phone: '+420 590 300 900', rating: 'B' }
        ],
        roles: [
            { name: 'ADMIN', description: 'Plný přístup', count: 3 },
            { name: 'BUYER', description: 'Nákup a dodávky', count: 6 },
            { name: 'STORE_MANAGER', description: 'Provoz prodejen', count: 9 },
            { name: 'FINANCE', description: 'Finance a reporting', count: 4 },
            { name: 'NEW_USER', description: 'Omezené zobrazení', count: 18 }
        ],
        addresses: [
            { store: 'Praha Anděl', city: 'Praha 5', street: 'Stroupežnického 3191/17', zip: '15000', kraj: 'Hlavní město Praha' },
            { store: 'Brno Olympia', city: 'Brno', street: 'U Dálnice 777', zip: '66442', kraj: 'Jihomoravský' },
            { store: 'Ostrava Avion', city: 'Ostrava', street: 'Rudná 114/3114', zip: '70030', kraj: 'Moravskoslezský' },
            { store: 'Plzeň Bory', city: 'Plzeň', street: 'U Letiště 1074/2', zip: '30100', kraj: 'Plzeňský' }
        ],
        payments: [
            { id: 'PMT-98761', orderId: 'PO-45079', type: 'K', method: 'VISA 5241', amount: 18540, date: '2024-11-09', status: 'Zpracováno', receipt: true },
            { id: 'PMT-98762', orderId: 'PO-45078', type: 'K', method: 'Mastercard 8870', amount: 412500, date: '2024-11-08', status: 'Zpracováno', receipt: true },
            { id: 'PMT-98763', orderId: 'PO-45060', type: 'H', method: 'Pokladna CZ-OST2', amount: 95680, date: '2024-11-07', status: 'Potvrzuje se', receipt: false },
            { id: 'PMT-98764', orderId: 'PO-45082', type: 'K', method: 'VISA 3310', amount: 122200, date: '2024-11-10', status: 'Čeká', receipt: false },
            { id: 'PMT-98765', orderId: 'PO-44998', type: 'K', method: 'Amex 6001', amount: 288900, date: '2024-11-05', status: 'Zpracováno', receipt: true },
            { id: 'PMT-98766', orderId: 'PO-44950', type: 'H', method: 'Pokladna CZ-PRG1', amount: 48200, date: '2024-11-04', status: 'Zpracováno', receipt: true }
        ],
        logs: [
            { table: 'OBJEDNAVKA', operation: 'UPDATE', user: 'system', timestamp: '2024-11-10 07:55', descr: 'Status PO-45082 → PENDING_PAYMENT' },
            { table: 'ZBOZI', operation: 'INSERT', user: 'marek.havel', timestamp: '2024-11-09 18:20', descr: 'Přidán SKU-40220' },
            { table: 'PLATBA', operation: 'UPDATE', user: 'iveta.mala', timestamp: '2024-11-08 09:40', descr: 'Potvrzen PMT-98763' },
            { table: 'SOUBOR', operation: 'DELETE', user: 'lenka.kubova', timestamp: '2024-11-07 16:02', descr: 'Smazán starý ceník' }
        ],
        messages: [
            { sender: 'Filip Janda', receiver: 'Marek Havel', preview: 'Kontroloval jsem ovoce, vše dorazilo…', date: '10.11 09:12' },
            { sender: 'Iveta Malá', receiver: 'Finance Team', preview: 'Objednávka PO-45082 čeká na ověření platby.', date: '10.11 08:30' },
            { sender: 'PushBot', receiver: 'All', preview: 'Push odběry byly úspěšně rozeslány.', date: '09.11 17:00' }
        ],
        subscribers: [
            { endpoint: 'Praha HQ Panel', auth: '…aJkL90', updated: '2024-11-09' },
            { endpoint: 'Warehouse Tablet CZ-PRG1', auth: '…tVx12', updated: '2024-11-08' }
        ],
        stores: [
            { name: 'Praha Anděl', city: 'Praha 5', address: 'Stroupežnického 3191/17', warehouse: 'CZ-PRG1', manager: 'Lenka Kubová', status: 'Otevřeno' },
            { name: 'Brno Olympia', city: 'Brno', address: 'U Dálnice 777', warehouse: 'CZ-BRN2', manager: 'Marek Havel', status: 'Otevřeno' },
            { name: 'Ostrava Avion', city: 'Ostrava', address: 'Rudná 114/3114', warehouse: 'CZ-OST2', manager: 'Jan Mareš', status: 'Audit' },
            { name: 'Plzeň Bory', city: 'Plzeň', address: 'U Letiště 1074/2', warehouse: 'CZ-BRN2', manager: 'Iveta Malá', status: 'Otevřeno' }
        ],
        profile: {
            fullName: 'Lenka Kubová',
            position: 'Global Admin',
            email: 'lenka.kubova@bdas.cz',
            phone: '+420 720 321 100',
            location: 'Praha, HQ',
            timezone: 'GMT+1 (CET)',
            lastLogin: '10.11.2024 · 07:42',
            storesOwned: 4,
            approvals: 36,
            escalations: 2,
            automations: 12,
            permissions: ['Objednávky', 'Finance', 'Inventář', 'Audit'],
            preferences: {
                language: 'Čeština',
                theme: 'Světlé UI',
                notifications: 'Push + e-mail',
                weeklyDigest: true
            },
            security: {
                mfa: 'Zapnuto · Authy',
                devices: 'MacOS 15 · iOS 18',
                lastIp: '185.34.220.17'
            },
            activity: [
                { time: '10:22', text: 'Schválila objednávku PO-45082', status: 'success' },
                { time: '09:58', text: 'Upravila sklad CZ-PRG1', status: 'info' },
                { time: '08:40', text: 'Změnila roli uživatele iveta.mala', status: 'success' },
                { time: 'Včera', text: 'Importovala 12 souborů do Archivu', status: 'accent' }
            ]
        },
        folders: [
            {
                name: 'Contracts',
                color: '#ff9f43',
                files: [
                    { name: 'Kontrakty Danone.pdf', type: 'PDF', archive: 'Contracts', owner: 'Marek Havel', updated: '2024-10-31' },
                    { name: 'RetailTerms_Nordic.docx', type: 'DOCX', archive: 'Contracts', owner: 'Legal Team', updated: '2024-11-02' }
                ]
            },
            {
                name: 'Inventory',
                color: '#34d399',
                files: [
                    { name: 'Inventura_PRG1.csv', type: 'CSV', archive: 'Inventory', owner: 'Jan Mareš', updated: '2024-11-08' },
                    { name: 'Forecast_Q4.xlsx', type: 'XLSX', archive: 'Inventory', owner: 'Filip Janda', updated: '2024-11-06' }
                ]
            },
            {
                name: 'Finance',
                color: '#a855f7',
                files: [
                    { name: 'Report tržeb.qvd', type: 'QVD', archive: 'Finance', owner: 'Iveta Malá', updated: '2024-11-07' },
                    { name: 'Platby_listopad.csv', type: 'CSV', archive: 'Finance', owner: 'Finance Team', updated: '2024-11-09' }
                ]
            },
            {
                name: 'Marketing',
                color: '#4361ee',
                files: [
                    { name: 'Promo_zima2024.pptx', type: 'PPTX', archive: 'Marketing', owner: 'Brand Team', updated: '2024-11-03' }
                ]
            }
        ],
        customerProducts: [
            { sku: 'SKU-70423', name: 'Organická jablka Pink Lady', category: 'Čerstvé', price: 86, badge: 'TOP prodej', description: 'Krabička 4 ks', image: '🍎' },
            { sku: 'SKU-18590', name: 'Bio kefír 1 l', category: 'Mléčné', price: 45, badge: 'Novinka', description: 'Madeta Bio', image: '🥛' },
            { sku: 'SKU-50888', name: 'Kompostovatelné pytle 30 l', category: 'Non-Food', price: 8, badge: 'EKO', description: 'Balení 20 ks', image: '🛍️' },
            { sku: 'SKU-40220', name: 'Český lipový med 450 g', category: 'Delikatesy', price: 210, badge: 'Limitka', description: 'Regionální produkt', image: '🍯' },
            { sku: 'SKU-66770', name: 'Bezlepkový chléb 700 g', category: 'Pečivo', price: 52, badge: 'Fresh', description: 'BezLepek s.r.o.', image: '🥖' }
        ],
        customerSuggestions: [
            'Doporučujeme přidat sezónní balíčky ovoce.',
            'Zvýhodněná doprava pro objednávky nad 5 000 Kč.',
            'Zákaznická karta přináší +3 % cashbacku.'
        ]
    }
};

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

            const app = new BDASConsole(state, viewMeta);
            app.init();
        } catch (error) {
            console.error('Chyba inicializace rozhraní', error);
            root.innerHTML = `
                <div class="boot-card error">
                    <p>Nepodařilo se načíst rozhraní. Obnovte prosím stránku.</p>
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
            document.getElementById('sync-time').textContent = this.state.data.syncUpdatedAt;
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

class ProfileModule {
    constructor(state) {
        this.state = state;
        this.overviewEl = document.getElementById('profile-overview');
        this.preferencesEl = document.getElementById('profile-preferences');
        this.securityEl = document.getElementById('profile-security');
        this.activityEl = document.getElementById('profile-activity');
    }

    render() {
        const profile = this.state.data.profile;
        if (!profile) {
            return;
        }
        if (this.overviewEl) {
            this.overviewEl.innerHTML = `
                <div class="profile-card">
                    <div>
                        <h3>${profile.fullName}</h3>
                        <p>${profile.position}</p>
                        <div class="profile-meta">
                            <span>${profile.location}</span>
                            <span>${profile.timezone}</span>
                        </div>
                    </div>
                    <div class="profile-contact">
                        <div>
                            <strong>E-mail</strong>
                            <p>${profile.email}</p>
                        </div>
                        <div>
                            <strong>Telefon</strong>
                            <p>${profile.phone}</p>
                        </div>
                        <div>
                            <strong>Poslední přihlášení</strong>
                            <p>${profile.lastLogin}</p>
                        </div>
                    </div>
                    <div class="profile-metrics">
                        <div><span>Prodejny</span><strong>${profile.storesOwned}</strong></div>
                        <div><span>Schválení</span><strong>${profile.approvals}</strong></div>
                        <div><span>Escalace</span><strong>${profile.escalations}</strong></div>
                        <div><span>Automace</span><strong>${profile.automations}</strong></div>
                    </div>
                </div>`;
        }

        if (this.preferencesEl) {
            this.preferencesEl.innerHTML = `
                <ul class="profile-list">
                    <li><span>Jazyk</span><strong>${profile.preferences.language}</strong></li>
                    <li><span>Téma</span><strong>${profile.preferences.theme}</strong></li>
                    <li><span>Notifikace</span><strong>${profile.preferences.notifications}</strong></li>
                    <li><span>Týdenní reporting</span><strong>${profile.preferences.weeklyDigest ? 'Zapnuto' : 'Vypnuto'}</strong></li>
                </ul>
                <div class="profile-chips">
                    ${profile.permissions.map(item => `<span class="chip active">${item}</span>`).join('')}
                </div>`;
        }

        if (this.securityEl) {
            const sec = profile.security;
            this.securityEl.innerHTML = `
                <ul class="profile-list">
                    <li><span>MFA</span><strong>${sec.mfa}</strong></li>
                    <li><span>Zařízení</span><strong>${sec.devices}</strong></li>
                    <li><span>Poslední IP</span><strong>${sec.lastIp}</strong></li>
                </ul>`;
        }

        if (this.activityEl) {
            this.activityEl.innerHTML = profile.activity.map(item => `
                <li class="activity-item">
                    <strong>${item.time}</strong>
                    <p>${item.text}</p>
                    <span class="badge">${item.status}</span>
                </li>
            `).join('');
        }
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
            this.employeeList = document.getElementById('employee-list');
            this.customerList = document.getElementById('customer-list');
            this.supplierList = document.getElementById('supplier-list');
            this.roleTable = document.getElementById('role-table-body');
            this.addressBoard = document.getElementById('address-board');
        }

        render() {
            if (this.employeeList) {
                this.employeeList.innerHTML = this.state.data.employees.map(emp => `
                    <article class="person-card">
                        <strong>${emp.name}</strong>
                        <p>${emp.position}</p>
                        <small>Ve službě od ${emp.start}</small>
                        <p>Kontakt: ${emp.phone}</p>
                    </article>
                `).join('');
            }

            if (this.customerList) {
                this.customerList.innerHTML = this.state.data.customers.map(client => `
                    <tr>
                        <td>${client.id}</td>
                        <td>${client.name}</td>
                        <td>${client.loyalty || '—'}</td>
                        <td>${client.email}<br>${client.phone}</td>
                    </tr>
                `).join('');
            }

            if (this.supplierList) {
                this.supplierList.innerHTML = this.state.data.suppliers.map(s => `
                    <div class="pill-card">
                        <strong>${s.company}</strong>
                        <p>${s.contact}</p>
                        <small>${s.phone}</small>
                        <div class="badge">rating ${s.rating}</div>
                    </div>
                `).join('');
            }

            if (this.roleTable) {
                this.roleTable.innerHTML = this.state.data.roles.map(role => `
                    <tr>
                        <td>${role.name}</td>
                        <td>${role.description}</td>
                        <td>${role.count}</td>
                    </tr>
                `).join('');
            }

            if (this.addressBoard) {
                this.addressBoard.innerHTML = this.state.data.addresses.map(addr => `
                    <div class="pill-card">
                        <strong>${addr.store}</strong>
                        <p>${addr.street}, ${addr.city}</p>
                        <small>${addr.zip} · ${addr.kraj}</small>
                    </div>
                `).join('');
            }
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
            this.profile = new ProfileModule(state);
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
            this.inventory.init();
            this.orders.init();
            this.finance.init();
            this.records.init();
            this.customer.init();
            this.search.init();
            this.registerUtilityButtons();
            this.renderAll();
        }

        registerUtilityButtons() {
            document.getElementById('refresh-btn')?.addEventListener('click', () => this.renderAll());
            document.getElementById('new-order-btn')?.addEventListener('click', () => alert('Průvodce vytvořením objednávky bude brzy dostupný.'));
            document.getElementById('new-store-btn')?.addEventListener('click', () => alert('Průvodce otevřením prodejny bude brzy dostupný.'));
            document.getElementById('export-store-btn')?.addEventListener('click', () => alert('Export seznamu prodejen bude brzy připraven.'));
            document.getElementById('upload-btn')?.addEventListener('click', () => alert('Nahrávání souborů přidáme později.'));
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
        }
    }

    document.addEventListener('DOMContentLoaded', bootstrapConsole);

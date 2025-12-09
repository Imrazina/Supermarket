import ProfileModule from './modules/profile-module.js';
import PermissionsModule from './modules/permissions-module.js';
import DbObjectsModule from './modules/dbobjects-module.js';
import UsersModule from './modules/users-module.js';
import RecordsModule from './modules/archive-module.js';
import CustomerOrdersView from './modules/customer-orders-view.js';

const dbErrorBackdropHandler = (event) => {
    if (event?.target?.id === 'db-error-modal') {
        hideDbError();
    }
};

const knownDbErrors = [
    { pattern: /ORA-12899/i, message: 'Zadaná hodnota je příliš dlouhá pro daný sloupec.' },
    { pattern: /ORA-00001/i, message: 'Záznam se stejnými údaji již existuje.' },
    { pattern: /ORA-02292/i, message: 'Záznam nelze odstranit, protože na něj odkazují jiné údaje.' },
    { pattern: /ORA-02291/i, message: 'Chybí navázaná položka – zkontrolujte vazby.' }
];

function normalizeDetailText(value) {
    if (value == null) return '';
    return value
        .toString()
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"');
}

function extractOracleColumnInfo(text) {
    const normalized = normalizeDetailText(text);
    if (!normalized) return null;
    const match = normalized.match(/"([^"]+)"\."([^"]+)"\."([^"]+)"/);
    if (!match) return extractLengthLimits(normalized);
    return {
        schema: match[1],
        table: match[2],
        column: match[3],
        ...extractLengthLimits(normalized)
    };
}

function extractLengthLimits(text) {
    const source = normalizeDetailText(text);
    if (!source) return {};
    let value = null;
    let max = null;
    const actualMatch = source.match(/(?:actual|фактич)[^0-9]*([0-9]+)/i);
    if (actualMatch) {
        value = Number(actualMatch[1]);
    }
    const maxMatch = source.match(/(?:max(?:imum)?|максим)[^0-9]*([0-9]+)/i);
    if (maxMatch) {
        max = Number(maxMatch[1]);
    }
    if ((value === null || max === null)) {
        const parenMatch = source.match(/\((?:[^0-9]*([0-9]+))[^0-9]+([0-9]+)[^)]*\)/);
        if (parenMatch) {
            if (value === null) value = Number(parenMatch[1]);
            if (max === null) max = Number(parenMatch[2]);
        }
    }
    return { value, max };
}

function parseServerError(rawDetail) {
    if (!rawDetail) {
        return { summary: null, extra: null, showDetail: false };
    }
    let trimmed = normalizeDetailText(rawDetail).trim();
    if (!trimmed) {
        return { summary: null, extra: null, showDetail: false };
    }
    let summary = null;
    let extra = trimmed;
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
            const data = JSON.parse(trimmed);
            summary = data?.message || data?.error || null;
            extra = data?.trace || null;
            if (!extra && data) {
                extra = Object.entries(data)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n');
            }
        } catch (e) {
            // leave as plain text
        }
    } else if (trimmed.includes('"message"')) {
        const match = trimmed.match(/"message"\s*:\s*"([^"]+)"/);
        if (match && match[1]) {
            summary = match[1];
        }
    }
    const firstLine = trimmed.split(/\r?\n/).find(Boolean);
    summary = summary || firstLine || trimmed;
    const extraString = extra ? String(extra) : '';
    let columnInfo = extractOracleColumnInfo(trimmed) || extractOracleColumnInfo(extraString);
    let oracleFriendly = mapOracleError(trimmed, columnInfo);
    if (!oracleFriendly && extraString) {
        oracleFriendly = mapOracleError(extraString, columnInfo);
    }
    let detailPayload = extraString && extraString !== summary ? extraString : '';
    let showDetail = Boolean(detailPayload);
    if (oracleFriendly) {
        summary = oracleFriendly;
        detailPayload = '';
        showDetail = false;
    }
    return {
        summary,
        extra: showDetail ? detailPayload : null,
        showDetail
    };
}

function mapOracleError(text, info) {
    if (!text) {
        return null;
    }
    const target = text.toString();
    for (const known of knownDbErrors) {
        if (known.pattern.test(target)) {
            const contextParts = [];
            if (info?.table && info?.column) {
                contextParts.push(`tabulka ${info.table}, sloupec ${info.column}`);
            }
            if (typeof info?.value === 'number' && typeof info?.max === 'number') {
                contextParts.push(`hodnota ${info.value}, limit ${info.max}`);
            }
            const suffix = contextParts.length ? ` (${contextParts.join('; ')})` : '';
            return `${known.message}${suffix}`;
        }
    }
    return null;
}

function showDbError(message, detail) {
    const modal = document.getElementById('db-error-modal');
    if (!modal) {
        window.alert?.(detail || message || 'Operace se nepodařila dokončit.');
        return;
    }
    const parsed = parseServerError(detail);
    const titleEl = modal.querySelector('#db-error-title');
    const msgEl = modal.querySelector('#db-error-message');
    const detailEl = modal.querySelector('#db-error-detail');
    const fallback = message && message.trim() ? message.trim() : 'Operace se nepodařila dokončit.';
    const text = parsed.summary || fallback;
    if (titleEl) {
        titleEl.textContent = 'Chyba databáze';
    }
    if (msgEl) {
        msgEl.textContent = text;
    }
    if (detailEl) {
        if (parsed.showDetail && parsed.extra) {
            detailEl.textContent = parsed.extra;
            detailEl.style.display = 'block';
        } else {
            detailEl.textContent = '';
            detailEl.style.display = 'none';
        }
    }
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('active');
    const closeButtons = modal.querySelectorAll('[data-db-error-close]');
    closeButtons.forEach(btn => {
        btn.removeEventListener('click', hideDbError);
        btn.addEventListener('click', hideDbError);
    });
    modal.removeEventListener('click', dbErrorBackdropHandler);
    modal.addEventListener('click', dbErrorBackdropHandler);
}

function hideDbError() {
    const modal = document.getElementById('db-error-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    modal.removeEventListener('click', dbErrorBackdropHandler);
}

window.showDbError = showDbError;

class SupplierModule {
    constructor(state, deps) {
        this.state = state;
        this.apiUrl = deps.apiUrl;
        this.view = document.querySelector('[data-view="supplier"]');
        this.navLink = document.querySelector('.nav-link[data-view="supplier"]');
        this.container = document.getElementById('supplier-orders-container');
        this.emptyState = document.getElementById('supplier-orders-empty');
        this.countBadge = document.getElementById('supplier-orders-count');
        this.mineContainer = document.getElementById('supplier-mine-container');
        this.mineEmpty = document.getElementById('supplier-mine-empty');
        this.mineCount = document.getElementById('supplier-mine-count');
        this.historyContainer = document.getElementById('supplier-history-container');
        this.historyEmpty = document.getElementById('supplier-history-empty');
        this.historyCount = document.getElementById('supplier-history-count');
        this.historyWrapper = document.getElementById('supplier-history-section');
        this.historyToggle = document.getElementById('supplier-history-toggle');
    }

    init() {
        if (!this.view) {
            return;
        }
        if (!this.hasAccess()) {
            this.hideView();
            return;
        }
        this.loadOrders();
        this.container?.addEventListener('click', e => {
            const claimBtn = e.target.closest('[data-claim-id]');
            if (claimBtn) {
                this.claimOrder(claimBtn.dataset.claimId);
                return;
            }
            const toggleBtn = e.target.closest('[data-details-toggle]');
            if (toggleBtn) {
                const targetId = toggleBtn.dataset.detailsToggle;
                this.toggleDetails(targetId);
            }
        });
        this.mineContainer?.addEventListener('click', e => {
            const statusBtn = e.target.closest('[data-status-change]');
            if (statusBtn) {
                this.changeStatus(statusBtn.dataset.orderId, statusBtn.dataset.statusChange, statusBtn);
                return;
            }
            const toggleBtn = e.target.closest('[data-mine-toggle]');
            if (toggleBtn) {
                this.toggleMineDetails(toggleBtn.dataset.mineToggle);
            }
        });
        this.historyContainer?.addEventListener('click', e => {
            const toggleBtn = e.target.closest('[data-history-toggle]');
            if (toggleBtn) {
                this.toggleHistoryDetails(toggleBtn.dataset.historyToggle);
            }
        });
        if (this.historyToggle && this.historyWrapper) {
            this.historyToggle.addEventListener('click', e => {
                e.preventDefault();
                this.toggleHistoryPanel();
            });
        }
    }

    hasAccess() {
        const permissions = this.state.data?.profile?.permissions;
        if (!Array.isArray(permissions)) {
            return false;
        }
        return permissions.includes('SUPPLIER_ORDERS_ACC');
    }

    hideView() {
        this.view?.remove();
        this.view = null;
        this.navLink?.remove();
        this.navLink = null;
        this.container = null;
        this.emptyState = null;
        this.countBadge = null;
        this.mineContainer = null;
        this.mineEmpty = null;
        this.mineCount = null;
        this.historyContainer = null;
        this.historyEmpty = null;
        this.historyCount = null;
    }

    async loadOrders() {
        if (!this.hasAccess()) {
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            this.state.supplierOrders.free = [];
            this.state.supplierOrders.mine = [];
            this.state.supplierOrders.history = [];
            this.render();
            return;
        }
        try {
            const [freeOrders, myOrders] = await Promise.all([
                this.fetchOrders('/api/supplier/orders/free', token),
                this.fetchOrders('/api/supplier/orders/mine', token)
            ]);
            const mineAll = myOrders || [];
            this.state.supplierOrders.free = freeOrders || [];
            this.state.supplierOrders.mine = mineAll.filter(order => [2, 3, 4].includes(Number(order.statusId)));
            this.state.supplierOrders.history = mineAll.filter(order => [5, 6].includes(Number(order.statusId)));
            this.render();
        } catch (error) {
            console.error('Failed to load supplier orders:', error);
            this.showSupplierError('Nepodařilo se načíst dodavatelské objednávky.');
        }
    }

    async fetchOrders(path, token) {
        const response = await fetch(this.apiUrl(path), {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = 'landing.html';
            return [];
        }
        if (!response.ok) {
            throw new Error(await response.text());
        }
        return await response.json();
    }

    async claimOrder(orderId) {
        if (!this.hasAccess()) {
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(this.apiUrl(`/api/supplier/orders/${orderId}/claim`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error(await response.text());
            }
            await this.loadOrders();
        } catch (error) {
            console.error('Failed to claim order:', error);
            alert(error.message || 'Nepodařilo se převzít objednávku.');
        }
    }

    render() {
        if (!this.hasAccess()) {
            return;
        }
        this.renderFree();
        this.renderMine();
        this.renderHistory();
    }

    renderFree() {
        if (!this.container) {
            return;
        }
        const orders = this.state.supplierOrders.free || [];
        if (this.countBadge) {
            this.countBadge.textContent = orders.length;
        }
        if (!orders.length) {
            this.container.style.display = 'none';
            if (this.emptyState) this.emptyState.style.display = 'block';
            return;
        }
        this.container.style.display = 'grid';
        if (this.emptyState) this.emptyState.style.display = 'none';
        this.container.innerHTML = orders.map(order => this.renderCard(order)).join('');
    }

    renderMine() {
        if (!this.mineContainer) {
            return;
        }
        const mine = this.state.supplierOrders.mine || [];
        if (this.mineCount) {
            this.mineCount.textContent = mine.length;
        }
        if (!mine.length) {
            this.mineContainer.innerHTML = '';
            this.mineContainer.style.display = 'none';
            if (this.mineEmpty) this.mineEmpty.style.display = 'block';
            return;
        }
        this.mineContainer.style.display = 'flex';
        if (this.mineEmpty) this.mineEmpty.style.display = 'none';
        this.mineContainer.innerHTML = mine.map(order => this.renderMineCard(order)).join('');
    }

    renderHistory() {
        if (!this.historyContainer) {
            return;
        }
        const history = this.state.supplierOrders.history || [];
        if (this.historyCount) {
            this.historyCount.textContent = history.length;
        }
        if (!history.length) {
            this.historyContainer.innerHTML = '';
            this.historyContainer.style.display = 'none';
            if (this.historyEmpty) this.historyEmpty.style.display = 'block';
            return;
        }
        this.historyContainer.style.display = 'flex';
        if (this.historyEmpty) this.historyEmpty.style.display = 'none';
        this.historyContainer.innerHTML = history.map(order => this.renderHistoryCard(order)).join('');
    }

    renderCard(order) {
        const total = this.computeTotal(order?.items || []);
        const reward = order?.rewardEstimate ?? (total * 0.7);
        const createdLabel = this.formatDate(order?.createdAt);
        const itemList = this.renderItems(order?.items);
        const note = order?.note ? `<p class="profile-muted" style="margin:6px 0 0;">${this.escapeHtml(order.note)}</p>` : '';
        const statusClass = this.resolveStatusClass(order?.status);
        return `
            <div class="supplier-order-card" data-order-id="${order.id}">
                <div class="supplier-card-head">
                    <div>
                        <p class="eyebrow" style="margin:0 0 6px;">${order.supermarket || 'Neznámý supermarket'}</p>
                        <h4 style="margin:0 0 8px;">Objednávka #${order.id}</h4>
                    </div>
                    <span class="status-badge ${statusClass}">${order.status || 'Vytvořena'}</span>
                </div>
                <div class="supplier-card-meta">
                    <div class="meta-row">
                        <span class="material-symbols-rounded">calendar_today</span>
                        <span>Vytvořeno: ${createdLabel}</span>
                    </div>
                </div>
                ${note}
                <div class="supplier-order-items" data-details="${order.id}" hidden>
                    ${itemList}
                </div>
                <div class="supplier-order-footer" style="display:flex;flex-direction:column;gap:14px;margin-top:18px;">
                    <div class="supplier-reward" style="display:flex;flex-direction:column;">
                        <small class="profile-muted" style="margin-bottom:4px;">Odměna pro vás</small>
                        <strong style="font-size:1.35rem;">${currencyFormatter.format(reward || 0)}</strong>
                    </div>
                    <div class="supplier-order-actions" style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
                        <button type="button" class="ghost-btn ghost-muted" data-details-toggle="${order.id}" style="flex:0 1 auto;">Detail</button>
                        <button class="take-order-btn" data-claim-id="${order.id}" style="flex:0 1 auto;min-width:120px;">Převzít</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderMineCard(order) {
        const reward = order?.rewardEstimate ?? (this.computeTotal(order?.items || []) * 0.7);
        const createdLabel = this.formatDate(order?.createdAt);
        const statusClass = this.resolveStatusClass(order?.status);
        const itemList = this.renderItems(order?.items);
        return `
            <div class="supplier-mine-card" data-mine-order="${order.id}">
                <div class="supplier-card-head">
                    <div>
                        <p class="eyebrow" style="margin:0 0 6px;">${order.supermarket || 'Neznámý supermarket'}</p>
                        <h4 style="margin:0 0 8px;">Objednávka #${order.id}</h4>
                    </div>
                    <span class="status-badge ${statusClass}">${order.status || '—'}</span>
                </div>
                <div class="supplier-card-meta">
                    <div class="meta-row">
                        <span class="material-symbols-rounded">calendar_today</span>
                        <span>Vytvořeno: ${createdLabel}</span>
                    </div>
                    <div class="meta-row">
                        <span class="material-symbols-rounded">payments</span>
                        <span>Odměna: <strong>${currencyFormatter.format(reward || 0)}</strong></span>
                    </div>
                </div>
                <div class="supplier-order-items" data-mine-details="${order.id}" hidden>
                    ${itemList}
                </div>
                <div class="supplier-order-footer" style="display:flex;flex-direction:row;flex-wrap:wrap;gap:12px;align-items:flex-start;margin-top:16px;justify-content:space-between;">
                    ${this.renderStatusControls(order)}
                    <button type="button" class="ghost-btn ghost-muted" data-mine-toggle="${order.id}" style="align-self:flex-start;">Položky</button>
                </div>
            </div>
        `;
    }

    renderHistoryCard(order) {
        const reward = order?.rewardEstimate ?? (this.computeTotal(order?.items || []) * 0.7);
        const createdLabel = this.formatDate(order?.createdAt);
        const statusClass = this.resolveStatusClass(order?.status);
        const itemList = this.renderItems(order?.items);
        return `
            <div class="supplier-history-card" data-history-order="${order.id}">
                <div class="supplier-card-head">
                    <div>
                        <p class="eyebrow" style="margin:0 0 6px;">${order.supermarket || 'Neznámý supermarket'}</p>
                        <h4 style="margin:0 0 8px;">Objednávka #${order.id}</h4>
                    </div>
                        <span class="status-badge ${statusClass}">${order.status || '—'}</span>
                </div>
                <div class="supplier-card-meta">
                    <div class="meta-row">
                        <span class="material-symbols-rounded">calendar_today</span>
                        <span>Vytvořeno: ${createdLabel}</span>
                    </div>
                    <div class="meta-row">
                        <span class="material-symbols-rounded">payments</span>
                        <span>Odměna: <strong>${currencyFormatter.format(reward || 0)}</strong></span>
                    </div>
                </div>
                <div class="supplier-order-items" data-history-details="${order.id}" hidden>
                    ${itemList}
                </div>
                <button type="button" class="ghost-btn ghost-muted" data-history-toggle="${order.id}" style="margin-top:12px;align-self:flex-start;">Položky</button>
            </div>
        `;
    }

    renderStatusControls(order) {
        const actions = this.resolveStatusActions(order?.statusId);
        if (!actions.length) {
            return `<span class="profile-muted">Žádné další kroky nejsou potřeba.</span>`;
        }
        const nextActions = actions.filter(a => a.theme !== 'danger');
        const cancelAction = actions.find(a => a.theme === 'danger');
        return `
            <div class="supplier-mine-actions" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-start;align-items:center;">
                ${nextActions.map(action => {
                    const classes = 'ghost-btn ghost-strong';
                    return `<button type="button" class="${classes}" data-status-change="${action.id}" data-order-id="${order.id}">
                        ${this.escapeHtml(action.label)}
                    </button>`;
                }).join('')}
                ${cancelAction ? `<button type="button" class="ghost-btn ghost-danger" data-status-change="${cancelAction.id}" data-order-id="${order.id}">
                    ${this.escapeHtml(cancelAction.label)}
                </button>` : ''}
            </div>
        `;
    }

    resolveStatusActions(statusId) {
        const map = {
            2: [
                { id: 3, label: 'Vyjíždím', theme: 'strong' },
                { id: 6, label: 'Zrušit', theme: 'danger' }
            ],
            3: [
                { id: 4, label: 'Předáno do prodejny', theme: 'strong' },
                { id: 6, label: 'Zrušit', theme: 'danger' }
            ],
            4: [
                { id: 5, label: 'Dokončeno', theme: 'strong' },
                { id: 6, label: 'Zrušit', theme: 'danger' }
            ]
        };
        return map[Number(statusId)] || [];
    }

    renderItems(items = []) {
        if (!items.length) {
            return '<p class="profile-muted" style="margin:6px 0;">Žádné položky k zobrazení.</p>';
        }
        return `
            <ul class="supplier-items-list">
                ${items.map(item => `
                    <li>
                        <strong>${this.escapeHtml(item.name || '—')}</strong>
                        <span>${item.qty || 0} ks</span>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    toggleDetails(orderId) {
        if (!orderId || !this.container) return;
        const section = this.container.querySelector(`[data-details="${orderId}"]`);
        if (!section) return;
        const isHidden = section.hasAttribute('hidden');
        if (isHidden) {
            section.removeAttribute('hidden');
        } else {
            section.setAttribute('hidden', 'hidden');
        }
    }

    toggleMineDetails(orderId) {
        if (!orderId || !this.mineContainer) return;
        const section = this.mineContainer.querySelector(`[data-mine-details="${orderId}"]`);
        if (!section) return;
        if (section.hasAttribute('hidden')) {
            section.removeAttribute('hidden');
        } else {
            section.setAttribute('hidden', 'hidden');
        }
    }

    toggleHistoryDetails(orderId) {
        if (!orderId || !this.historyContainer) return;
        const section = this.historyContainer.querySelector(`[data-history-details="${orderId}"]`);
        if (!section) return;
        if (section.hasAttribute('hidden')) {
            section.removeAttribute('hidden');
        } else {
            section.setAttribute('hidden', 'hidden');
        }
    }

    toggleHistoryPanel() {
        if (!this.historyWrapper) {
            this.historyWrapper = document.getElementById('supplier-history-section');
        }
        if (!this.historyToggle) {
            this.historyToggle = document.getElementById('supplier-history-toggle');
        }
        if (!this.historyWrapper || !this.historyToggle) {
            return;
        }
        const isHidden = this.historyWrapper.hasAttribute('hidden');
        if (isHidden) {
            this.historyWrapper.removeAttribute('hidden');
            this.historyWrapper.style.display = 'flex';
            this.historyToggle.setAttribute('aria-expanded', 'true');
            this.historyToggle.textContent = 'Skrýt historii';
        } else {
            this.historyWrapper.setAttribute('hidden', 'hidden');
            this.historyWrapper.style.display = 'none';
            this.historyToggle.setAttribute('aria-expanded', 'false');
            this.historyToggle.textContent = 'Zobrazit historii';
        }
    }

    async changeStatus(orderId, statusId, triggerEl) {
        if (!this.hasAccess() || !orderId || !statusId) {
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'landing.html';
            return;
        }
        triggerEl?.setAttribute('disabled', 'true');
        try {
            const response = await fetch(this.apiUrl(`/api/supplier/orders/${orderId}/status`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ statusId: Number(statusId) })
            });
            if (!response.ok) {
                throw new Error(await response.text());
            }
            await response.json().catch(() => null);
            await this.loadOrders();
        } catch (error) {
            console.error('Failed to change supplier order status:', error);
            if (typeof window.showDbError === 'function') {
                window.showDbError('Nepodařilo se změnit stav objednávky.', error.message || '');
            } else {
                alert(error.message || 'Nepodařilo se změnit stav objednávky.');
            }
        } finally {
            triggerEl?.removeAttribute('disabled');
        }
    }

    computeTotal(items = []) {
        return items.reduce((sum, item) => {
            const qty = Number(item.qty || 0);
            const price = Number(item.price || 0);
            return sum + qty * price;
        }, 0);
    }

    resolveStatusClass(label) {
        if (!label) return 'info';
        const normalized = label.toLowerCase();
        if (normalized.includes('dokon') || normalized.includes('doruc') || normalized.includes('hot')) {
            return 'success';
        }
        if (normalized.includes('zrus') || normalized.includes('storno')) {
            return 'danger';
        }
        if (normalized.includes('cest') || normalized.includes('cek') || normalized.includes('prac')) {
            return 'warning';
        }
        return 'info';
    }

    showSupplierError(message) {
        if (typeof window.showDbError === 'function') {
            window.showDbError(message || 'Došlo k chybě.', '');
        } else if (this.container) {
            this.container.innerHTML = `<p class="profile-muted">${this.escapeHtml(message || 'Došlo k chybě.')}</p>`;
        }
    }

    formatDate(value) {
        if (!value) {
            return '—';
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date.toLocaleString('cs-CZ');
    }

    escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

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
        customerOrders: [],
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
    supplierOrders: { free: [], mine: [], history: [], loading: false, error: null },
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
const appLoadingId = 'app-loading-overlay';

function ensureLoadingOverlay() {
    const root = document.getElementById('app-root');
    if (!root) return null;
    let overlay = document.getElementById(appLoadingId);
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = appLoadingId;
        overlay.className = 'app-loading-overlay hidden';
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'polite');
        overlay.innerHTML = `
            <div class="app-loading-orbit" aria-hidden="true">
                <div class="orbit-layer back">
                    <span class="orbit-item orbit-e" style="--shift-x:-320px; --shift-y:-220px;">🍇</span>
                    <span class="orbit-item orbit-f" style="--shift-x:320px; --shift-y:-220px; animation-delay:-3s;">🥦</span>
                    <span class="orbit-item orbit-g" style="--shift-x:-320px; --shift-y:240px; animation-delay:-6s;">🥖</span>
                    <span class="orbit-item orbit-h" style="--shift-x:320px; --shift-y:240px; animation-delay:-9s;">🍉</span>
                    <span class="orbit-item orbit-i" style="--shift-x:-480px; --shift-y:0px; animation-delay:-12s;">🍣</span>
                    <span class="orbit-item orbit-j" style="--shift-x:480px; --shift-y:0px; animation-delay:-15s;">🍋</span>
                </div>
                <div class="orbit-layer front">
                    <span class="orbit-item orbit-a" style="--shift-x:-240px; --shift-y:-140px;">🍏</span>
                    <span class="orbit-item orbit-b" style="--shift-x:240px; --shift-y:-140px; animation-delay:-1.5s;">🥐</span>
                    <span class="orbit-item orbit-c" style="--shift-x:-240px; --shift-y:160px; animation-delay:-3s;">🥑</span>
                    <span class="orbit-item orbit-d" style="--shift-x:240px; --shift-y:160px; animation-delay:-4.5s;">🧀</span>
                    <span class="orbit-item orbit-e" style="--shift-x:0px; --shift-y:-280px; animation-delay:-6s;">🍅</span>
                    <span class="orbit-item orbit-f" style="--shift-x:0px; --shift-y:280px; animation-delay:-7.5s;">🍩</span>
                </div>
            </div>
            <div class="app-loading-card">
                <div class="loader-spinner" aria-hidden="true"></div>
                <div>
                    <h3 class="app-loading-title">BDAS</h3>
                    <p class="app-loading-text">Načítáme data…</p>
                </div>
            </div>
        `;
        root.appendChild(overlay);
    }
    return overlay;
}

function setAppLoading(visible, text) {
    const overlay = ensureLoadingOverlay();
    if (!overlay) {
        return;
    }
    if (text) {
        const textEl = overlay.querySelector('.app-loading-text');
        if (textEl) {
            textEl.textContent = text;
        }
    }
    overlay.classList.toggle('hidden', !visible);
}

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
    const rawSummary = (data && data.lastMessageSummary) ? data.lastMessageSummary : 'Zadne zpravy';
    const parsed = parseMessageSummary(rawSummary);
    unreadEl.textContent = unread;
    if (unread === 0) {
        timeEl.textContent = '—';
        fromEl.textContent = '';
        textEl.textContent = 'Zadne zpravy';
    } else {
        timeEl.textContent = parsed.time || '—';
        fromEl.textContent = parsed.from ? `od ${parsed.from}` : '';
        textEl.textContent = parsed.text || 'Message …';
    }
}

function parseMessageSummary(summary) {
    if (!summary || summary.toLowerCase().includes('zadne')) {
        return { time: '', from: '', text: 'Zadne zpravy' };
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
        } else if (key === 'customerOrders' && Array.isArray(value)) {
            base.customerOrders = value;
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
        let message = 'Nepodarilo se nacist data z API.';
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
    dashboard: { label: 'Hlavni panel', title: 'Rizeni operaci' },
    profile: { label: 'Profil admina', title: 'Muj pracovni profil' },
    inventory: { label: 'Sklad & katalog', title: 'Zasoby a kategorie' },
    orders: { label: 'Dodavatelsky retezec', title: 'Objednavky a stavy' },
    people: { label: 'Lide & pristupy', title: 'Tym a zakaznici' },
    finance: { label: 'Financni rizeni', title: 'Platby a uctenky' },
    records: { label: 'Archiv', title: 'Soubory, logy, zpravy' },
    dbobjects: { label: 'DB objekty', title: 'Systemovy katalog' },
    customer: { label: 'Zakaznicka zona', title: 'Self-service objednavky' },
    'customer-orders': { label: 'Moje objednavky', title: 'Objednavky zakaznika' },
    'customer-payment': { label: 'Platba', title: 'Zaplatte objednavku' },
    chat: { label: 'Komunikace', title: 'Chat & push centrum' }
};

const fragmentUrl = document.body.dataset.fragment || 'fragments/app-shell.html';
state.activeView = document.body.dataset.initialView || state.activeView;

const allViews = [
    'dashboard', 'profile', 'inventory', 'orders', 'people', 'finance', 'records',
    'dbobjects', 'permissions', 'customer', 'customer-cart', 'customer-orders', 'customer-payment', 'chat',
    'supplier'
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
        add('customer', 'customer-cart', 'customer-orders', 'customer-payment');
        return allowed;
    }

    if (normalizedRole === 'DODAVATEL') {
        add('supplier');
        return allowed;
    }

    if (normalizedRole.startsWith('DORUCOVATEL') || normalizedRole === 'COURIER' || normalizedRole === 'DORUCOVATEL' || normalizedRole === 'DORUČOVATEL') {
        add('orders');
        return allowed;
    }

    add('inventory', 'orders', 'finance', 'records', 'customer', 'customer-cart', 'customer-orders', 'customer-payment');
    return allowed;
}

    async function bootstrapConsole() {
        const root = document.getElementById('app-root');
        try {
            const response = await fetch(fragmentUrl);
            if (!response.ok) {
                throw new Error(`Failed to load layout fragment (${response.status})`);
            }
            // Force UTF-8 decoding regardless of server-supplied charset to keep Czech text intact
            const buffer = await response.arrayBuffer();
            const markup = new TextDecoder('utf-8').decode(buffer);
            root.innerHTML = markup;
            setAppLoading(true, 'Načítáme data…');

            const [snapshot, permissionsCatalog, profileMeta, adminPermissions, rolePermissions] = await Promise.all([
                fetchDashboardSnapshot(),
                fetchPermissionsCatalog(),
                fetchProfileMeta(),
                fetchAdminPermissions(),
                fetchRolePermissions()
            ]);
            if (!snapshot) {
                setAppLoading(false);
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

            setAppLoading(false);
            root.classList.remove('app-boot');
        } catch (error) {
            console.error('Chyba inicializace rozhraní', error);
            setAppLoading(false);
            root.className = 'app-boot';
            console.error('Chyba inicializace rozhrani', error);
            root.innerHTML = `
                <div class="boot-card error">
                    <p>${error.message || 'Nepodarilo se nacist rozhrani. Obnovte prosim stranku.'}</p>
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
            document.getElementById('user-name').textContent = localStorage.getItem('fullName') || localStorage.getItem('email') || 'Uzivatel';
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

        hasViewSection(view) {
            return Array.from(this.views).some(section => section.dataset.view === view);
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
                    // Pokud pro view nemáme sekci, necháme klasickou navigaci
                    if (!this.hasViewSection(targetView)) {
                        return;
                    }
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
            if (!this.hasViewSection(target)) {
                return this.state.activeView;
            }
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
            this.kpiSkuTrend.textContent = `${new Set(this.state.data.inventory.map(item => item.category)).size} kategorii`;
            this.kpiOrdersTrend.textContent = `${openOrders} v praci`;
            this.kpiCriticalTrend.textContent = critical.length ? 'nutne doplnit' : 'vse stabilni';

            const maxValue = Math.max(...this.state.data.weeklyDemand.map(point => point.value));
            this.chart.innerHTML = this.state.data.weeklyDemand.map(point => {
                const height = Math.round((point.value / maxValue) * 100);
                return `<div class="spark-bar" style="height:${height}%"><span>${point.label}</span></div>`;
            }).join('');

            this.lowStockList.innerHTML = critical.length
                ? critical.map(item => `<li>${item.sku} · ${item.name} — zbyva ${item.stock}, minimum ${item.minStock}</li>`).join('')
                : '<p>Vsechny polozky jsou nad minimem.</p>';

            this.statusBoard.innerHTML = this.state.data.statuses.map(stat => `
                <div class="pill-card">
                    <strong>${stat.label}</strong>
                    <p>${stat.count} zaznamu</p>
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
                    <td><span class="status-badge ${store.status === 'Otevreno' ? 'success' : 'warning'}">${store.status}</span></td>
                </tr>`).join('');
    }
}

    class InventoryModule {
        constructor(state, deps = {}) {
            this.state = state;
            this.apiUrl = deps.apiUrl;
            this.categories = [];
            this.cities = [];
            this.modal = document.getElementById('market-editor-modal');
            this.modalTitle = document.getElementById('market-modal-title');
            this.form = document.getElementById('market-editor-form');
            this.fieldsContainer = document.getElementById('market-form-fields');
            this.formStatus = document.getElementById('market-form-status');
            this.deleteBtn = document.getElementById('market-delete-btn');
            this.currentSection = null;
            this.currentRecord = null;
            this.sections = {
                supermarkets: {
                    key: 'supermarkets',
                    label: 'supermarket',
                    basePath: '/api/market/supermarkets',
                    tableBody: document.getElementById('market-supermarket-body'),
                    statusEl: document.getElementById('supermarket-status'),
                    addBtn: document.getElementById('supermarket-add-btn'),
                    columns: 5,
                    formFields: [
                        { name: 'nazev', label: 'Název', type: 'text', required: true, maxLength: 180 },
                        { name: 'telefon', label: 'Telefon', type: 'text', maxLength: 64 },
                        { name: 'email', label: 'Email', type: 'email', maxLength: 120 },
                        { name: 'adresaUlice', label: 'Ulice', type: 'text', required: true, maxLength: 255 },
                        { name: 'adresaCpop', label: 'Číslo popisné', type: 'text', required: true, maxLength: 16 },
                        { name: 'adresaCorient', label: 'Číslo orientační', type: 'text', required: true, maxLength: 16 },
                        {
                            name: 'adresaPsc',
                            label: 'PSČ',
                            type: 'select',
                            placeholderOption: 'Vyberte PSČ',
                            getOptions: () => this.cities.map(city => ({
                                value: city.psc,
                                label: `${city.psc} · ${city.nazev || 'Město'}`
                            }))
                        }
                    ]
                },
                goods: {
                    key: 'goods',
                    label: 'zboží',
                    basePath: '/api/market/goods',
                    tableBody: document.getElementById('market-goods-body'),
                    statusEl: document.getElementById('goods-status'),
                    addBtn: document.getElementById('goods-add-btn'),
                    columns: 6,
                    formFields: [
                        { name: 'nazev', label: 'Název', type: 'text', required: true, maxLength: 200 },
                        { name: 'popis', label: 'Popis', type: 'textarea', maxLength: 1000 },
                        { name: 'cena', label: 'Cena', type: 'number', min: 0, step: 0.01, cast: 'number' },
                        { name: 'mnozstvi', label: 'Množství', type: 'number', min: 0, cast: 'number' },
                        { name: 'minMnozstvi', label: 'Minimální zásoba', type: 'number', min: 0, cast: 'number' },
                        {
                            name: 'kategorieId',
                            label: 'Kategorie',
                            type: 'select',
                            placeholderOption: 'Vyberte kategorii',
                            cast: 'number',
                            getOptions: () => this.categories.map(cat => ({ value: cat.id, label: cat.nazev || `#${cat.id}` }))
                        },
                        {
                            name: 'skladId',
                            label: 'Sklad',
                            type: 'select',
                            placeholderOption: 'Vyberte sklad',
                            cast: 'number',
                            getOptions: () => (this.sections.warehouses.records || []).map(w => ({
                                value: w.id,
                                label: `${w.nazev || w.supermarketNazev || 'Sklad'}`
                            }))
                        }
                    ]
                },
                warehouses: {
                    key: 'warehouses',
                    label: 'sklad',
                    basePath: '/api/market/warehouses',
                    tableBody: document.getElementById('market-warehouse-body'),
                    statusEl: document.getElementById('warehouse-status'),
                    addBtn: document.getElementById('warehouse-add-btn'),
                    columns: 5,
                    formFields: [
                        { name: 'nazev', label: 'Název', type: 'text', required: true, maxLength: 180 },
                        { name: 'kapacita', label: 'Kapacita', type: 'number', min: 0, cast: 'number' },
                        { name: 'telefon', label: 'Telefon', type: 'text', maxLength: 64 },
                        {
                            name: 'supermarketId',
                            label: 'Supermarket',
                            type: 'select',
                            placeholderOption: 'Vyberte supermarket',
                            cast: 'number',
                            getOptions: () => (this.sections.supermarkets.records || []).map(sp => ({
                                value: sp.id,
                                label: `${sp.nazev || 'Supermarket'}`
                            }))
                        }
                    ]
                }
            };
        }

        init() {
            if (!this.sections.goods.tableBody) {
                return;
            }
            if (!this.apiUrl) {
                console.warn('Inventory module missing apiUrl');
                return;
            }
            this.initModal();
            Object.values(this.sections).forEach(section => {
                section.records = [];
                this.bindSection(section);
            });
            this.refreshAll();
        }

        initModal() {
            if (!this.modal || !this.form) return;
            this.modal.setAttribute('aria-hidden', 'true');
            this.modal.addEventListener('click', (event) => {
                if (event.target === this.modal) {
                    this.hideModal();
                }
            });
            this.form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.submitForm();
            });
            this.deleteBtn?.addEventListener('click', () => this.deleteCurrent());
            this.modal.querySelectorAll('[data-market-close]')?.forEach(btn => {
                btn.addEventListener('click', () => this.hideModal());
            });
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && this.modal.classList.contains('active')) {
                    this.hideModal();
                }
            });
        }

        bindSection(section) {
            section.addBtn?.addEventListener('click', () => this.openModal(section, null));
            section.tableBody?.addEventListener('click', event => {
                const actionBtn = event.target.closest('[data-market-action]');
                if (!actionBtn) return;
                const id = Number(actionBtn.dataset.id);
                const record = (section.records || []).find(item => item.id === id);
                if (actionBtn.dataset.marketAction === 'edit' && record) {
                    this.openModal(section, record);
                } else if (actionBtn.dataset.marketAction === 'delete' && record) {
                    this.confirmDelete(section, record);
                }
            });
        }

        async refreshAll() {
            const token = localStorage.getItem('token');
            if (!token) {
                Object.values(this.sections).forEach(section => this.setStatus(section, 'Pro zobrazení se přihlaste.'));
                return;
            }
            Object.values(this.sections).forEach(section => this.setStatus(section, 'Načítání…'));
            try {
                await Promise.all([
                    this.loadCategories(token),
                    this.loadCities(token),
                    ...Object.values(this.sections).map(section => this.loadSection(section, token))
                ]);
            } catch (error) {
                console.error('Inventární data se nepodařilo načíst', error);
            }
        }

        async loadCategories(token) {
            try {
                const response = await fetch(this.apiUrl('/api/market/categories'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = 'landing.html';
                    return;
                }
                if (!response.ok) {
                    throw new Error(await response.text());
                }
                this.categories = await response.json() || [];
            } catch (error) {
                console.warn('Nepodarilo se nacist kategorie', error);
                this.categories = [];
            }
        }

        async loadCities(token) {
            try {
                const response = await fetch(this.apiUrl('/api/market/mesta'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = 'landing.html';
                    return;
                }
                if (!response.ok) {
                    throw new Error(await response.text());
                }
                this.cities = await response.json() || [];
            } catch (error) {
                console.warn('Nepodarilo se nacist mesta', error);
                this.cities = [];
            }
        }

        async loadSection(section, token) {
            if (!section.tableBody) return;
            try {
                const response = await fetch(this.apiUrl(section.basePath), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = 'landing.html';
                    return;
                }
                if (!response.ok) {
                    const text = await response.text();
                    const err = new Error(text || 'Chyba načítání.');
                    err.detail = text;
                    throw err;
                }
                section.records = await response.json() || [];
                this.renderSection(section);
                this.setStatus(section, section.records.length ? `${section.records.length} záznamů` : 'Bez dat');
            } catch (error) {
                console.error(`Nacitani sekce ${section.key} selhalo`, error);
                this.setStatus(section, error.message || 'Chyba načítání.');
                section.records = [];
                this.renderSection(section);
                if (section.key === 'goods') {
                    this.reportDbError(error, 'Načítání zboží se nezdařilo.');
                }
            }
        }

        setStatus(section, text) {
            if (section.statusEl) {
                section.statusEl.textContent = text || '';
            }
        }

        renderSection(section) {
            if (!section.tableBody) return;
            const rows = section.records || [];
            if (!rows.length) {
                section.tableBody.innerHTML = `<tr><td colspan="${section.columns}" class="table-placeholder">Žádná data</td></tr>`;
                return;
            }
            section.tableBody.innerHTML = rows.map(row => this.renderRow(section, row)).join('');
        }

        renderRow(section, row) {
            if (section.key === 'supermarkets') {
                return `
                    <tr data-id="${row.id}">
                        <td>${row.nazev || '—'}</td>
                        <td>${row.telefon || '—'}</td>
                        <td>${row.email || '—'}</td>
                        <td>${row.adresaText || '—'}</td>
                        <td>${this.renderActions(row)}</td>
                    </tr>
                `;
            }
            if (section.key === 'warehouses') {
                return `
                    <tr data-id="${row.id}">
                        <td>
                            <div style="display:flex;flex-direction:column;">
                                <strong>${row.nazev || '—'}</strong>
                            </div>
                        </td>
                        <td>${row.supermarketNazev || '—'}</td>
                        <td>${row.kapacita ?? '—'}</td>
                        <td>${row.telefon || '—'}</td>
                        <td>${this.renderActions(row)}</td>
                    </tr>
                `;
            }
            const qty = `${row.mnozstvi ?? 0} / ${row.minMnozstvi ?? 0}`;
            const price = currencyFormatter.format(row.cena || 0);
            return `
                <tr data-id="${row.id}">
                    <td>
                        <div style="display:flex;flex-direction:column;">
                            <strong>${row.nazev || '—'}</strong>
                            ${row.popis ? `<small class="profile-muted" style="margin-top:2px;">${row.popis}</small>` : ''}
                        </div>
                    </td>
                    <td>${row.kategorieNazev || '—'}</td>
                    <td>${row.skladNazev || '—'}</td>
                    <td>${qty}</td>
                    <td>${price}</td>
                    <td>${this.renderActions(row)}</td>
                </tr>
            `;
        }

        renderActions(row) {
            const id = row.id ?? '';
            return `
                <div class="table-actions">
                    <button type="button" class="ghost-btn ghost-strong" data-market-action="edit" data-id="${id}">Editovat</button>
                    <button type="button" class="ghost-btn ghost-muted" data-market-action="delete" data-id="${id}">Smazat</button>
                </div>
            `;
        }

        openModal(section, record) {
            if (!this.form || !this.fieldsContainer) return;
            this.currentSection = section;
            this.currentRecord = record;
            this.form.reset();
            this.fieldsContainer.innerHTML = '';
            section.formFields.forEach(field => {
                this.fieldsContainer.appendChild(this.buildField(field, record));
            });
            if (this.modalTitle) {
                this.modalTitle.textContent = record ? `Editace: ${section.label}` : `Nový ${section.label}`;
            }
            if (this.formStatus) {
                this.formStatus.textContent = '';
            }
            if (this.deleteBtn) {
                this.deleteBtn.style.display = 'none';
            }
            this.showModal();
        }

        buildField(field, record) {
            const wrapper = document.createElement('label');
            const label = document.createElement('span');
            label.textContent = field.label;
            wrapper.appendChild(label);
            let input;
            if (field.type === 'textarea') {
                input = document.createElement('textarea');
            } else if (field.type === 'select') {
                input = document.createElement('select');
            } else {
                input = document.createElement('input');
                input.type = field.type || 'text';
            }
            input.name = field.name;
            if (field.required) {
                input.required = true;
            }
            if (field.maxLength) {
                input.maxLength = field.maxLength;
            }
            if (typeof field.min !== 'undefined') {
                input.min = field.min;
            }
            if (typeof field.step !== 'undefined') {
                input.step = field.step;
            }
            if (field.placeholder) {
                input.placeholder = field.placeholder;
            }
            if (field.type === 'select') {
                const options = typeof field.getOptions === 'function' ? field.getOptions() : (field.options || []);
                const placeholder = field.placeholderOption;
                input.innerHTML = '';
                if (placeholder) {
                    const opt = document.createElement('option');
                    opt.value = '';
                    opt.textContent = placeholder;
                    input.appendChild(opt);
                }
                options.forEach(opt => {
                    const optionEl = document.createElement('option');
                    optionEl.value = opt.value ?? '';
                    optionEl.textContent = opt.label ?? opt.value;
                    input.appendChild(optionEl);
                });
            }
            const value = record && Object.prototype.hasOwnProperty.call(record, field.name) ? record[field.name] : null;
            if (value !== null && value !== undefined) {
                input.value = value;
            }
            wrapper.appendChild(input);
            return wrapper;
        }

        showModal() {
            if (!this.modal) return;
            this.modal.classList.add('active');
            this.modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
        }

        hideModal() {
            if (!this.modal) return;
            this.modal.classList.remove('active');
            this.modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
            this.form?.reset();
            if (this.fieldsContainer) {
                this.fieldsContainer.innerHTML = '';
            }
            if (this.formStatus) {
                this.formStatus.textContent = '';
            }
            this.currentSection = null;
            this.currentRecord = null;
        }

        buildPayload() {
            const payload = {};
            const formData = new FormData(this.form);
            this.currentSection.formFields.forEach(field => {
                let value = formData.get(field.name);
                if (typeof value === 'string') {
                    value = value.trim();
                }
                if (value === '') {
                    value = null;
                }
                if (field.cast === 'number' && value !== null) {
                    value = Number(value);
                }
                payload[field.name] = value;
            });
            payload.id = this.currentRecord?.id ?? null;
            if (this.currentSection?.key === 'supermarkets') {
                payload.adresaId = this.currentRecord?.adresaId ?? null;
            }
            return payload;
        }

        async submitForm() {
            if (!this.form || !this.currentSection) return;
            const token = localStorage.getItem('token');
            if (!token) {
                this.setFormStatus('Přihlaste se prosím.');
                return;
            }
            const payload = this.buildPayload();
            try {
                this.setFormStatus('Ukládám…');
                const response = await fetch(this.apiUrl(this.currentSection.basePath), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = 'landing.html';
                    return;
                }
                if (!response.ok) {
                    const text = await response.text();
                    const err = new Error(text || 'Uložení se nezdařilo.');
                    err.detail = text;
                    throw err;
                }
                this.setFormStatus('Uloženo.');
                await this.refreshAll();
                setTimeout(() => this.hideModal(), 200);
            } catch (error) {
                this.setFormStatus(error.message || 'Uložení se nezdařilo.');
                if (this.currentSection?.key === 'goods') {
                    this.reportDbError(error, 'Uložení zboží se nezdařilo.');
                }
            }
        }

        setFormStatus(text) {
            if (this.formStatus) {
                this.formStatus.textContent = text || '';
            }
        }

        async deleteCurrent() {
            if (!this.currentSection || !this.currentRecord?.id) return;
            this.confirmDelete(this.currentSection, this.currentRecord);
        }

        async confirmDelete(section, record) {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Nejste přihlášeni.');
                return;
            }
            const preview = await this.buildDeletePreview(section, record, token);
            const confirmed = await this.showDeleteDialog(preview);
            if (!confirmed) return;
            try {
                const response = await fetch(this.apiUrl(`${section.basePath}/${record.id}`), {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = 'landing.html';
                    return;
                }
                if (!response.ok) {
                    const text = await response.text();
                    const err = new Error(text || 'Smazání se nezdařilo.');
                    err.detail = text;
                    throw err;
                }
                await this.refreshAll();
                this.hideModal();
            } catch (error) {
                if (section?.key === 'goods') {
                    this.reportDbError(error, 'Smazání zboží se nezdařilo.');
                } else {
                    alert(error.message || 'Smazání se nezdařilo.');
                }
            }
        }

        async buildDeletePreview(section, record, token) {
            const capitalized = this.capitalizeLabel(section?.label || 'záznam');
            const preview = {
                title: `Opravdu smazat ${capitalized}?`,
                subject: record?.nazev || record?.popis || '',
                identifier: typeof record?.id !== 'undefined' ? record.id : null,
                description: 'Smazáním dojde k odstranění záznamu přímo databázovou procedurou.',
                warning: 'Tuto akci nelze vrátit.',
                confirmLabel: `Smazat ${section?.label || 'záznam'}`,
                cancelLabel: 'Zrušit',
                items: []
            };
            if (!record?.id) {
                return preview;
            }
            try {
                if (section.key === 'supermarkets') {
                    const info = await this.fetchDeleteInfo(`/api/market/supermarkets/${record.id}/delete-info`, token);
                    if (info) {
                        preview.subject = info.nazev || preview.subject;
                        if (Number(info.skladCount) > 0) {
                            preview.items.push({ label: 'Sklady', detail: `${info.skladCount}×` });
                        }
                        if (Number(info.zboziCount) > 0) {
                            preview.items.push({ label: 'Zboží', detail: `${info.zboziCount}×` });
                        }
                        if (Number(info.dodavatelCount) > 0) {
                            preview.items.push({ label: 'Vazby na dodavatele', detail: `${info.dodavatelCount}×` });
                        }
                    }
                } else if (section.key === 'warehouses') {
                    const info = await this.fetchDeleteInfo(`/api/market/warehouses/${record.id}/delete-info`, token);
                    if (info) {
                        preview.subject = info.nazev || preview.subject;
                        if (Number(info.zboziCount) > 0) {
                            preview.items.push({ label: 'Zboží', detail: `${info.zboziCount}×` });
                        }
                        if (Number(info.dodavatelCount) > 0) {
                            preview.items.push({ label: 'Vazby na dodavatele', detail: `${info.dodavatelCount}×` });
                        }
                    }
                } else if (section.key === 'goods') {
                    preview.items = [
                        { label: 'Zboží', detail: '1×' },
                        { label: 'Vazby na dodavatele', detail: 'všechny navázané' }
                    ];
                }
                if (preview.items.length) {
                    preview.description = 'Databázová procedura odstraní také následující vazby:';
                }
            } catch (error) {
                console.warn('Nepodařilo se načíst detaily pro mazání', error);
            }
            return preview;
        }

        async showDeleteDialog(preview) {
            if (!preview) {
                return window.confirm('Opravdu chcete smazat tento záznam?');
            }
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.className = 'modal active';
                overlay.style.zIndex = '9999';
                const subjectLine = preview.subject
                    ? `<p class="profile-muted" style="margin:6px 0 0;"><strong>${this.escapeHtml(preview.subject)}</strong></p>`
                    : '';
                const details = (preview.items || []).length
                    ? `<ul style="margin:12px 0 0 18px; padding-left:0; list-style:disc;">${preview.items.map(item =>
                        `<li><strong>${this.escapeHtml(item.label || '')}</strong>${item.detail ? `<span class="profile-muted" style="margin-left:6px;">${this.escapeHtml(item.detail)}</span>` : ''}</li>`
                    ).join('')}</ul>`
                    : '<p class="profile-muted" style="margin-top:12px;">Odstraní se pouze tento záznam.</p>';
                overlay.innerHTML = `
                    <div class="modal-content" role="dialog" aria-modal="true" style="max-width:520px;">
                        <div class="modal-header">
                            <h3 style="margin:0;">${this.escapeHtml(preview.title || 'Smazání záznamu')}</h3>
                            <button type="button" class="ghost-btn ghost-muted" data-market-delete="close" aria-label="Zavřít">×</button>
                        </div>
                        ${subjectLine}
                        <p style="margin-top:12px;">${this.escapeHtml(preview.description || 'Smazáním dojde k odstranění záznamu v databázi.')}</p>
                        ${details}
                        <p class="profile-muted" style="margin-top:12px;">${this.escapeHtml(preview.warning || 'Akci není možné vrátit.')}</p>
                        <div class="modal-actions" style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
                            <button type="button" class="ghost-btn ghost-muted" data-market-delete="cancel">${this.escapeHtml(preview.cancelLabel || 'Zrušit')}</button>
                            <button type="button" class="ghost-btn ghost-strong" data-market-delete="confirm">${this.escapeHtml(preview.confirmLabel || 'Smazat')}</button>
                        </div>
                    </div>
                `;
                const cleanup = (result) => {
                    if (overlay.dataset.closed) return;
                    overlay.dataset.closed = '1';
                    overlay.remove();
                    document.removeEventListener('keydown', escHandler);
                    resolve(result);
                };
                const escHandler = (event) => {
                    if (event.key === 'Escape') {
                        cleanup(false);
                    }
                };
                document.addEventListener('keydown', escHandler);
                overlay.addEventListener('click', (event) => {
                    if (event.target === overlay) {
                        cleanup(false);
                    }
                });
                overlay.querySelector('[data-market-delete="close"]')?.addEventListener('click', () => cleanup(false));
                overlay.querySelector('[data-market-delete="cancel"]')?.addEventListener('click', () => cleanup(false));
                overlay.querySelector('[data-market-delete="confirm"]')?.addEventListener('click', () => cleanup(true));
                document.body.appendChild(overlay);
            });
        }

        escapeHtml(input) {
            if (input === null || input === undefined) {
                return '';
            }
            return String(input)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        capitalizeLabel(text) {
            if (!text) return '';
            return text.charAt(0).toUpperCase() + text.slice(1);
        }

        async fetchDeleteInfo(path, token) {
            try {
                const response = await fetch(this.apiUrl(path), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = 'landing.html';
                    return null;
                }
                if (!response.ok) {
                    throw new Error(await response.text());
                }
                return await response.json();
            } catch (error) {
                console.warn('Nepodařilo se načíst detaily pro mazání', error);
                return null;
            }
        }

        render() {
            Object.values(this.sections).forEach(section => this.renderSection(section));
        }

        reportDbError(error, fallbackText) {
            const message = (error && error.message && error.message !== '[object Object]')
                ? error.message
                : (fallbackText || 'Došlo k chybě.');
            const detail = error?.detail || error?.stack || error?.message || '';
            if (typeof window !== 'undefined' && typeof window.showDbError === 'function') {
                window.showDbError(message, detail);
            } else {
                alert(message);
            }
        }
    }
    class OrdersModule {
        constructor(state, deps = {}) {
            this.state = state;
            this.apiUrl = deps.apiUrl;
            this.refreshApp = typeof deps.refreshApp === 'function' ? deps.refreshApp : async () => true;
            this.tableBody = document.getElementById('orders-table-body');
            this.statusBoard = document.getElementById('order-status-board');
            this.orderLines = document.getElementById('order-lines');
            this.orderLinesTitle = document.getElementById('order-lines-title');
            this.orderLinesBadge = document.getElementById('order-lines-badge');
            this.ordersCount = document.getElementById('orders-count');
            this.addBtn = document.getElementById('order-add-btn');
            this.editBtn = document.getElementById('order-edit-btn');
            this.deleteBtn = document.getElementById('order-delete-btn');
            this.modal = document.getElementById('order-modal');
            this.form = document.getElementById('order-form');
            this.modalTitle = document.getElementById('order-modal-title');
            this.formStatus = document.getElementById('order-form-status');
            this.typeSelect = document.getElementById('order-type');
            this.storeSelect = document.getElementById('order-store');
            this.employeeSelect = document.getElementById('order-employee');
            this.statusSelect = document.getElementById('order-status');
            this.dateInput = document.getElementById('order-date');
            this.noteInput = document.getElementById('order-note');
            this.cancelBtn = document.getElementById('order-cancel-btn');
            this.closeBtn = document.getElementById('order-modal-close');
            this.saveBtn = document.getElementById('order-save-btn');
            this.options = { statuses: [], stores: [], employees: [], types: [] };
        }

        init() {
            this.tableBody?.addEventListener('click', event => {
                const row = event.target.closest('tr[data-order-id]');
                if (!row) return;
                this.state.selectedOrderId = row.dataset.orderId;
                this.highlightSelection();
                this.renderOrderLines();
                this.syncActionButtons();
            });
            this.addBtn?.addEventListener('click', () => this.openForm());
            this.editBtn?.addEventListener('click', () => this.openForm(this.state.selectedOrderId));
            this.deleteBtn?.addEventListener('click', () => this.confirmDelete());
            this.cancelBtn?.addEventListener('click', () => this.closeModal());
            this.closeBtn?.addEventListener('click', () => this.closeModal());
            this.modal?.addEventListener('click', event => {
                if (event.target === this.modal) {
                    this.closeModal();
                }
            });
            this.form?.addEventListener('submit', event => {
                event.preventDefault();
                this.submitForm();
            });
            this.loadOptions();
            this.syncActionButtons();
        }

        async loadOptions() {
            this.options = this.buildFallbackOptions();
            if (!this.apiUrl) {
                this.syncFormSelects();
                return;
            }
            const token = localStorage.getItem('token') || '';
            if (!token) {
                this.syncFormSelects();
                return;
            }
            try {
                const response = await fetch(this.apiUrl('/api/orders/options'), {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
                if (response.ok) {
                    const payload = await response.json();
                    this.options = {
                        statuses: Array.isArray(payload.statuses) ? payload.statuses : this.options.statuses,
                        stores: Array.isArray(payload.stores) ? payload.stores : this.options.stores,
                        employees: Array.isArray(payload.employees) ? payload.employees : this.options.employees,
                        types: Array.isArray(payload.types) ? payload.types : this.options.types
                    };
                }
            } catch (error) {
                console.warn('Orders options load failed', error);
            } finally {
                this.syncFormSelects();
            }
        }

        buildFallbackOptions() {
            const statuses = Array.isArray(this.state.data.statuses)
                ? this.state.data.statuses.map(stat => ({ id: stat.code, label: stat.label }))
                : [];
            const stores = Array.isArray(this.state.data.stores)
                ? this.state.data.stores.map(store => typeof store === 'string'
                    ? { id: store, label: store }
                    : { id: store.name || store.city || Math.random(), label: store.name || store.city || 'Prodejna' })
                : [];
            const employees = Array.isArray(this.state.data.employees)
                ? this.state.data.employees.map(emp => ({ id: emp.id?.replace('EMP-', '') || emp.id || emp.name || '0', label: emp.name || emp.id || 'Uzivatel' }))
                : [];
            const types = Array.from(new Set((this.state.data.orders || []).map(o => o.type).filter(Boolean)));
            return {
                statuses,
                stores,
                employees,
                types: types.length ? types : ['INTERNI', 'ZAKAZNIK']
            };
        }

        syncFormSelects(order = null) {
            if (this.typeSelect) {
                this.populateSelect(this.typeSelect, this.options.types.map(type => ({ id: type, label: type })), order?.type || 'INTERNI');
            }
            if (this.storeSelect) {
                this.populateSelect(this.storeSelect, this.options.stores, order?.store);
            }
            if (this.employeeSelect) {
                this.populateSelect(this.employeeSelect, this.options.employees, order?.employeeId || order?.employee);
            }
            if (this.statusSelect) {
                this.populateSelect(this.statusSelect, this.options.statuses, order?.statusCode || order?.status);
            }
        }

        populateSelect(selectEl, options, selected) {
            if (!selectEl) return;
            const safeOptions = Array.isArray(options) ? options : [];
            selectEl.innerHTML = safeOptions.map(opt => `<option value="${opt.id ?? ''}">${opt.label ?? opt.id ?? ''}</option>`).join('');
            if (selected !== undefined && selected !== null) {
                const normalized = String(selected).replace('EMP-', '');
                const match = Array.from(selectEl.options).find(opt => opt.value == normalized || opt.textContent === normalized);
                if (match) {
                    selectEl.value = match.value;
                }
            }
        }

        render() {
            if (!this.tableBody) return;
            const orders = Array.isArray(this.state.data.orders) ? this.state.data.orders : [];
            this.tableBody.innerHTML = orders.map(order => `
                <tr data-order-id="${order.id}">
                    <td>${order.type}</td>
                    <td>${order.store}</td>
                    <td>${order.employee}</td>
                    <td>${order.supplier}</td>
                    <td><span class="status-badge info">${order.status}</span></td>
                    <td>${new Date(order.date).toLocaleString('cs-CZ')}</td>
                    <td>${currencyFormatter.format(order.amount)}</td>
                </tr>
            `).join('');
            const orders = this.getOrders();
            if (!orders.length) {
                this.tableBody.innerHTML = '<tr><td colspan="7" class="table-placeholder">Žádné objednávky</td></tr>';
            } else {
                this.tableBody.innerHTML = orders.map(order => this.renderOrderRow(order)).join('');
            }
            if (this.ordersCount) {
                this.ordersCount.textContent = orders.length;
            }
            if (!this.state.selectedOrderId && orders.length) {
                this.state.selectedOrderId = orders[0].id;
            }
            this.highlightSelection();
            this.renderStatusBoard();
            this.renderOrderLines();
            this.syncActionButtons();
        }

        renderStatusBoard() {
            if (!this.statusBoard) return;
            const statuses = Array.isArray(this.state.data.statuses) ? this.state.data.statuses : [];
            this.statusBoard.innerHTML = statuses.map(stat => `
                <div class="pill-card">
                    <strong>${stat.label}</strong>
                    <p>${stat.count} objednavek</p>
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
            const orders = this.getOrders();
            const activeOrder = orders.find(o => o.id === orderId);
            this.orderLinesTitle.textContent = activeOrder
                ? `Složení: ${activeOrder.store || activeOrder.type || 'Objednávka'}`
                : 'Složení objednávky';
            this.orderLinesBadge.textContent = activeOrder
                ? (activeOrder.status || activeOrder.type || 'vybráno')
                : 'nevybráno';
            this.orderLinesTitle.textContent = 'Slozeni objednavky';
            this.orderLinesBadge.textContent = orderId ? 'vybrana' : '-';
            const lines = (this.state.data.orderItems || []).filter(item => item.orderId === orderId);
            this.orderLines.innerHTML = lines.length
                ? lines.map(line => `<li>${line.sku} &times; ${line.name} — ${line.qty} ks · ${currencyFormatter.format(line.price)}</li>`).join('')
                : '<p class="profile-muted">Žádná data o položkách.</p>';
        }

        openForm(orderId = null) {
            if (!this.form || !this.modal) return;
            const order = (this.state.data.orders || []).find(o => o.id === orderId) || null;
            this.form.dataset.mode = order ? 'edit' : 'create';
            this.form.dataset.orderId = order?.id || '';
            if (this.modalTitle) {
                this.modalTitle.textContent = order ? 'Editovat objednavku' : 'Nova objednavka';
            }
            this.syncFormSelects(order);
            if (this.dateInput) {
                this.dateInput.value = order?.date ? this.formatDateForInput(order.date) : new Date().toISOString().slice(0, 16);
            }
            if (this.noteInput) {
                this.noteInput.value = order?.note || '';
            }
            if (this.formStatus) {
                this.formStatus.textContent = '';
            }
            this.modal.classList.add('active');
            this.modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
        }

        closeModal() {
            if (!this.modal) return;
            this.modal.classList.remove('active');
            this.modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
        }

        formatDateForInput(value) {
            if (!value) return '';
            return value.replace(' ', 'T').slice(0, 16);
        }

        async submitForm() {
            if (!this.form || !this.apiUrl) {
                return;
            }
            const mode = this.form.dataset.mode || 'create';
            const orderId = this.form.dataset.orderId || this.state.selectedOrderId || '';
            const payload = {
                statusId: this.statusSelect?.value ? Number(this.statusSelect.value) : null,
                statusCode: this.statusSelect?.value || null,
                storeId: this.storeSelect?.value ? Number(this.storeSelect.value) : null,
                storeName: this.storeSelect?.selectedOptions?.[0]?.textContent?.trim() || null,
                employeeId: this.employeeSelect?.value ? Number(this.employeeSelect.value) : null,
                type: this.typeSelect?.value || 'INTERNI',
                date: this.dateInput?.value || null,
                note: this.noteInput?.value || null
            };
            if (this.formStatus) {
                this.formStatus.textContent = 'Ukladam...';
            }
            if (this.saveBtn) {
                this.saveBtn.disabled = true;
            }
            try {
                const token = localStorage.getItem('token') || '';
                const response = await fetch(mode === 'edit' ? this.apiUrl(`/api/orders/${orderId}`) : this.apiUrl('/api/orders'), {
                    method: mode === 'edit' ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Ulozeni se nezdarilo.');
                }
                const result = await response.json().catch(() => null);
                if (this.formStatus) {
                    this.formStatus.textContent = 'Ulozeno.';
                }
                if (result?.id) {
                    this.state.selectedOrderId = result.id;
                }
                await this.refreshApp();
                this.closeModal();
            } catch (error) {
                if (this.formStatus) {
                    this.formStatus.textContent = error.message || 'Akce se nezdarila.';
                }
            } finally {
                if (this.saveBtn) {
                    this.saveBtn.disabled = false;
                }
            }
        }

        async confirmDelete() {
            if (!this.apiUrl) return;
            const orderId = this.state.selectedOrderId;
            if (!orderId) {
                if (this.formStatus) {
                    this.formStatus.textContent = 'Vyberte objednavku pro smazani.';
                }
                return;
            }
            const order = this.getOrders().find(o => o.id === orderId);
            const label = order
                ? `${order.store || 'Objednávka'} (${order.status || order.type || ''})`.trim()
                : 'vybranou objednavku';
            if (!window.confirm(`Opravdu smazat ${label}?`)) {
                return;
            }
            try {
                const token = localStorage.getItem('token') || '';
                const response = await fetch(this.apiUrl(`/api/orders/${orderId}`), {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'Smazani se nezdarilo.');
                }
                this.state.selectedOrderId = null;
                await this.refreshApp();
            } catch (error) {
                alert(error.message || 'Smazani se nezdarilo.');
            }
        }

        syncActionButtons() {
            const hasSelection = !!this.state.selectedOrderId;
            if (this.editBtn) {
                this.editBtn.disabled = !hasSelection;
            }
            if (this.deleteBtn) {
                this.deleteBtn.disabled = !hasSelection;
            }
        }

        getOrders() {
            return Array.isArray(this.state.data.orders) ? this.state.data.orders : [];
        }

        renderOrderRow(order) {
            const dateText = this.formatOrderDate(order?.date);
            const amount = typeof order?.amount === 'number' ? order.amount : 0;
            const statusClass = this.resolveStatusClass(order);
            const typeClass = this.resolvePriorityClass(order?.priority);
            const noteHtml = order?.note ? `<small class="profile-muted">${this.escapeHtml(order.note)}</small>` : '';
            return `
                <tr data-order-id="${order.id}">
                    <td><span class="status-badge ${typeClass}">${order.type || '—'}</span></td>
                    <td>
                        <div class="order-cell">
                            <strong>${order.store || '—'}</strong>
                            ${noteHtml}
                        </div>
                    </td>
                    <td>${order.supplier || '—'}</td>
                    <td>${order.employee || '—'}</td>
                    <td><span class="status-badge ${statusClass}">${order.status || '—'}</span></td>
                    <td>${dateText}</td>
                    <td>${currencyFormatter.format(amount)}</td>
                </tr>
            `;
        }

        formatOrderDate(value) {
            if (!value) {
                return '—';
            }
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return '—';
            }
            return date.toLocaleString('cs-CZ');
        }

        resolveStatusClass(order) {
            const label = (order?.status || '').toLowerCase();
            if (label.includes('dokon') || label.includes('doruc')) {
                return 'success';
            }
            if (label.includes('zrus') || label.includes('storno')) {
                return 'danger';
            }
            if (label.includes('cek') || label.includes('nova') || label.includes('nová')) {
                return 'warning';
            }
            return 'info';
        }

        resolvePriorityClass(priority) {
            if (!priority) {
                return 'info';
            }
            if (priority === 'high') {
                return 'danger';
            }
            if (priority === 'medium') {
                return 'warning';
            }
            return 'success';
        }

        escapeHtml(text) {
            if (text === null || text === undefined) {
                return '';
            }
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
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
                        <small>${role.count} uzivatelu</small>
                    </div>
                `).join('')
                : '<p class="profile-muted">Zadne role nejsou k dispozici.</p>';
        }
    }

    class FinanceModule {
        constructor(state, deps = {}) {
            this.state = state;
            this.apiUrl = deps.apiUrl;
            this.tableBody = document.getElementById('payments-table-body');
            this.statsEl = document.getElementById('payment-stats');
            this.receiptList = document.getElementById('receipt-list');
            this.filterButtons = document.querySelectorAll('[data-payment-filter]');
            this.allPayments = [];
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
            this.loadPayments();
        }

        async loadPayments() {
            if (!this.apiUrl) {
                this.render();
                return;
            }
            const token = localStorage.getItem('token') || '';
            try {
                const response = await fetch(this.apiUrl(`/api/platby`), {
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
                if (response.ok) {
                    const payload = await response.json();
                    if (Array.isArray(payload)) {
                        this.allPayments = payload;
                        this.state.data.payments = payload;
                    }
                } else {
                    console.error('Payments API error', await response.text());
                }
            } catch (error) {
                console.error('Failed to load payments', error);
            } finally {
                this.render();
            }
        }

        resolveTypeLabel(type) {
            const normalized = (type || '').toUpperCase();
            if (normalized === 'H') return 'Hotove';
            if (normalized === 'K') return 'Karta';
            if (normalized === 'U') return 'Ucet';
            return 'Jine';
        }

        resolveTypeClass(type) {
            const normalized = (type || '').toUpperCase();
            if (normalized === 'H') return 'type-h';
            if (normalized === 'K') return 'type-k';
            if (normalized === 'U') return 'type-u';
            return 'type-other';
        }

        buildGlow(segments) {
            const base = [
                'inset 0 0 0 1px var(--border)',
                '0 12px 26px rgba(15, 23, 42, 0.16)'
            ];
            const total = segments.reduce((sum, seg) => sum + seg.value, 0) || 1;
            const glows = segments
                .filter(seg => seg.value > 0)
                .map(seg => {
                    const weight = seg.value / total;
                    const blur = 14 + weight * 22;
                    const spread = 6 + weight * 10;
                    const alpha = 0.18 + weight * 0.35;
                    const color = this.hexToRgba(seg.color, alpha);
                    return `0 0 ${blur}px ${spread}px ${color}`;
                });
            const fallback = '0 0 18px 10px rgba(12, 21, 53, 0.12)';
            return [...base, ...(glows.length ? glows : [fallback])].join(', ');
        }

        hexToRgba(hex, alpha = 1) {
            const clean = hex.replace('#', '');
            const bigint = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
            const r = (bigint >> 16) & 255;
            const g = (bigint >> 8) & 255;
            const b = bigint & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        render() {
            if (!this.tableBody) return;
            const payments = this.allPayments.length
                ? this.allPayments
                : (Array.isArray(this.state.data.payments) ? this.state.data.payments : []);
            const filtered = payments.filter(p => this.state.paymentFilter === 'all' || p.type === this.state.paymentFilter);
            this.tableBody.innerHTML = filtered.length
                ? filtered.map(p => {
                    const typeClass = this.resolveTypeClass(p.type);
                    const statusClass = (p.status || '').toLowerCase().startsWith('zprac') ? 'success' : 'warning';
                    return `
                        <tr class="payment-row ${typeClass}">
                            <td><span class="pay-type ${typeClass}">${this.resolveTypeLabel(p.type)}</span></td>
                            <td class="payment-method">${p.method || '–'}</td>
                            <td>${currencyFormatter.format(p.amount || 0)}</td>
                            <td>${p.date || ''}</td>
                            <td><span class="status-badge ${statusClass}">${p.status || ''}</span></td>
                        </tr>
                    `;
                }).join('')
                : '<tr><td colspan="5" style="text-align:center;">Zadne platby</td></tr>';

            const cash = payments.filter(p => p.type === 'H').reduce((sum, payment) => sum + (payment.amount || 0), 0);
            const card = payments.filter(p => p.type === 'K').reduce((sum, payment) => sum + (payment.amount || 0), 0);
            const account = payments.filter(p => p.type === 'U').reduce((sum, payment) => sum + (payment.amount || 0), 0);
            const total = cash + card + account || 1;

            if (this.statsEl) {
                const pct = (value) => Math.round((value / total) * 100);
                const segments = [
                    { key: 'K', label: 'Platebni karty', value: card, color: '#4361ee' },
                    { key: 'H', label: 'Hotovostni pokladny', value: cash, color: '#f05d5e' },
                    { key: 'U', label: 'Ucet', value: account, color: '#7c3aed' }
                ];
                let current = 0;
                const gradientParts = segments.map(seg => {
                    const width = (seg.value / total) * 100;
                    const start = current;
                    const end = current + width;
                    current = end;
                    return `${seg.color} ${start}% ${end}%`;
                }).filter(Boolean);
                const gradient = gradientParts.length
                    ? `conic-gradient(${gradientParts.join(',')})`
                    : 'conic-gradient(#e5e7eb 0 100%)';
                const glow = this.buildGlow(segments);
                const totalRaw = cash + card + account;

                this.statsEl.innerHTML = `
                    <div class="income-chart">
                        <div class="income-donut" style="background:${gradient}; box-shadow:${glow}"></div>
                        <div class="income-legend">
                            ${segments.map(seg => `
                                <div class="legend-row" style="--legend-color:${seg.color}">
                                    <span class="legend-dot" style="background:${seg.color}"></span>
                                    <div class="legend-label">
                                        <strong>${seg.label}</strong>
                                        <small>${currencyFormatter.format(seg.value)}</small>
                                    </div>
                                    <span class="legend-pct">${pct(seg.value)}%</span>
                                </div>
                            `).join('')}
                            <div class="income-total">
                                <p>Celkem</p>
                                <strong>${currencyFormatter.format(totalRaw)}</strong>
                            </div>
                        </div>
                    </div>
                `;
            }

            if (this.receiptList) {
                this.receiptList.innerHTML = payments
                    .filter(p => p.receipt)
                    .map(p => `<li>Uctenka k platbe ${this.resolveTypeLabel(p.type)} — ${currencyFormatter.format(p.amount || 0)} (${p.method || '–'})</li>`)
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
            const safeText = this.escapeHtml(text || 'Zadne zpravy zatim nemame.');
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
                this.collapseBtn.setAttribute('aria-label', this.isPanelOpen ? 'Zavrit chat' : 'Otevrit chat');
                this.collapseBtn.title = this.isPanelOpen ? 'Zavrit chat' : 'Otevrit chat';
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
                this.renderPlaceholder('Zadne zpravy zatim nemame.');
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
                this.contactsList.innerHTML = `<p class="profile-muted">${term ? 'Zadne vysledky hledani.' : 'Zatim nemate zadna vlakna.'}</p>`;
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
                        user.role || user.roleCode || 'Uzivatel'
                ));
            });
            (this.state.data.customers || []).forEach(customer => {
                if (!customer?.email) {
                    return;
                }
                addDescriptor(this.makeContactDescriptor(
                        customer.email,
                        customer.name || customer.email,
                        'Zakaznik'
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
                    meta: user.role || user.roleCode || 'Uzivatel'
                });
            });
            (this.state.data.customers || []).forEach(customer => {
                if (!customer?.email) {
                    return;
                }
                map.set(this.normalizeEmail(customer.email), {
                    label: customer.name || customer.email,
                    meta: 'Zakaznik'
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
                this.selectedLabel.textContent = 'Vyberte kontakt vlevo nebo pouzijte vyhledavani.';
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
                        this.renderPlaceholder('Nepodarilo se nacist zpravy.');
                    }
                    this.setFormStatus('Nepodarilo se nacist zpravy.', false);
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
                '??','??','??','??','??','??','??','??','??','??','??','??','??','??','??','??',
                '??','??','??','??','??','??','??','??','??','??','??','??','??','??','??','??',
                '??','??','??','??','??','??','??','??','??','??','??','??','??','??','??','??',
                '??','?','??','??','??','??','??','??','??','??','??','??','??','?','?','?',
                '?','??','??','?','??','??','??','??','??','??','??','??','??','??','??','??'
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
                throw new Error('Upravit zpravu se nepodarilo.');
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
                const title = message.sender || 'Nova zprava';
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
                    alert('Povolte prosim notifikace v prohlizeci.');
                    return;
                }
                await registration.showNotification('Test push', {
                    body: 'Tohle je ukazkove upozorneni z aplikace.',
                    tag: `bdas-test-${Date.now()}`,
                    renotify: false
                });
                this.logger('push:test shown');
            } catch (error) {
                console.error('Test push failed', error);
                alert(error.message || 'Test push se nepodaril.');
            }
        }

        async refreshPushState() {
            if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
                this.pushToggleLocked = true;
                this.pushError = 'Push nepodporuje prohlizec.';
                this.setPushToggleState(false, 'Push nedostupny');
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
                this.pushError = error?.message || 'Push neni dostupny.';
                this.pushToggleLocked = true;
                this.setPushToggleState(false, 'Push nedostupny');
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
                alert(error.message || 'Nepodarilo se zmenit stav push upozorneni.');
            } finally {
                this.pushToggleLoading = false;
                this.pushToggle?.classList.remove('loading');
            }
        }

        async subscribeToPush() {
            if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
                throw new Error('Prohlizec nepodporuje push notifikace.');
            }
            const token = this.getAuthToken();
            const username = localStorage.getItem('username') || localStorage.getItem('email');
            if (!token || !username) {
                throw new Error('Pro prihlaseni odberu se nejdriv prihlaste.');
            }
            this.logger('push:subscribe request');
            const registration = await this.getServiceWorkerRegistration();
            const permission = await Notification.requestPermission();
            this.logger('push:permission', permission);
            if (permission !== 'granted') {
                this.setPushToggleState(false, 'Povolte push v prohlizeci');
                throw new Error('Povoleni pro upozorneni bylo zamitnuto. Povolit v nastaveni prohlizece.');
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
                this.pushError = error?.message || 'Service worker se nepodarilo zaregistrovat.';
                this.pushToggleLocked = true;
                this.setPushToggleState(false, 'Push nedostupny');
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
                throw new Error('Server odber odmitl.');
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
                    sender: data.sender?.email || data.senderEmail || data.sender || 'Neznamy',
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
                this.setFormStatus('Zprava je prazdna.', false);
                return false;
            }
            if (!receiver) {
                this.setFormStatus('Vyplnte prosim adresata.', false);
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
                    this.setFormStatus('? Upraveno', true);
                    return true;
                } else {
                    if (!this.connected) {
                        await this.initWebsocket();
                    }
                    if (!this.client || !this.connected) {
                        throw new Error('Spojeni s chatem neni dostupne.');
                    }
                    this.logger('send:payload', { receiver, length: content.length });
                    this.client.send('/app/chat', { Authorization: `Bearer ${token}` }, JSON.stringify({ content, receiver }));
                    if (!customPayload && this.messageInput) {
                        this.messageInput.value = '';
                        this.autoResizeMessage();
                    }
                    const optimisticMessage = {
                        id: `temp-${Date.now()}`,
                        sender: this.state.data.profile?.email || this.currentUserEmail || localStorage.getItem('email') || 'ja',
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
                    this.setFormStatus('? Odeslano', true);
                    this.logger('send:optimistic', optimisticMessage);
                    return true;
                }
            } catch (error) {
                console.error('Chat send failed', error);
                this.setFormStatus(error.message || 'Odeslani selhalo.', false);
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
                    <div class="product-icon">${prod.image || '??'}</div>
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
                        <button data-clear-cart type="button">Vyprazdnit</button>
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
                : '<p>Zadne vysledky, zkuste jiny dotaz.</p>';
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
                onBlocked: () => alert('Na tuto sekci nemate pristup. Presmerovavam na Prehled.')
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
            this.inventory = new InventoryModule(state, { apiUrl });
            this.orders = new OrdersModule(state, {
                apiUrl,
                refreshApp: () => this.refreshData()
            });
            this.people = new PeopleModule(state);
            this.finance = new FinanceModule(state, { apiUrl });
            this.records = new RecordsModule(state);
        this.chat = new ChatModule(state, {
            apiUrl,
            publicKey: webpushPublicKey,
            serviceWorkerPath
        });
        this.customer = new CustomerModule(state);
        this.customerOrders = new CustomerOrdersView(state, currencyFormatter, { apiUrl, refreshWalletChip: () => this.updateWalletChip() });
        this.search = new GlobalSearch(state);
        this.supplier = new SupplierModule(state, { apiUrl });
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
            this.supplier.init();
            this.registerUtilityButtons();
            this.renderAll();
            this.startMessagePolling();
        }

        
        registerUtilityButtons() {
            const walletBtn = document.getElementById("wallet-btn");
            walletBtn?.addEventListener('click', () => this.openWalletPanel());
            this.updateWalletChip();
            document.getElementById("new-order-btn")?.addEventListener("click", () => {
                if (this.orders && typeof this.orders.openForm === 'function') {
                    this.orders.openForm();
                } else {
                    alert("Pruvodce vytvorenim objednavky bude brzy dostupny.");
                }
            });
            document.getElementById("new-store-btn")?.addEventListener("click", () => alert("Pruvodce otevrenim prodejny bude brzy dostupny."));
            document.getElementById("export-store-btn")?.addEventListener("click", () => alert("Export seznamu prodejen bude brzy pripraven."));
            document.getElementById("upload-btn")?.addEventListener("click", () => alert("Nahravani souboru pridame pozdeji."));
            const exitBtn = document.getElementById("impersonation-exit-btn");
            if (exitBtn) {
                const isImpersonating = !!localStorage.getItem("admin_original_token");
                exitBtn.style.display = isImpersonating ? "inline-flex" : "none";
                exitBtn.addEventListener("click", () => {
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
            chip.textContent = '< Zpet k puvodnimu uctu';
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

        openWalletPanel() {
            this.ensureWalletPanel();
            this.walletOverlay.style.display = 'flex';
            this.loadWalletData();
        }

        ensureWalletPanel() {
            if (this.walletOverlay) {
                return;
            }
            const overlay = document.createElement('div');
            overlay.className = 'wallet-overlay';
            const panel = document.createElement('div');
            panel.className = 'wallet-panel';
            panel.innerHTML = `
                <div class="wallet-header" style="grid-column:1/-1;">
                    <div>
                        <p class="muted-label">Muj ucet</p>
                        <div class="wallet-balance" id="wallet-balance">Nacitam...</div>
                    </div>
                    <button class="wallet-download" type="button" id="wallet-download" title="Stáhnout výpis"><span class="material-symbols-rounded" aria-hidden="true">download</span></button><button class="wallet-close" type="button" id="wallet-close">
                        <span class="material-symbols-rounded" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="panel" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06);">
                    <h3 style="margin-top:0;">Historie</h3>
                    <ul class="wallet-history" id="wallet-history"></ul>
                </div>
                <div class="panel" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06);">
                    <h3 style="margin-top:0;">Dobiti</h3>
                    <form class="wallet-form" id="wallet-form">
                        <div>
                            <label>Castka</label>
                            <input type="number" step="0.01" min="0" id="wallet-amount" required placeholder="200">
                        </div>
                        <div>
                            <label>Metoda</label>
                            <select id="wallet-method">
                                <option value="HOTOVOST">Hotovost</option>
                                <option value="KARTA">Karta</option>
                            </select>
                        </div>
                        <div id="wallet-card-wrap" style="display:none;">
                            <label>Cislo karty</label>
                            <input type="text" id="wallet-card" placeholder="4111 1111 1111 1111">
                        </div>
                        <div>
                            <label>Poznamka</label>
                            <input type="text" id="wallet-note" placeholder="Dobiti">
                        </div>
                        <div class="wallet-actions">
                            <button type="submit" class="primary-btn" id="wallet-submit">Dobit ucet</button>
                        </div>
                        <div class="chat-status" id="wallet-status"></div>
                    </form>
                </div>
            `;
            overlay.appendChild(panel);
            document.body.appendChild(overlay);
            this.walletOverlay = overlay;
            this.walletBalanceEl = panel.querySelector('#wallet-balance');
            this.walletHistoryList = panel.querySelector('#wallet-history');
            this.walletStatus = panel.querySelector('#wallet-status');
            const closeBtn = panel.querySelector('#wallet-close');
            const downloadBtn = panel.querySelector('#wallet-download');
            downloadBtn?.addEventListener('click', () => this.downloadWalletStatement());
            closeBtn.addEventListener('click', () => overlay.style.display = 'none');
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.style.display = 'none';
                }
            });
            const methodSelect = panel.querySelector('#wallet-method');
            const cardWrap = panel.querySelector('#wallet-card-wrap');
            methodSelect.addEventListener('change', () => {
                cardWrap.style.display = methodSelect.value === 'KARTA' ? 'block' : 'none';
            });
            const form = panel.querySelector('#wallet-form');
            form.addEventListener('submit', async (ev) => {
                ev.preventDefault();
                await this.submitWalletTopUp();
            });
        }

        async loadWalletData() {
            if (!this.walletData) {
                this.walletData = { balance: 0, history: [] };
            }
            try {
                if (this.walletStatus) {
                    this.walletStatus.textContent = 'Nacitam...';
                }
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Chybi prihlaseni.');
                }
                const [balanceRes, historyRes] = await Promise.all([
                    fetch(apiUrl('/api/wallet'), { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(apiUrl('/api/wallet/history'), { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                if (!balanceRes.ok) {
                    throw new Error(await balanceRes.text() || 'Nelze nacist zustatek.');
                }
                if (!historyRes.ok) {
                    throw new Error(await historyRes.text() || 'Nelze nacist historii.');
                }
                const balance = await balanceRes.json();
                const history = await historyRes.json();
                if (this.walletBalanceEl) {
                    const val = balance && typeof balance.balance !== 'undefined' ? balance.balance : 0;
                    this.walletBalanceEl.textContent = currencyFormatter.format(val || 0);
                    this.setWalletChipBalance(val || 0);
                    this.walletData.balance = val || 0;
                }
                if (this.walletHistoryList) {
                    this.walletHistoryList.innerHTML = '';
                    this.walletData.history = Array.isArray(history) ? history : [];
                    (history || []).forEach(item => {
                        const li = document.createElement('li');
                        const dir = ((item.direction || '').toUpperCase() === 'P') ? '+' : '-';
                        li.innerHTML = `
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <strong>${dir} ${currencyFormatter.format(item.amount || 0)}</strong>
                                <span class="meta">${item.method || ''}</span>
                            </div>
                            <div class="meta">${item.note || ''}</div>
                            <div class="meta">${item.createdAt || ''}${item.orderId ? ' · objednavka ' + item.orderId : ''}</div>
                        `;
                        this.walletHistoryList.appendChild(li);
                    });
                }
                if (this.walletStatus) {
                    this.walletStatus.textContent = '';
                }
            } catch (error) {
                console.error('wallet load failed', error);
                if (this.walletStatus) {
                    this.walletStatus.textContent = error.message || 'Chyba nacitani penezky.';
                }
            }
        }

        async submitWalletTopUp() {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Nejste prihlasen.');
                return;
            }
            const amountEl = this.walletOverlay.querySelector('#wallet-amount');
            const methodEl = this.walletOverlay.querySelector('#wallet-method');
            const cardEl = this.walletOverlay.querySelector('#wallet-card');
            const noteEl = this.walletOverlay.querySelector('#wallet-note');
            const submitBtn = this.walletOverlay.querySelector('#wallet-submit');
            const amount = parseFloat(amountEl.value);
            const method = methodEl.value;
            const card = cardEl.value;
            const note = noteEl.value;
            if (!amount || amount <= 0) {
                this.walletStatus.textContent = 'Zadejte castku vetsi nez 0.';
                return;
            }
            if (method === 'KARTA' && (!card || card.trim().length < 4)) {
                this.walletStatus.textContent = 'Zadejte cislo karty.';
                return;
            }
            submitBtn.disabled = true;
            this.walletStatus.textContent = 'Odesilam...';
            try {
                const response = await fetch(apiUrl('/api/wallet/topup'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        amount,
                        method,
                        cardNumber: method === 'KARTA' ? card : null,
                        note
                    })
                });
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'Dobiti se nezdarilo.');
                }
                this.walletStatus.textContent = 'Dobito.';
                await this.loadWalletData();
                this.setWalletChipBalance(amount + (this.walletBalanceEl ? parseFloat((this.walletBalanceEl.textContent || '0').replace(/[^0-9.,-]/g, '')) || 0 : 0));
            } catch (error) {
                this.walletStatus.textContent = error.message || 'Dobiti se nezdarilo.';
            } finally {
                submitBtn.disabled = false;
            }
        }

        async updateWalletChip() {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const resp = await fetch(apiUrl('/api/wallet'), { headers: { 'Authorization': `Bearer ${token}` } });
                if (!resp.ok) return;
                const balance = await resp.json();
                const val = balance && typeof balance.balance !== 'undefined' ? balance.balance : 0;
                this.setWalletChipBalance(val);
            } catch (e) {
                // ignore chip errors
            }
        }

        formatCurrency(amount) {
            return currencyFormatter.format(amount || 0);
        }

        downloadWalletStatement() {
            const { balance, history } = this.walletData || {};
            if (!history || !history.length) {
                alert('Žádné pohyby k exportu.');
                return;
            }
            const rows = history.map(item => {
                const dir = ((item.direction || '').toUpperCase() === 'P') ? '+' : '-';
                const castka = this.formatCurrency(item.amount || 0);
                return `
                    <tr>
                        <td>${item.createdAt || ''}</td>
                        <td>${dir} ${castka}</td>
                        <td>${item.method || ''}</td>
                        <td>${item.note || ''}</td>
                        <td>${item.orderId ? 'PO-' + item.orderId : ''}</td>
                    </tr>`;
            }).join('');
            const html = `
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <title>Výpis účtu</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 24px; color:#111; }
        h1 { margin: 0 0 4px 0; }
        p { margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; }
        th { background: #f2f2f2; text-align: left; }
    </style>
</head>
<body>
    <h1>Výpis účtu</h1>
    <p>Datum: ${new Date().toLocaleString('cs-CZ')}</p>
    <p>Zůstatek: ${this.formatCurrency(balance || 0)}</p>
    <table>
        <thead>
            <tr>
                <th>Datum</th>
                <th>Částka</th>
                <th>Metoda</th>
                <th>Poznámka</th>
                <th>Objednávka</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>
</body>
</html>
            `;
            const w = window.open('', '_blank');
            if (!w) {
                alert('Povolte vyskakovací okna pro stažení výpisu.');
                return;
            }
            w.document.write(html);
            w.document.close();
            w.focus();
            w.print();
        }

        setWalletChipBalance(amount) {
            const chip = document.getElementById('wallet-chip-balance');
            if (chip) {
                chip.textContent = currencyFormatter.format(amount || 0);
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
            this.customerOrders.render();
            this.permissionsModule.render();
            this.supplier.render();
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
            this.submitBtn = this.form?.querySelector('button[type="submit"]');
            this.walletData = { balance: 0, history: [] };
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
            const isCard = method === 'CARD';
            const isWallet = method === 'WALLET';
            this.cashSection.style.display = isCash ? 'block' : 'none';
            this.cardSection.style.display = isCard ? 'block' : 'none';
            this.cashGiven.required = isCash;
            this.cardNumber.required = isCard;
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
            if (!method) {
                this.statusEl.textContent = 'Vyberte metodu platby.';
                return;
            }
            const payload = {
                items: this.state.customerCart.map(item => ({ sku: item.sku, qty: item.qty })),
                paymentType: method,
                cashGiven: method === 'CASH' ? Number(this.cashGiven.value || 0) : null,
                cardNumber: method === 'CARD' ? (this.cardNumber.value || '').replace(/\s+/g, '') : null,
                note: ''
            };
            this.statusEl.textContent = 'Zpracovavam platbu...';
            this.statusEl.classList.remove('chat-status-success');
            this.submitBtn && (this.submitBtn.disabled = true);
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
                const data = await response.json();
                this.state.customerCart = [];
                try { localStorage.removeItem('customerCart'); } catch (e) {}
                if (typeof window?.app?.updateWalletChip === 'function' && method === 'WALLET') {
                    try { window.app.updateWalletChip(); } catch (e) { console.debug('Wallet chip refresh skip', e); }
                }
                if (data && typeof data.walletBalance !== 'undefined' && typeof window?.app?.setWalletChipBalance === 'function') {
                    window.app.setWalletChipBalance(data.walletBalance || 0);
                }
                if (data && data.cashbackAmount && Number(data.cashbackAmount) > 0) {
                    this.showCashbackModal(data.cashbackAmount, data.walletBalance, data.cashbackTurnover);
                }
                this.statusEl.textContent = 'Objednávka a platba byly uloženy.';
                this.statusEl.textContent = 'Objednavka a platba byly ulozeny.';
                this.statusEl.classList.add('chat-status-success');
            } catch (error) {
                this.statusEl.textContent = error.message || 'Platbu se nepodarilo dokoncit.';
            } finally {
                this.submitBtn && (this.submitBtn.disabled = false);
            }
        }

        downloadWalletStatement() {
            const { balance, history } = this.walletData || {};
            if (!history || !history.length) {
                alert('Žádné pohyby k exportu.');
                return;
            }
            const rows = history.map(item => {
                const dir = ((item.direction || '').toUpperCase() === 'P') ? '+' : '-';
                const castka = this.formatCurrency(item.amount || 0);
                return `
                    <tr>
                        <td>${item.createdAt || ''}</td>
                        <td>${dir} ${castka}</td>
                        <td>${item.method || ''}</td>
                        <td>${item.note || ''}</td>
                        <td>${item.orderId ? 'PO-' + item.orderId : ''}</td>
                    </tr>`;
            }).join('');
            const html = `
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <title>Výpis účtu</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 24px; color:#111; }
        h1 { margin: 0 0 4px 0; }
        p { margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; }
        th { background: #f2f2f2; text-align: left; }
    </style>
</head>
<body>
    <h1>Výpis účtu</h1>
    <p>Datum: ${new Date().toLocaleString('cs-CZ')}</p>
    <p>Zůstatek: ${this.formatCurrency(balance || 0)}</p>
    <table>
        <thead>
            <tr>
                <th>Datum</th>
                <th>Částka</th>
                <th>Metoda</th>
                <th>Poznámka</th>
                <th>Objednávka</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>
</body>
</html>
            `;
            const w = window.open('', '_blank');
            if (!w) {
                alert('Povolte vyskakovací okna pro stažení výpisu.');
                return;
            }
            w.document.write(html);
            w.document.close();
            w.focus();
            w.print();
        }
    }






        showCashbackModal(amount, balance, turnover) {
            const overlay = document.createElement('div');
            overlay.className = 'modal active';
            overlay.style.zIndex = '9999';
            const amt = currencyFormatter.format(Number(amount) || 0);
            const bal = balance !== undefined && balance !== null ? currencyFormatter.format(Number(balance) || 0) : '';
            const turn = turnover ? currencyFormatter.format(Number(turnover) || 0) : '';
            overlay.innerHTML = `
                <div class="modal-content" role="dialog" aria-modal="true" style="max-width:520px;">
                    <div class="modal-header">
                        <h3 style="margin:0;">🎉 Ura, cashback!</h3>
                        <button type="button" class="ghost-btn ghost-muted" id="cashback-close">×</button>
                    </div>
                    <p style="margin-top:8px;">Gratulujeme! Na váš účet jsme připsali <strong>${amt}</strong>.</p>
                    ${turn ? `<p style="margin-top:0;">Zohledněný obrat: <strong>${turn}</strong>.</p>` : ''}
                    ${bal ? `<p style="margin-top:0;">Nový zůstatek peněženky: <strong>${bal}</strong>.</p>` : ''}
                    <div class="modal-actions" style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
                        <button type="button" class="ghost-btn ghost-strong" id="cashback-ok">Super!</button>
                    </div>
                </div>
            `;
            const cleanup = () => overlay.remove();
            overlay.querySelector('#cashback-close')?.addEventListener('click', cleanup);
            overlay.querySelector('#cashback-ok')?.addEventListener('click', cleanup);
            document.body.appendChild(overlay);
        }
    }

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

function escapeHtml(text) {
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
            const displayNumber = order?.cislo || '—';
            return `
                <div class="supplier-order-card" data-order-id="${order.id}">
                    <div class="supplier-card-head">
                        <div>
                            <p class="eyebrow" style="margin:0 0 6px;">${order.supermarket || 'Neznámý supermarket'}</p>
                            <h4 style="margin:0 0 8px;">Objednávka #${displayNumber}</h4>
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
            const displayNumber = order?.cislo || '—';
            return `
                <div class="supplier-mine-card" data-mine-order="${order.id}">
                    <div class="supplier-card-head">
                        <div>
                            <p class="eyebrow" style="margin:0 0 6px;">${order.supermarket || 'Neznámý supermarket'}</p>
                            <h4 style="margin:0 0 8px;">Objednávka #${displayNumber}</h4>
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
            const displayNumber = order?.cislo || '—';
            return `
                <div class="supplier-history-card" data-history-order="${order.id}">
                    <div class="supplier-card-head">
                        <div>
                            <p class="eyebrow" style="margin:0 0 6px;">${order.supermarket || 'Neznámý supermarket'}</p>
                            <h4 style="margin:0 0 8px;">Objednávka #${displayNumber}</h4>
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
        weeklyDemandByStore: [],
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
        storeHealth: [],
        warehouseLoad: [],
        riskStock: [],
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
    selectedStoreId: null,
    customerCategoryFilter: 'all',
    customerSearchTerm: '',
    customerCart: [],
    customerCartLoaded: false,
    marketSupermarkets: [],
    marketWarehouses: [],
    customerStores: [],
    selectedCustomerStoreId: null,
    supplierOrders: { free: [], mine: [], history: [], loading: false, error: null },
    clientOrders: { items: [], queue: [], refundRequests: [], mine: [], history: [], loading: false, error: null },
    customerHistory: { items: [], loading: false, error: null },
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

async function fetchMarketSupermarkets() {
    const token = localStorage.getItem('token');
    if (!token) return [];
    const resp = await fetch(apiUrl('/api/market/supermarkets'), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    });
    if (!resp.ok) {
        throw new Error('Nepodařilo se načíst prodejny.');
    }
    return resp.json();
}

async function fetchMarketWarehouses() {
    const token = localStorage.getItem('token');
    if (!token) return [];
    const resp = await fetch(apiUrl('/api/market/warehouses'), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    });
    if (!resp.ok) {
        throw new Error('Nepodařilo se načíst sklady.');
    }
    return resp.json();
}

async function upsertSupermarket(payload) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Chybí token');
    const resp = await fetch(apiUrl('/api/market/supermarkets'), {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    if (!resp.ok) {
        throw new Error(await resp.text() || 'Uložení supermarketu selhalo.');
    }
    return resp.json();
}

async function upsertWarehouse(payload) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Chybí token');
    const resp = await fetch(apiUrl('/api/market/warehouses'), {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    if (!resp.ok) {
        throw new Error(await resp.text() || 'Uložení skladu selhalo.');
    }
    return resp.json();
}

async function deleteSupermarketById(id) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Chybí token');
    const resp = await fetch(apiUrl(`/api/market/supermarkets/${id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok && resp.status !== 204) {
        throw new Error(await resp.text() || 'Smazání supermarketu selhalo.');
    }
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
    'client-orders': { label: 'Zakaznicke objednavky', title: 'Sprava klientskych objednavek' },
    'customer-history': { label: 'Historie zakaznika', title: 'Prehled vlastnich objednavek' },
    'customer-payment': { label: 'Platba', title: 'Zaplatte objednavku' },
    chat: { label: 'Komunikace', title: 'Chat & push centrum' }
};

const fragmentUrl = document.body.dataset.fragment || 'fragments/app-shell.html';
state.activeView = document.body.dataset.initialView || state.activeView;
state.requestedView = state.activeView;

const allViews = [
    'dashboard', 'profile', 'inventory', 'orders', 'people', 'finance', 'records',
    'dbobjects', 'permissions', 'customer', 'customer-cart', 'customer-payment', 'chat',
    'supplier', 'client-orders', 'customer-history'
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
        add('customer', 'customer-cart', 'customer-payment', 'customer-history');
        return allowed;
    }

    if (normalizedRole === 'DODAVATEL') {
        add('supplier');
        return allowed;
    }

    if (permSet.has('CLIENT_ORDER_MANAGE')) {
        add('client-orders');
    }

    if (permSet.has('CUSTOMER_HISTORY')) {
        add('customer-history');
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

            const [
                snapshot,
                permissionsCatalog,
                profileMeta,
                adminPermissions,
                rolePermissions,
                marketStores,
                marketWarehouses
            ] = await Promise.all([
                fetchDashboardSnapshot(),
                fetchPermissionsCatalog(),
                fetchProfileMeta(),
                fetchAdminPermissions(),
                fetchRolePermissions(),
                fetchMarketSupermarkets(),
                fetchMarketWarehouses()
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
            state.marketSupermarkets = Array.isArray(marketStores) ? marketStores : [];
            state.marketWarehouses = Array.isArray(marketWarehouses) ? marketWarehouses : [];

            const app = new BDASConsole(state, viewMeta);
            window.app = app;
            app.init();
            setupStoreCrudHandlers();

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
            this.storeTableBody = document.getElementById('stores-table-body');
            this.healthGrid = document.getElementById('store-health-grid');
            this.warehouseLoadList = document.getElementById('warehouse-load-list');
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

            this.renderWeeklyDemandByStore();

            const riskItems = Array.isArray(this.state.data.riskStock) && this.state.data.riskStock.length
                ? this.state.data.riskStock.map(item => ({
                    name: item.name || '',
                    stock: item.stock ?? 0,
                    minStock: item.minStock ?? 0
                }))
                : critical;
            this.lowStockList.innerHTML = riskItems.length
                ? riskItems.map(item => `<li>${escapeHtml(item.name)} — zbyva ${item.stock}, minimum ${item.minStock}</li>`).join('')
                : '<p>Vsechny polozky jsou nad minimem.</p>';

            this.statusBoard.innerHTML = this.state.data.statuses.map(stat => `
                <div class="pill-card">
                    <strong>${stat.label}</strong>
                    <p>${stat.count} zaznamu</p>
                    <div class="progress"><span style="width:${Math.min(stat.count * 8, 100)}%"></span></div>
                </div>
            `).join('');

            const storeRows = this.buildStoreRows();
            if (this.storeTableBody) {
                this.storeTableBody.innerHTML = storeRows.map(store => `
                    <tr data-store-id="${store.id || ''}">
                        <td>${escapeHtml(store.name)}</td>
                        <td>${escapeHtml(store.city || '')}</td>
                        <td>${escapeHtml(store.address || '')}</td>
                        <td>${escapeHtml(store.warehouse || '')}</td>
                    </tr>`).join('');
            }
            this.bindStoreRowClicks();

            if (this.healthGrid) {
                const items = this.state.data.storeHealth || [];
                if (!items.length) {
                    this.healthGrid.innerHTML = '<p class="muted">Zadne metriky k zobrazeni.</p>';
                } else {
                    this.healthGrid.innerHTML = items.map(item => `
                        <article class="health-card">
                            <div class="health-meta">
                                <h3>${escapeHtml(item.name || 'Prodejna')}</h3>
                                <span>${escapeHtml(item.city || '')}</span>
                            </div>
                            <div class="health-stats">
                                <div class="health-stat">
                                    <strong>${item.activeOrders ?? 0}</strong>
                                    Aktivni objednavky
                                </div>
                                <div class="health-stat">
                                    <strong>${item.criticalSku ?? 0}</strong>
                                    Kriticke produkty
                                </div>
                                <div class="health-stat">
                                    <strong>${item.avgCloseHours ? Number(item.avgCloseHours).toFixed(1) + ' h' : '0 h'}</strong>
                                    Prumer zavreni
                                </div>
                                <div class="health-stat">
                                    <strong>${currencyFormatter.format(item.tydenniObrat || 0)}</strong>
                                    Tydenni obrat
                                </div>
                            </div>
                        </article>
                    `).join('');
                }
            }

            this.renderWarehouseLoad();
        }

        buildStoreRows() {
            const supermarkets = Array.isArray(this.state.marketSupermarkets) && this.state.marketSupermarkets.length
                ? this.state.marketSupermarkets
                : [];
            const warehouses = Array.isArray(this.state.marketWarehouses) ? this.state.marketWarehouses : [];

            if (supermarkets.length) {
            return supermarkets.map(store => {
                const match = warehouses.find(w => w.supermarketId === store.id);
                return {
                    id: store.id,
                    name: store.nazev,
                    city: store.adresaMesto || '',
                    address: store.adresaText || [store.adresaUlice, store.adresaCpop, store.adresaCorient].filter(Boolean).join(' '),
                    warehouse: match ? match.nazev : ''
                };
            });
        }

        return (this.state.data.stores || []).map(store => ({
            id: store.id || store.name,
            name: store.name,
            city: store.city,
            address: store.address,
            warehouse: store.warehouse
        }));
        }

        bindStoreRowClicks() {
            if (!this.storeTableBody) return;
            this.storeTableBody.querySelectorAll('tr').forEach(row => {
                row.addEventListener('click', () => {
                    this.state.selectedStoreId = row.dataset.storeId || null;
                    this.storeTableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                    row.classList.add('selected');
                    this.syncStoreButtons();
                });
            });
            this.syncStoreButtons();
        }

        syncStoreButtons() {
            const hasSelection = !!this.state.selectedStoreId;
            const editBtn = document.getElementById('store-edit-btn');
            const delBtn = document.getElementById('store-delete-btn');
            if (editBtn) editBtn.disabled = !hasSelection;
            if (delBtn) delBtn.disabled = !hasSelection;
        }

        renderWarehouseLoad() {
            if (!this.warehouseLoadList) return;
            const items = Array.isArray(this.state.data.warehouseLoad) ? this.state.data.warehouseLoad : [];
            if (!items.length) {
                this.warehouseLoadList.innerHTML = '<p class="muted">Žádná data o skladech.</p>';
                return;
            }
            this.warehouseLoadList.innerHTML = items.map(item => {
                const cap = item.kapacita ?? 0;
                const used = item.obsazeno ?? 0;
                const percent = item.procento ?? (cap > 0 ? (used / cap) * 100 : 0);
                const safePercent = Math.min(Math.max(percent, 0), 150); // ограничим для вида
                return `
                    <div class="warehouse-load-item compact">
                        <div class="warehouse-load-head">
                            <span>${escapeHtml(item.sklad || 'Sklad')}</span>
                            <small class="profile-muted">${escapeHtml(item.supermarket || '')}</small>
                        </div>
                        <div class="warehouse-load-meta">
                            <span>Obsazeno: ${used}</span>
                            <span>Kapacita: ${cap || '—'}</span>
                        </div>
                        <div class="warehouse-progress" aria-label="Vytizenost skladu">
                            <span style="width:${safePercent}%;"></span>
                        </div>
                        <div class="warehouse-load-meta" style="justify-content:flex-start;">
                            <strong>${safePercent.toFixed(1)} %</strong>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    DashboardModule.prototype.renderWeeklyDemandByStore = function () {
        const container = this.chart;
        if (!container) return;
        container.classList.remove('sparkline');
        container.classList.add('demand-grid');
        const seriesList = this.state.data.weeklyDemandByStore || [];
        if (!seriesList.length) {
            container.innerHTML = '<p class="muted">Zadne objednavky za 7 dnu.</p>';
            return;
        }
        container.innerHTML = seriesList.map(series => {
            const points = series.points || [];
            const values = points.map(p => Number(p.value) || 0);
            const maxValue = Math.max(1, ...values);
            const bars = points.map(p => {
                const val = Number(p.value) || 0;
                const heightPx = Math.max(8, Math.round((val / maxValue) * 80)); // 0..80px
                return `<div class="spark-bar" style="height:${heightPx}px"><span>${escapeHtml(p.label)}</span></div>`;
            }).join('');
            return `
                <div class="demand-card">
                    <div class="demand-title">${escapeHtml(series.storeName || 'Prodejna')}</div>
                    <div class="sparkline">${bars}</div>
                </div>
            `;
        }).join('');
    };

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
            this.formItemsSection = document.getElementById('order-form-items');
            this.formItemsList = document.getElementById('order-form-items-list');
            this.formItemsEmpty = document.getElementById('order-form-items-empty');
            this.formItemsBadge = document.getElementById('order-form-items-badge');
            this.formItemsTotal = document.getElementById('order-form-items-total');
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
            const orders = this.getOrders();
            if (!orders.length) {
                this.tableBody.innerHTML = '<tr><td colspan="9" class="table-placeholder">Žádné objednávky</td></tr>';
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
            const lines = this.getOrderItems(orderId);
            this.orderLines.innerHTML = lines.length
                ? lines.map(line => `<li>${line.sku} &times; ${line.name} — ${line.qty} ks · ${currencyFormatter.format(line.price)}</li>`).join('')
                : '<p class="profile-muted">Žádná data o položkách.</p>';
        }

        getOrderItems(orderId) {
            if (!orderId) {
                return [];
            }
            const all = Array.isArray(this.state.data.orderItems) ? this.state.data.orderItems : [];
            return all.filter(item => item.orderId === orderId);
        }

        renderFormItems(orderId) {
            if (!this.formItemsSection) return;
            const items = this.getOrderItems(orderId);
            const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
            const totalAmount = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
            if (this.formItemsBadge) {
                this.formItemsBadge.textContent = orderId ? `${totalQty} ks` : '—';
            }
            if (this.formItemsTotal) {
                this.formItemsTotal.textContent = currencyFormatter.format(totalAmount || 0);
            }
            if (items.length && this.formItemsList) {
                this.formItemsList.innerHTML = items.map(item => `
                    <li class="order-form-item">
                        <div class="order-form-item-main">
                            <strong>${this.escapeHtml(item.name || 'Položka')}</strong>
                        </div>
                        <div class="order-form-item-meta">
                            <span>${Number(item.qty) || 0} ks</span>
                            <span>${currencyFormatter.format(item.price || 0)}</span>
                        </div>
                    </li>
                `).join('');
                this.formItemsList.hidden = false;
                if (this.formItemsEmpty) {
                    this.formItemsEmpty.hidden = true;
                }
            } else {
                if (this.formItemsList) {
                    this.formItemsList.innerHTML = '';
                    this.formItemsList.hidden = true;
                }
                if (this.formItemsEmpty) {
                    this.formItemsEmpty.textContent = orderId
                        ? 'Žádné položky pro tuto objednávku.'
                        : 'Položky se zobrazí po výběru existující objednávky.';
                    this.formItemsEmpty.hidden = false;
                }
            }
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
            this.renderFormItems(order?.id || null);
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
            const token = localStorage.getItem('token') || '';
            let deleteInfo = null;
            if (token) {
                deleteInfo = await this.fetchOrderDeleteInfo(orderId, token);
            }
            const confirmed = await this.showOrderDeleteDialog(order, deleteInfo);
            if (!confirmed) return;
            try {
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

        async showOrderDeleteDialog(order, info) {
            const label = order?.store || order?.type || 'objednávku';
            const orderNumber = order?.cislo || (order?.id ? `PO-${order.id}` : '—');
            const overlay = document.createElement('div');
            overlay.className = 'modal active';
            overlay.style.zIndex = '9999';
            const formatCount = (value) => {
                const num = Number(value);
                return Number.isFinite(num) ? `${num}×` : '';
            };
            const cascades = [
                { label: 'OBJEDNAVKA_ZBOZI', detail: 'Položky objednávky', count: formatCount(info?.itemCount) },
                { label: 'PLATBA', detail: 'Záznamy o platbách', count: formatCount(info?.paymentCount) },
                { label: 'HOTOVOST', detail: 'Detaily hotovostních plateb', count: formatCount(info?.cashCount) },
                { label: 'KARTA', detail: 'Detaily karetních plateb', count: formatCount(info?.cardCount) },
                { label: 'POHYB_UCTU', detail: 'Pohyby peněženky navázané na objednávku', count: formatCount(info?.walletMovements) }
            ];
            const headerCislo = this.escapeHtml(info?.cislo || orderNumber);
            const storeLine = info?.store ? `<p class="profile-muted" style="margin:4px 0 0;">Prodejna: ${this.escapeHtml(info.store)}</p>` : '';
            const cascadeList = `
                <div class="cascade-list">
                    ${cascades.map(item => `
                        <div class="cascade-item">
                            <div class="cascade-item-head">
                                <strong>${this.escapeHtml(item.label)}</strong>
                                ${item.count ? `<span class="cascade-count">${this.escapeHtml(item.count)}</span>` : ''}
                            </div>
                            <span class="cascade-detail">${this.escapeHtml(item.detail)}</span>
                        </div>`).join('')}
                </div>`;
            overlay.innerHTML = `
                <div class="modal-content" role="dialog" aria-modal="true" style="max-width:520px;">
                    <div class="modal-header">
                        <h3 style="margin:0;">Smazat objednávku ${headerCislo}</h3>
                        <button type="button" class="ghost-btn ghost-muted" data-order-delete="close" aria-label="Zavřít">×</button>
                    </div>
                    <p style="margin:8px 0 0;">Opravdu chcete odstranit <strong>${this.escapeHtml(label)}</strong>?</p>
                    ${storeLine}
                    <p class="profile-muted" style="margin:8px 0;">Databázová procedura <code>delete_objednavka_cascade</code> smaže také následující vazby:</p>
                    ${cascadeList}
                    <p class="profile-muted" style="margin-top:12px;">Tuto akci nelze vrátit.</p>
                    <div class="modal-actions" style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
                        <button type="button" class="ghost-btn ghost-muted" data-order-delete="cancel">Zrušit</button>
                        <button type="button" class="ghost-btn ghost-strong" data-order-delete="confirm">Ano, smazat vše</button>
                    </div>
                </div>
            `;
            return new Promise((resolve) => {
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
                overlay.querySelector('[data-order-delete="close"]')?.addEventListener('click', () => cleanup(false));
                overlay.querySelector('[data-order-delete="cancel"]')?.addEventListener('click', () => cleanup(false));
                overlay.querySelector('[data-order-delete="confirm"]')?.addEventListener('click', () => cleanup(true));
                document.body.appendChild(overlay);
            });
        }

        async fetchOrderDeleteInfo(orderId, token) {
            if (!orderId || !token) return null;
            try {
                const response = await fetch(this.apiUrl(`/api/orders/${orderId}/delete-info`), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) return null;
                return await response.json();
            } catch (error) {
                console.warn('Nepodařilo se načíst informace o mazání objednávky', error);
                return null;
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
                    <td>${order.cislo || '—'}</td>
                    <td><span class="status-badge ${typeClass}">${order.type || '—'}</span></td>
                    <td>
                        <div class="order-cell">
                            <strong>${order.store || '-'}</strong>
                            ${noteHtml}
                        </div>
                    </td>
                    <td>${order.supplier || '-'}</td>
                    <td>${order.employee || '-'}</td>
                    <td>${order.handler || '-'}</td>
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
                    return `
                        <tr class="payment-row ${typeClass}">
                            <td><span class="pay-type ${typeClass}">${this.resolveTypeLabel(p.type)}</span></td>
                            <td class="payment-method">${p.method || '–'}</td>
                            <td>${currencyFormatter.format(p.amount || 0)}</td>
                            <td>${p.date || ''}</td>
                        </tr>
                    `;
                }).join('')
                : '<tr><td colspan="4" style="text-align:center;">Zadne platby</td></tr>';

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
                '\u{1F600}','\u{1F602}','\u{1F604}','\u{1F606}','\u{1F923}','\u{1F60D}','\u{1F618}','\u{1F617}',
                '\u{1F970}','\u{263A}\u{FE0F}','\u{1F60A}','\u{1F61C}','\u{1F61D}','\u{1F62E}','\u{1F633}','\u{1F92A}',
                '\u{1F607}','\u{1F60E}','\u{1F929}','\u{1F617}','\u{1F917}','\u{1F609}','\u{1F642}','\u{1F643}',
                '\u{1F92D}','\u{1F644}','\u{1F60F}','\u{1F62A}','\u{1F634}','\u{1F924}','\u{1F637}','\u{1F912}',
                '\u{1F915}','\u{1F922}','\u{1F975}','\u{1F976}','\u{1F974}','\u{1F635}','\u{1F92F}','\u{1F62D}',
                '\u{1F621}','\u{1F620}','\u{1F92C}','\u{1F624}','\u{1F631}','\u{1F628}','\u{1F630}','\u{1F62F}',
                '\u{1F616}','\u{1F623}','\u{1F61E}','\u{1F613}','\u{1F625}','\u{1F622}','\u{1F914}','\u{1F910}',
                '\u{1F928}','\u{1F9D0}','\u{1F913}','\u{1F4AA}','\u{1F44D}','\u{1F44E}','\u{1F64C}','\u{1F44F}',
                '\u{1F64F}','\u{1F91D}','\u{1F917}','\u{1F64A}','\u{1F648}','\u{1F649}','\u{1F4A9}','\u{1F525}',
                '\u{1F389}','\u{1F381}','\u{1F37B}','\u{1F37E}','\u{1F355}','\u{1F32D}','\u{1F36A}','\u{1F9C0}'
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
                    this.setFormStatus('\u2713 Upraveno', true);
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
                    this.setFormStatus('\u2713 Odeslano', true);
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
            this.storeSelect = document.getElementById('customer-store-select');
            this.cartEls = Array.from(document.querySelectorAll('[data-customer-cart]'));
            this.cartCountEl = document.getElementById('customer-cart-count');
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
            if (this.storeSelect) {
                this.storeSelect.addEventListener('change', () => {
                    const val = this.storeSelect.value;
                    this.state.selectedCustomerStoreId = val ? Number(val) : null;
                    this.loadProductsForStore(this.state.selectedCustomerStoreId);
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
            this.loadStoresAndProducts();
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
        }

        async loadStoresAndProducts() {
            const token = localStorage.getItem('token') || '';
            try {
                const resp = await fetch(apiUrl('/api/market/supermarkets'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (resp.ok) {
                    const stores = await resp.json();
                    this.state.customerStores = Array.isArray(stores) ? stores.map(normalizeStore) : [];
                }
            } catch (e) {
                console.warn('Failed to load stores', e);
                this.state.customerStores = [];
            }
            this.populateStoreSelect();
            const initialStoreId = this.state.selectedCustomerStoreId
                || (this.state.customerStores.length ? this.state.customerStores[0].id : null);
            if (initialStoreId) {
                this.state.selectedCustomerStoreId = initialStoreId;
                this.storeSelect && (this.storeSelect.value = String(initialStoreId));
                await this.loadProductsForStore(initialStoreId);
            } else {
                this.state.data.customerProducts = [];
                this.render();
            }
        }

        populateStoreSelect() {
            if (!this.storeSelect) return;
            const options = ['<option value="">Vyber prodejnu</option>']
                .concat(this.state.customerStores.map(store => `<option value="${store.id}">${store.name}</option>`));
            this.storeSelect.innerHTML = options.join('');
            if (this.state.selectedCustomerStoreId) {
                this.storeSelect.value = String(this.state.selectedCustomerStoreId);
            }
        }

        async loadProductsForStore(storeId) {
            if (!storeId) {
                this.state.data.customerProducts = [];
                this.render();
                return;
            }
            const token = localStorage.getItem('token') || '';
            try {
                const resp = await fetch(apiUrl(`/api/customer/catalog/products?supermarketId=${storeId}`), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (resp.ok) {
                    this.state.data.customerProducts = await resp.json();
                } else {
                    this.state.data.customerProducts = [];
                }
            } catch (e) {
                console.warn('Failed to load customer products', e);
                this.state.data.customerProducts = [];
            }
            this.render();
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
            const emojiByKeyword = [
                // drogerie specifics
                { key: 'kapesnic', emoji: '🧻' },
                { key: 'toaletn', emoji: '🧻' },
                { key: 'kartacek', emoji: '🦷' },
                { key: 'zubni pasta', emoji: '🦷' },
                { key: 'pasta', emoji: '🦷' },
                { key: 'praci', emoji: '🧺' },
                { key: 'avivaz', emoji: '🧴' },
                { key: 'uklid', emoji: '🧽' },
                { key: 'sprej', emoji: '🧽' },
                { key: 'sampon', emoji: '🧴' },
                { key: 'sprch', emoji: '🧼' },
                { key: 'gel', emoji: '🧴' },
                { key: 'mydlo', emoji: '🧼' },
                { key: 'droger', emoji: '🧴' },
                // food & drinks
                { key: 'pivo', emoji: '🍺' },
                { key: 'pilsner', emoji: '🍺' },
                { key: 'gambrinus', emoji: '🍺' },
                { key: 'kozel', emoji: '🍺' },
                { key: 'rum', emoji: '🥃' },
                { key: 'whisky', emoji: '🥃' },
                { key: 'vodk', emoji: '🍸' },
                { key: 'vino', emoji: '🍷' },
                { key: 'cervene', emoji: '🍷' },
                { key: 'bile', emoji: '🥂' },
                { key: 'sekt', emoji: '🥂' },
                { key: 'prosecco', emoji: '🥂' },
                // sladkosti (specific first)
                { key: 'susen', emoji: '🍪' }, // susenky
                { key: 'lentilk', emoji: '🍭' },
                { key: 'mandle', emoji: '🥜' },
                { key: 'bonbon', emoji: '🍬' },
                { key: 'karamel', emoji: '🍯' },
                { key: 'marcipan', emoji: '🍡' },
                { key: 'wafle', emoji: '🍰' }, // widely supported
                { key: 'zmrzlinova tyc', emoji: '🍧' }, // ice cream bar/popsicle
                { key: 'nanuk', emoji: '🍧' },
                { key: 'tycink', emoji: '🍫' }, // tycinka
                { key: 'cokolad', emoji: '🍫' },
                { key: 'coko', emoji: '🍫' },
                { key: 'zmrzlin', emoji: '🍦' },
                { key: 'sladk', emoji: '🍬' }, // fallback for sweets
                // pizza (before cheese mappings to avoid 🧀)
                { key: 'pizza mozzarella', emoji: '🍕' },
                { key: 'mrazena pizza', emoji: '🍕' },
                { key: 'pizza', emoji: '🍕' },
                // pecivo
                { key: 'baget', emoji: '🥖' },
                { key: 'houska', emoji: '🥯' },
                { key: 'rohlik', emoji: '🥨' },
                { key: 'croissant', emoji: '🥐' },
                { key: 'toust', emoji: '🍞' },
                { key: 'toast', emoji: '🍞' },
                { key: 'chleb', emoji: '🍞' },
                // dairy & misc
                // mleko & dairy
                { key: 'mleko', emoji: '🥛' },
                { key: 'plnotucne', emoji: '🥛' },
                { key: 'polotucne', emoji: '🥛' },
                { key: 'jogurt', emoji: '🥣' },
                { key: 'kefir', emoji: '🥛' },
                { key: 'skyr', emoji: '🥣' },
                { key: 'maslo', emoji: '🧈' },
                { key: 'tvaroh', emoji: '🧀' },
                { key: 'syr', emoji: '🧀' },
                { key: 'mozzarella', emoji: '🧀' },
                { key: 'eidam', emoji: '🧀' },
                { key: 'gouda', emoji: '🧀' },
                { key: 'cottage', emoji: '🧀' },
                // ovoce a zelenina
                { key: 'hrusk', emoji: '🍐' },
                { key: 'jablk zel', emoji: '🍏' },
                { key: 'jablk cerv', emoji: '🍎' },
                { key: 'jablk', emoji: '🍎' },
                { key: 'mandarin', emoji: '🍊' },
                { key: 'pomeran', emoji: '🍊' },
                { key: 'ovoce', emoji: '🍎' },
                { key: 'brambor', emoji: '🥔' },
                { key: 'mrkev', emoji: '🥕' },
                { key: 'okurk', emoji: '🥒' },
                { key: 'paprik', emoji: '🌶' },
                { key: 'paprika', emoji: '🌶' },
                { key: 'rajcat', emoji: '🍅' },
                { key: 'zelenin', emoji: '🥬' }, // generic veggie fallback
                // mrazene
                { key: 'mrazene brokolic', emoji: '🥦' },
                { key: 'mrazena brokolic', emoji: '🥦' },
                { key: 'brokolic', emoji: '🥦' },
                { key: 'mrazene kukuric', emoji: '🌽' },
                { key: 'mrazena kukuric', emoji: '🌽' },
                { key: 'kukuric', emoji: '🌽' },
                { key: 'mrazena zelenin', emoji: '🥬' },
                { key: 'mrazena zelen', emoji: '🥬' },
                { key: 'mrazene hranolk', emoji: '🍟' },
                { key: 'mrazene rybi prst', emoji: '🐟' },
                { key: 'mrazene ryb', emoji: '🐟' },
                { key: 'mrazena tresk', emoji: '🐟' },
                { key: 'mrazene krevety', emoji: '🍤' },
                { key: 'mrazene maliny', emoji: '🍓' },
                { key: 'mrazena pizza', emoji: '🍕' },
                { key: 'zmrzlin', emoji: '🍦' },
                { key: 'mrazene', emoji: '🧊' },
                
                // maso a uzeniny
                { key: 'hovezi', emoji: '🥩' },
                { key: 'kureci', emoji: '🍗' },
                { key: 'prsa', emoji: '🍗' },
                { key: 'stehno', emoji: '🍗' },
                { key: 'srdick', emoji: '🍗' },
                { key: 'veprove', emoji: '🍖' },
                { key: 'koleno', emoji: '🍖' },
                { key: 'kare', emoji: '🍖' },
                { key: 'klobas', emoji: '🌭' },
                { key: 'salam', emoji: '🍖' },
                { key: 'sunka', emoji: '🥓' },
                { key: 'uzen', emoji: '🥓' },
                // ostatni
                { key: 'maso', emoji: '🥩' },
                { key: 'ryb', emoji: '🐟' },
                { key: 'table', emoji: '💊' }, // tablety
                // napoje
                { key: 'cola', emoji: '🥤' },
                { key: 'energet', emoji: '⚡' },
                { key: 'sprite', emoji: '🥤' },
                { key: 'fanta', emoji: '🍊' },
                { key: 'caj', emoji: '🧊' },
                { key: 'ledovy', emoji: '🧊' },
                { key: 'dzus', emoji: '🧃' },
                { key: 'pomeran', emoji: '🍊' },
                { key: 'jablec', emoji: '🍏' },
                { key: 'voda perliv', emoji: '💧' },
                { key: 'voda neperliv', emoji: '💧' },
                { key: 'voda', emoji: '💧' },
                { key: 'napoj', emoji: '🥤' },
                { key: 'kava', emoji: '☕' }
            ];
            const pickEmoji = prod => {
                const text = `${prod.name || ''} ${prod.category || ''} ${prod.description || ''}`.toLowerCase();
                const normalizedText = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const match = emojiByKeyword.find(entry =>
                    text.includes(entry.key) || normalizedText.includes(entry.key)
                );
                return match ? match.emoji : '🛒';
            };
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
                const msg = this.state.selectedCustomerStoreId
                    ? 'Zadne produkty pro zadany filtr.'
                    : 'Vyberte prodejnu pro nacteni produktu.';
                this.grid.innerHTML = `<p>${msg}</p>`;
                return;
            }
            this.grid.innerHTML = products.map(prod => `
                <article class="product-card">
                    <div class="product-icon">${pickEmoji(prod)}</div>
                    <div>
                        <strong>${prod.name}</strong>
                        ${prod.description ? `<p>${prod.description}</p>` : ''}
                    </div>
                    <div class="product-meta">
                        <span>${(prod.category && prod.category.trim()) ? prod.category : 'Bez kategorie'}</span>
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

    function normalizeStore(store) {
        return {
            id: store.id ?? store.idSupermarket ?? store.id_supermarket ?? null,
            name: store.nazev ?? store.name ?? 'Supermarket',
            city: store.adresaMesto ?? store.mesto ?? ''
        };
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

    class ClientOrdersModule {
        constructor(state, opts) {
            this.state = state;
            this.apiUrl = opts.apiUrl;
            this.alert = document.getElementById('client-orders-alert');
            this.refreshBtn = document.getElementById('client-orders-refresh');
            this.totalBadge = document.getElementById('client-orders-count');

            this.queueContainer = document.getElementById('client-queue-container');
            this.queueEmpty = document.getElementById('client-queue-empty');
            this.queueCount = document.getElementById('client-queue-count');

            this.refundContainer = document.getElementById('client-refund-container');
            this.refundEmpty = document.getElementById('client-refund-empty');
            this.refundCount = document.getElementById('client-refund-count');

            this.mineContainer = document.getElementById('client-mine-container');
            this.mineEmpty = document.getElementById('client-mine-empty');
            this.mineCount = document.getElementById('client-mine-count');

            this.historyContainer = document.getElementById('client-history-container');
            this.historyEmpty = document.getElementById('client-history-empty');
            this.historyCount = document.getElementById('client-history-count');
            this.historySection = document.getElementById('client-history-section');
            this.historyToggle = document.getElementById('client-history-toggle');

            this.refundContainer = document.getElementById('client-refund-container');
            this.refundEmpty = document.getElementById('client-refund-empty');
            this.refundCount = document.getElementById('client-refund-count');
        }

        init() {
            if (!this.alert) return;
            this.refreshBtn?.addEventListener('click', () => this.load());
            this.historyToggle?.addEventListener('click', () => this.toggleHistory());
            [this.queueContainer, this.mineContainer].forEach(container => {
                container?.addEventListener('click', event => {
                    const claim = event.target.closest('[data-claim-order]');
                    if (claim) {
                        this.claimOrder(claim.dataset.claimOrder, claim.dataset.currentStatus, claim);
                        return;
                    }
                    const toggle = event.target.closest('[data-client-detail]');
                    if (toggle) {
                        this.toggleDetails(toggle.dataset.clientDetail);
                        return;
                    }
                    const next = event.target.closest('[data-next-status]');
                    if (next) {
                        this.advanceStatus(next.dataset.nextStatus, next.dataset.currentStatus, next);
                        return;
                    }
                    const cancel = event.target.closest('[data-cancel-order]');
                    if (cancel) {
                        this.changeStatus(cancel.dataset.cancelOrder, cancel, 6);
                        return;
                    }
                    const change = event.target.closest('[data-status-change]');
                    if (change) {
                        this.changeStatus(change.dataset.orderId, change, change.dataset.statusChange);
                        return;
                    }
                    const refund = event.target.closest('[data-refund-order]');
                    if (refund) {
                        this.refundOrder(refund.dataset.refundOrder, refund.dataset.refundAmount, refund);
                    }
                });
            });
            this.refundContainer?.addEventListener('click', event => {
                const toggle = event.target.closest('[data-client-detail]');
                if (toggle) {
                    this.toggleDetails(toggle.dataset.clientDetail);
                    return;
                }
                const approve = event.target.closest('[data-approve-refund]');
                if (approve) {
                    this.decideRefund(approve.dataset.approveRefund, true, approve);
                    return;
                }
                const reject = event.target.closest('[data-reject-refund]');
                if (reject) {
                    this.decideRefund(reject.dataset.rejectRefund, false, reject);
                }
            });
            this.render();
            this.load();
        }

        setAlert(text) {
            if (!this.alert) return;
            if (text) {
                this.alert.textContent = text;
                this.alert.style.display = 'block';
            } else {
                this.alert.textContent = '';
                this.alert.style.display = 'none';
            }
        }

        updateCount(el, count) {
            if (el) {
                el.textContent = count;
            }
        }

        toggleHistory() {
            if (!this.historySection || !this.historyToggle) return;
            const hidden = this.historySection.hasAttribute('hidden');
            if (hidden) {
                this.historySection.removeAttribute('hidden');
                this.historySection.style.display = 'flex';
                this.historyToggle.setAttribute('aria-expanded', 'true');
                this.historyToggle.textContent = 'Skrýt historii';
            } else {
                this.historySection.setAttribute('hidden', 'hidden');
                this.historySection.style.display = 'none';
                this.historyToggle.setAttribute('aria-expanded', 'false');
                this.historyToggle.textContent = 'Zobrazit historii';
            }
        }

        render() {
            const { queue = [], refundRequests = [], mine = [], history = [], loading, error } = this.state.clientOrders || {};
            this.setAlert(error);
            this.updateCount(this.totalBadge, queue.length + refundRequests.length + mine.length + history.length);
            this.renderList(queue, this.queueContainer, this.queueEmpty, this.queueCount, 'queue');
            this.renderList(refundRequests, this.refundContainer, this.refundEmpty, this.refundCount, 'refund');
            this.renderList(mine, this.mineContainer, this.mineEmpty, this.mineCount, 'mine');
            this.renderList(history, this.historyContainer, this.historyEmpty, this.historyCount, 'history');

            if (loading) {
                this.showLoading(this.queueContainer, this.queueEmpty);
                this.showLoading(this.refundContainer, this.refundEmpty);
                this.showLoading(this.mineContainer, this.mineEmpty);
                this.showLoading(this.historyContainer, this.historyEmpty);
            }
        }

        showLoading(container, emptyEl) {
            if (container) container.innerHTML = '<p class="profile-muted" style="text-align:center;width:100%;">Načítám…</p>';
            if (emptyEl) emptyEl.style.display = 'none';
        }

        renderList(list, container, emptyEl, countBadge, mode) {
            const items = Array.isArray(list) ? list : [];
            this.updateCount(countBadge, items.length);
            if (!container) return;
            if (!items.length) {
                container.innerHTML = '';
                if (emptyEl) emptyEl.style.display = 'block';
                return;
            }
            if (emptyEl) emptyEl.style.display = 'none';
            container.innerHTML = items.map(order => this.renderCard(order, mode)).join('');
        }

        findOrder(orderId) {
            if (!orderId) return null;
            const { queue = [], refundRequests = [], mine = [], history = [] } = this.state.clientOrders || {};
            const lists = [queue, refundRequests, mine, history];
            for (const list of lists) {
                const found = (list || []).find(o => String(o?.id) === String(orderId));
                if (found) return found;
            }
            return null;
        }

        formatOrderNumber(orderId) {
            const order = this.findOrder(orderId);
            return order?.cislo || '—';
        }

        renderCard(order, mode) {
            const isMine = mode === 'mine';
            const isQueue = mode === 'queue';
            const isRefund = mode === 'refund';
            const isHistory = mode === 'history';
            const refunded = Boolean(order?.refunded);
            const rejectedRefund = Boolean(order?.refundRejected);
            const itemsArray = Array.isArray(order?.items) ? order.items : [];
            const itemsList = this.renderItems(itemsArray);
            const amountValue = order?.total ?? this.computeTotal(itemsArray);
            const amount = this.formatAmount(amountValue);
            const statusLabel = escapeHtml(order?.status || '');
            const date = escapeHtml(order?.createdAt || '');
            const store = escapeHtml(order?.supermarket || '');
            const customerLine = [order?.customerEmail, order?.handlerEmail].filter(Boolean).map(escapeHtml).join(' · ');
            const note = order?.note ? `<p class="profile-muted" style="margin:6px 0 0;">${escapeHtml(order.note)}</p>` : '';
            const itemsSummary = this.formatItemsSummary(itemsArray);
            const displayNumber = order?.cislo || '—';
            const orderTitle = `Objednávka #${displayNumber}`.trim();
            const refundPill = isHistory
                ? (rejectedRefund
                    ? `<span class="status-badge danger" style="margin-left:6px;">Zamítnuto</span>`
                    : (refunded ? `<span class="status-badge warning" style="margin-left:6px;">Vráceno</span>` : ''))
                : '';

            if (isQueue || isRefund) {
                return `
                    <div class="client-order-card" data-order-id="${order?.id ?? ''}">
                        <div class="client-card-top">
                            <div>
                                <p class="eyebrow" style="margin:0;">${store || 'Supermarket'}</p>
                                <h4 style="margin:4px 0 6px;">${orderTitle}</h4>
                                <div class="meta-row" style="color:var(--muted);gap:8px;">
                                    <span class="material-symbols-rounded" aria-hidden="true">calendar_today</span>
                                    <span>Vytvořeno: ${date || '—'}</span>
                                </div>
                                ${note}
                            </div>
                            <span class="status-badge${order?.pendingRefund ? ' warning' : ''}" style="align-self:flex-start;">${isRefund ? 'Refund čeká' : (statusLabel || 'Vytvořena')}</span>
                        </div>
                        <div class="client-card-meta">
                            <div class="meta-row">
                                <span class="material-symbols-rounded" aria-hidden="true">person</span>
                                <span>${customerLine || 'Bez kontaktu'}</span>
                            </div>
                        </div>
                        <div class="client-order-items" data-client-details="${order?.id ?? ''}" hidden>
                            ${itemsList}
                        </div>
                        <div class="client-amount-main">
                            <small class="profile-muted">Částka</small>
                            <div class="client-amount-value">${amount}</div>
                        </div>
                        <div class="client-card-actions">
                            <button type="button" class="ghost-btn" data-client-detail="${order?.id ?? ''}">Položky</button>
                            ${isRefund ? `
                                <button type="button" class="ghost-btn ghost-strong" data-approve-refund="${order?.id ?? ''}">Schválit refund</button>
                                <button type="button" class="ghost-btn ghost-danger" data-reject-refund="${order?.id ?? ''}">Zamítnout</button>
                            ` : `
                                <button type="button" class="ghost-btn ghost-strong" data-claim-order="${order?.id ?? ''}" data-current-status="${order?.statusId ?? ''}">
                                    Převzít
                                </button>
                            `}
                        </div>
                    </div>
                `;
            }

            const actions = this.renderStatusControls(order);
            return `
                <div class="supplier-order-card client-order-card" data-order-id="${order?.id ?? ''}">
                    <div class="client-card-top">
                        <div>
                            <p class="eyebrow" style="margin:0;">${store || 'Prodejna'}</p>
                            <div class="client-chip-row">
                                <span class="status-badge">${statusLabel || 'Stav neznámý'}</span>${refundPill}
                                <span class="client-chip">${date || '—'}</span>
                            </div>
                        </div>
                        <div class="client-amount">
                            <small class="profile-muted">Částka</small>
                            <strong>${amount}</strong>
                        </div>
                    </div>
                    <div class="client-card-meta">
                        <div class="meta-row">
                            <span class="material-symbols-rounded" aria-hidden="true">person</span>
                            <span>${customerLine || 'Bez kontaktu'}</span>
                        </div>
                        <div class="meta-row">
                            <span class="material-symbols-rounded" aria-hidden="true">shopping_bag</span>
                            <span>${itemsSummary}</span>
                        </div>
                    </div>
                    ${itemsList}
                    ${note}
                    <div class="client-amount-main" style="margin-top:10px;">
                        <small class="profile-muted">Částka</small>
                        <div class="client-amount-value">${amount}</div>
                    </div>
                    ${actions ? `<div class="client-card-actions">${actions}</div>` : ''}
                </div>
            `;
        }

        renderItems(items) {
            const list = Array.isArray(items) ? items : [];
            if (!list.length) {
                return '<p class="profile-muted" style="margin:6px 0;">Bez položek</p>';
            }
            return `<ul class="profile-muted" style="padding-left:16px;margin:6px 0;">${list.map(item => `
                <li class="client-item-chip">${escapeHtml(item.name || '')} · ${item.qty ?? 0} × ${this.formatAmount(item.price)}</li>
            `).join('')}</ul>`;
        }

        formatItemsSummary(items) {
            const list = Array.isArray(items) ? items : [];
            if (!list.length) return 'Bez položek';
            const totalQty = list.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
            return `${list.length} položky • ${totalQty} ks`;
        }

        computeTotal(items) {
            const list = Array.isArray(items) ? items : [];
            return list.reduce((sum, it) => {
                const price = Number(it.price ?? 0);
                const qty = Number(it.qty ?? 0);
                if (Number.isNaN(price) || Number.isNaN(qty)) return sum;
                return sum + price * qty;
            }, 0);
        }

        toggleDetails(orderId) {
            if (!orderId) return;
            const section = document.querySelector(`[data-client-details="${orderId}"]`);
            if (!section) return;
            const isHidden = section.hasAttribute('hidden');
            if (isHidden) {
                section.removeAttribute('hidden');
                section.style.display = 'block';
            } else {
                section.setAttribute('hidden', 'hidden');
                section.style.display = 'none';
            }
        }

        async refundOrder(orderId, amount, triggerBtn, handlerLabel) {
            if (!orderId) return;
            const amt = Number(amount);
            if (!amt || amt <= 0 || Number.isNaN(amt)) {
                alert('Částka k vrácení není platná.');
                return;
            }
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Nejste přihlášen.');
                return;
            }
            const orderLabel = this.formatOrderNumber(orderId);
            if (!confirm(`Poslat žádost o vrácení ${this.formatAmount(amt)} na účet za objednávku ${orderLabel}?`)) {
                return;
            }
            if (triggerBtn) triggerBtn.disabled = true;
            try {
                const response = await fetch(this.apiUrl('/api/wallet/refund-request'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ orderId, amount: amt })
                });
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'Žádost se nepodařilo odeslat.');
                }
                const target = handlerLabel && handlerLabel.trim().length ? handlerLabel : 'obsluze';
                alert(`Žádost byla odeslána ke schválení (${target}).`);
                if (triggerBtn) {
                    triggerBtn.textContent = `Odesláno manažerovi${handlerLabel ? ` (${handlerLabel})` : ''}`;
                    triggerBtn.disabled = true;
                }
            } catch (err) {
                alert(err.message || 'Žádost se nepodařilo odeslat.');
                if (triggerBtn) triggerBtn.disabled = false;
            }
        }

        async decideRefund(orderId, approve, triggerBtn) {
            if (!orderId) return;
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Nejste přihlášen.');
                return;
            }
            const orderLabel = this.formatOrderNumber(orderId);
            if (!confirm(`${approve ? 'Schválit' : 'Zamítnout'} refund objednávky ${orderLabel}?`)) {
                return;
            }
            if (triggerBtn) triggerBtn.disabled = true;
            try {
                const url = approve
                    ? this.apiUrl(`/api/client/orders/${orderId}/refund/approve`)
                    : this.apiUrl(`/api/client/orders/${orderId}/refund/reject`);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'Akci se nepodařilo provést.');
                }
                await this.load();
            } catch (err) {
                alert(err.message || 'Akci se nepodařilo provést.');
            } finally {
                if (triggerBtn) triggerBtn.disabled = false;
            }
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
                    ${nextActions.map(action => `
                        <button type="button" class="ghost-btn ghost-strong" data-status-change="${action.id}" data-order-id="${order?.id ?? ''}">
                            ${escapeHtml(action.label)}
                        </button>
                    `).join('')}
                    ${cancelAction ? `
                        <button type="button" class="ghost-btn ghost-danger" data-status-change="${cancelAction.id}" data-order-id="${order?.id ?? ''}">
                            ${escapeHtml(cancelAction.label)}
                        </button>
                    ` : ''}
                </div>
            `;
        }

        resolveStatusActions(statusId) {
            const map = {
                2: [
                    { id: 3, label: 'Připravit', theme: 'strong' },
                    { id: 6, label: 'Zrušit', theme: 'danger' }
                ],
                3: [
                    { id: 4, label: 'Odeslat', theme: 'strong' },
                    { id: 6, label: 'Zrušit', theme: 'danger' }
                ],
                4: [
                    { id: 5, label: 'Dokončit', theme: 'strong' },
                    { id: 6, label: 'Zrušit', theme: 'danger' }
                ]
            };
            return map[Number(statusId)] || [];
        }

        formatAmount(value) {
            if (value === null || value === undefined) {
                return '—';
            }
            const num = typeof value === 'number' ? value : Number(value);
            if (Number.isNaN(num)) {
                return escapeHtml(String(value));
            }
            return currencyFormatter.format(num);
        }

        partitionOrders(list) {
            const email = (this.state.data?.profile?.email || '').toLowerCase();
            const history = new Set([5, 6]);
            const queue = [];
            const mine = [];
            const historyList = [];
            const refundRequests = [];
            list.forEach(order => {
                const statusId = Number(order?.statusId);
                const handler = (order?.handlerEmail || '').toLowerCase();
                const isMine = handler && email && handler === email;
                if (order?.pendingRefund && isMine) {
                    refundRequests.push(order);
                    return;
                }

                if (history.has(statusId)) {
                    if (isMine) {
                        historyList.push(order);
                    }
                    return;
                }
                if (isMine) {
                    mine.push(order);
                    return;
                }
                // Volné zobrazujeme jen stav Vytvořena (1) bez obsluhy
                if (statusId === 1) {
                    queue.push(order);
                }
            });
            this.state.clientOrders.queue = queue;
            this.state.clientOrders.refundRequests = refundRequests;
            this.state.clientOrders.mine = mine;
            this.state.clientOrders.history = historyList;
        }

        async load() {
            const token = localStorage.getItem('token');
            if (!token) {
                this.setAlert('Nejste přihlášen.');
                return;
            }
            this.state.clientOrders.loading = true;
            this.state.clientOrders.error = null;
            this.render();
            try {
                const response = await fetch(this.apiUrl('/api/client/orders'), {
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
                if (response.status === 403) {
                    this.state.clientOrders.queue = [];
                    this.state.clientOrders.refundRequests = [];
                    this.state.clientOrders.mine = [];
                    this.state.clientOrders.history = [];
                    this.state.clientOrders.error = 'Nemáte oprávnění k obsluze zákaznických objednávek.';
                    return;
                }
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'Objednávky se nepodařilo načíst.');
                }
                const data = await response.json();
                const list = Array.isArray(data) ? data : [];
                this.state.clientOrders.items = list;
                this.partitionOrders(list);
            } catch (err) {
                this.state.clientOrders.error = err.message || 'Objednávky se nepodařilo načíst.';
            } finally {
                this.state.clientOrders.loading = false;
                this.render();
            }
        }

        async changeStatus(orderId, triggerBtn, forcedStatusId = null) {
            if (!orderId) {
                alert('Chybí ID objednávky.');
                return;
            }
            const statusId = forcedStatusId !== null ? Number(forcedStatusId) : Number.NaN;
            if (Number.isNaN(statusId)) {
                alert('Vyberte platný stav.');
                return;
            }
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Nejste přihlášen.');
                return;
            }
            if (triggerBtn) {
                triggerBtn.disabled = true;
            }
            try {
                const response = await fetch(this.apiUrl(`/api/client/orders/${orderId}/status`), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ statusId })
                });
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = 'landing.html';
                    return;
                }
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'Změnu stavu se nepodařilo uložit.');
                }
                await this.load();
            } catch (err) {
                alert(err.message || 'Změnu stavu se nepodařilo uložit.');
            } finally {
                if (triggerBtn) {
                    triggerBtn.disabled = false;
                }
            }
        }

        async claimOrder(orderId, statusId, triggerBtn) {
            // Převzetí: posuň na další povolený stav podle matice 1→2→3→4→5 (nebo nech aktuální)
            const desired = this.resolveNextStatusForClaim(statusId);
            await this.changeStatus(orderId, triggerBtn, desired);
        }

        resolveNextStatusForClaim(statusId) {
            const current = Number(statusId);
            if (Number.isNaN(current) || current <= 1) return 2; // Vytvorena -> Potvrzena
            if (current === 2) return 3; // Potvrzena -> Pripravuje se
            if (current === 3) return 4; // Pripravuje se -> Odeslana
            if (current === 4) return 5; // Odeslana -> Dokoncena
            return current; // 5/6 necháme beze změny
        }
    }

    class CustomerHistoryModule {
        constructor(state, opts) {
            this.state = state;
            this.apiUrl = opts.apiUrl;
            this.tbody = document.getElementById('customer-history-body');
            this.badge = document.getElementById('customer-history-count');
            this.alert = document.getElementById('customer-history-alert');
            this.refreshBtn = document.getElementById('customer-history-refresh');
        }

        init() {
            if (!this.tbody) return;
            this.refreshBtn?.addEventListener('click', () => this.load());
            this.tbody.addEventListener('click', event => {
                const refund = event.target.closest('[data-history-refund]');
                if (refund) {
                    this.refundOrder(
                        refund.dataset.historyRefund,
                        refund.dataset.refundAmount,
                        refund,
                        refund.dataset.handlerLabel
                    );
                }
            });
            this.render();
            this.load();
        }

        setAlert(text) {
            if (!this.alert) return;
            if (text) {
                this.alert.textContent = text;
                this.alert.style.display = 'block';
            } else {
                this.alert.textContent = '';
                this.alert.style.display = 'none';
            }
        }

        updateBadge(count) {
            if (this.badge) {
                this.badge.textContent = count;
            }
        }

        render() {
            if (!this.tbody) return;
            const { items = [], loading, error } = this.state.customerHistory || {};
            this.setAlert(error);
            if (loading) {
                this.tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;" class="profile-muted">Načítám…</td></tr>';
                return;
            }
            if (!items.length) {
                this.tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;" class="profile-muted">Zatím žádné objednávky.</td></tr>';
                this.updateBadge(0);
                return;
            }
            this.tbody.innerHTML = items.map(order => this.renderRow(order)).join('');
            this.updateBadge(items.length);
        }

        renderRow(order) {
            const amountValue = order?.total ?? this.computeTotal(order?.items);
            const amount = this.formatAmount(amountValue);
            const status = escapeHtml(order?.status || '');
            const store = escapeHtml(order?.supermarket || '');
            const orderNumber = escapeHtml(order?.cislo || this.formatOrderNumber(order?.id));
            const date = escapeHtml(order?.createdAt || '');
            const items = this.renderItems(order?.items);
            const refunded = Boolean(order?.refunded);
            const pending = Boolean(order?.pendingRefund);
            const rejected = Boolean(order?.refundRejected);
            const statusClass = this.statusClass(order?.statusId, refunded || pending, rejected);
            const canRefund = !refunded && !pending && !rejected && Number(order?.statusId) === 5 && amountValue > 0;
            const handler = order?.handlerName
                ? escapeHtml(order.handlerName)
                : (order?.handlerEmail ? escapeHtml(order.handlerEmail) : '');
            const handlerLabel = handler || 'manažerovi';
            const refundBtn = canRefund
                ? `<button type="button" class="ghost-btn ghost-muted" data-history-refund="${order?.id ?? ''}" data-refund-amount="${amountValue}" data-handler-label="${handlerLabel}">Vrátit na účet</button>`
                : (pending
                    ? `<span class="badge status-badge warning">Odesláno manažerovi${handler ? ` (${handler})` : ''}</span>`
                    : (refunded
                        ? '<span class="badge badge-muted">Vráceno</span>'
                        : (rejected ? '<span class="badge status-badge danger">Zamítnuto</span>' : '')));
            return `
                <tr class="history-row${refunded ? ' refunded' : ''}${rejected ? ' refund-rejected' : ''}">
                    <td>${store}</td>
                    <td>${orderNumber}</td>
                    <td><span class="status-badge ${statusClass}">${status || '—'}</span></td>
                    <td>${date || '—'}</td>
                    <td>${amount}</td>
                    <td>${items}</td>
                    <td>${refundBtn}</td>
                </tr>
            `;
        }

        statusClass(statusId, refunded, rejected) {
            if (rejected) return 'danger';
            if (refunded) return 'muted';
            const id = Number(statusId);
            switch (id) {
                case 5: return 'success';
                case 6: return 'danger';
                case 3: return 'warning';
                case 2:
                case 4: return 'info';
                default: return 'info';
            }
        }

        renderItems(items) {
            const list = Array.isArray(items) ? items : [];
            if (!list.length) {
                return '<span class="profile-muted">Bez položek</span>';
            }
            return `<ul class="profile-muted" style="padding-left:16px;margin:0;">${list.map(item => `
                <li>${escapeHtml(item.name || '')} · ${item.qty ?? 0} × ${this.formatAmount(item.price)}</li>
            `).join('')}</ul>`;
        }

        formatAmount(value) {
            if (value === null || value === undefined) {
                return '—';
            }
            const num = typeof value === 'number' ? value : Number(value);
            if (Number.isNaN(num)) {
                return escapeHtml(String(value));
            }
            return currencyFormatter.format(num);
        }

        findOrder(orderId) {
            if (!orderId) return null;
            const { items = [] } = this.state.customerHistory || {};
            return (items || []).find(o => String(o?.id) === String(orderId)) || null;
        }

        formatOrderNumber(orderId) {
            const order = this.findOrder(orderId);
            return order?.cislo || '—';
        }

        computeTotal(items) {
            const list = Array.isArray(items) ? items : [];
            return list.reduce((sum, it) => {
                const price = Number(it.price ?? 0);
                const qty = Number(it.qty ?? 0);
                if (Number.isNaN(price) || Number.isNaN(qty)) return sum;
                return sum + price * qty;
            }, 0);
        }

        async refundOrder(orderId, amount, triggerBtn, handlerLabel) {
            if (!orderId) return;
            const amt = Number(amount);
            if (!amt || amt <= 0 || Number.isNaN(amt)) {
                alert('Částka k vrácení není platná.');
                return;
            }
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Nejste přihlášen.');
                return;
            }
            const target = handlerLabel && handlerLabel.trim().length ? handlerLabel.trim() : 'manažerovi';
            const orderLabel = this.formatOrderNumber(orderId);
            if (!confirm(`Poslat žádost o vrácení ${this.formatAmount(amt)} na účet za objednávku ${orderLabel} ke schválení ${target}?`)) {
                return;
            }
            if (triggerBtn) triggerBtn.disabled = true;
            try {
                const response = await fetch(this.apiUrl('/api/wallet/refund-request'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ orderId, amount: amt })
                });
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'Žádost se nepodařilo odeslat.');
                }
                alert(`Žádost byla odeslána ke schválení (${target}).`);
                if (triggerBtn) {
                    triggerBtn.textContent = `Odesláno manažerovi${handlerLabel ? ` (${handlerLabel})` : ''}`;
                    triggerBtn.disabled = true;
                }
                const items = Array.isArray(this.state.customerHistory.items) ? this.state.customerHistory.items : [];
                this.state.customerHistory.items = items.map(it => {
                    if (String(it?.id) !== String(orderId)) return it;
                    return { ...it, pendingRefund: true, refundRejected: false };
                });
                this.render();
            } catch (err) {
                alert(err.message || 'Žádost se nepodařilo odeslat.');
                if (triggerBtn) triggerBtn.disabled = false;
            }
        }

        findOrder(orderId) {
            if (!orderId) return null;
            const { items = [] } = this.state.customerHistory || {};
            return (items || []).find(o => String(o?.id) === String(orderId)) || null;
        }

        formatOrderNumber(orderId) {
            const order = this.findOrder(orderId);
            return order?.cislo || '—';
        }

        computeTotal(items) {
            const list = Array.isArray(items) ? items : [];
            return list.reduce((sum, it) => {
                const price = Number(it.price ?? 0);
                const qty = Number(it.qty ?? 0);
                if (Number.isNaN(price) || Number.isNaN(qty)) return sum;
                return sum + price * qty;
            }, 0);
        }

        async refundOrder(orderId, amount, triggerBtn, handlerLabel) {
            if (!orderId) return;
            const amt = Number(amount);
            if (!amt || amt <= 0 || Number.isNaN(amt)) {
                alert('Částka k vrácení není platná.');
                return;
            }
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Nejste přihlášen.');
                return;
            }
            const target = handlerLabel && handlerLabel.trim().length ? handlerLabel.trim() : 'manažerovi';
            const orderLabel = this.formatOrderNumber(orderId);
            if (!confirm(`Poslat žádost o vrácení ${this.formatAmount(amt)} na účet za objednávku ${orderLabel} ke schválení ${target}?`)) {
                return;
            }
            if (triggerBtn) triggerBtn.disabled = true;
            try {
                const response = await fetch(this.apiUrl('/api/wallet/refund-request'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ orderId, amount: amt })
                });
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'Žádost se nepodařilo odeslat.');
                }
                alert(`Žádost byla odeslána ke schválení (${target}).`);
                if (triggerBtn) {
                    triggerBtn.textContent = `Odesláno manažerovi${handlerLabel ? ` (${handlerLabel})` : ''}`;
                    triggerBtn.disabled = true;
                }
                const items = Array.isArray(this.state.customerHistory.items) ? this.state.customerHistory.items : [];
                this.state.customerHistory.items = items.map(it => {
                    if (String(it?.id) !== String(orderId)) return it;
                    return { ...it, pendingRefund: true, refundRejected: false };
                });
                this.render();
            } catch (err) {
                alert(err.message || 'Žádost se nepodařilo odeslat.');
                if (triggerBtn) triggerBtn.disabled = false;
            }
        }

        async load() {
            const token = localStorage.getItem('token');
            if (!token) {
                this.setAlert('Nejste přihlášen.');
                return;
            }
            this.state.customerHistory.loading = true;
            this.state.customerHistory.error = null;
            this.render();
            try {
                const response = await fetch(this.apiUrl('/api/client/orders/history'), {
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
                if (response.status === 403) {
                    this.state.customerHistory.items = [];
                    this.state.customerHistory.error = 'Nemáte oprávnění vidět historii objednávek.';
                    return;
                }
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'Historii se nepodařilo načíst.');
                }
                const data = await response.json();
                this.state.customerHistory.items = Array.isArray(data) ? data : [];
            } catch (err) {
                this.state.customerHistory.error = err.message || 'Historii se nepodařilo načíst.';
            } finally {
                this.state.customerHistory.loading = false;
                this.render();
            }
        }
    }

    class BDASConsole {
        constructor(state, meta) {
            this.state = state;
            this.requestedView = state.requestedView;
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
        this.clientOrders = new ClientOrdersModule(state, { apiUrl });
        this.customerHistory = new CustomerHistoryModule(state, { apiUrl });
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
            this.clientOrders.init();
            this.customerHistory.init();
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
                    <div class="wallet-actions-inline">
                        <label class="wallet-filter">
                            <span>Od</span>
                            <input type="date" id="wallet-date-from">
                        </label>
                        <label class="wallet-filter">
                            <span>Do</span>
                            <input type="date" id="wallet-date-to">
                        </label>
                        <button class="wallet-download" type="button" id="wallet-download" title="Stáhnout výpis"><span class="material-symbols-rounded" aria-hidden="true">download</span></button>
                        <button class="wallet-close" type="button" id="wallet-close">
                            <span class="material-symbols-rounded" aria-hidden="true">close</span>
                        </button>
                    </div>
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
            this.walletFromInput = panel.querySelector('#wallet-date-from');
            this.walletToInput = panel.querySelector('#wallet-date-to');
            const closeBtn = panel.querySelector('#wallet-close');
            const downloadBtn = panel.querySelector('#wallet-download');
            downloadBtn?.addEventListener('click', () => this.downloadWalletStatement());
            closeBtn.addEventListener('click', () => overlay.style.display = 'none');
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.style.display = 'none';
                }
            });
            [this.walletFromInput, this.walletToInput].forEach(input => {
                input?.addEventListener('change', () => this.loadWalletData());
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
            const from = this.walletFromInput?.value ? this.walletFromInput.value : null;
            const to = this.walletToInput?.value ? this.walletToInput.value : null;
            if (from && to && from > to) {
                this.walletStatus.textContent = 'Datum \"od\" musi byt <= \"do\".';
                this.walletStatus.classList.add('chat-status-error');
                return;
            }
            try {
                if (this.walletStatus) {
                    this.walletStatus.textContent = 'Nacitam...';
                    this.walletStatus.classList.remove('chat-status-error');
                }
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Chybi prihlaseni.');
                }
                const params = new URLSearchParams();
                if (from) params.append('from', from);
                if (to) params.append('to', to);
                const [balanceRes, historyRes] = await Promise.all([
                    fetch(apiUrl('/api/wallet'), { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(apiUrl(`/api/wallet/history${params.toString() ? '?' + params.toString() : ''}`), { headers: { 'Authorization': `Bearer ${token}` } })
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
                    const list = this.filterWalletHistory();
                    list.forEach(item => {
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

        parseDateOnly(val) {
            if (!val) return null;
            const d = new Date(val);
            if (Number.isNaN(d.getTime())) return null;
            return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        }

        filterWalletHistory() {
            const { history } = this.walletData || {};
            if (!history || !history.length) return [];
            const fromVal = this.walletFromInput?.value || null;
            const toVal = this.walletToInput?.value || null;
            const from = this.parseDateOnly(fromVal);
            const to = this.parseDateOnly(toVal);
            return history.filter(item => {
                if (!item?.createdAt) return true;
                const d = this.parseDateOnly(item.createdAt);
                if (!d) return true;
                if (from && d < from) return false;
                if (to && d > to) return false;
                return true;
            });
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
            const { balance } = this.walletData || {};
            const history = this.filterWalletHistory();
            if (!history || !history.length) {
                alert('Žádné pohyby k exportu.');
                return;
            }
            const from = this.walletFromInput?.value || '';
            const to = this.walletToInput?.value || '';
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
    ${from || to ? `<p>Období: ${from || '—'} až ${to || '—'}</p>` : ''}
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
            const allowedViews = resolveAllowedViews(this.state.data.profile?.role || localStorage.getItem('role'), this.state.data.profile?.permissions);
            if (this.navigation) {
                this.navigation.allowedViews = allowedViews;
                this.navigation.refreshNavVisibility();
                const desired = this.requestedView || this.state.activeView;
                const target = desired && this.navigation.isAllowed(desired)
                    ? desired
                    : (this.state.activeView && this.navigation.isAllowed(this.state.activeView) ? this.state.activeView : this.navigation.defaultView);
                this.navigation.setActive(target);
            }
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
            this.clientOrders.render();
            this.customerHistory.render();
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

        formatCurrency(amount) {
            return currencyFormatter.format(amount || 0);
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
                    const header = response.headers.get('X-Error');
                    const message = header || text || `Platbu se nepodarilo dokoncit. (HTTP ${response.status})`;
                    throw new Error(message);
                }
                const data = await response.json();
                this.state.customerCart = [];
                try { localStorage.removeItem('customerCart'); } catch (e) {}
                if (typeof window?.app?.customer?.render === 'function') {
                    try { window.app.customer.render(); } catch (e) { console.debug('Customer view refresh skip', e); }
                }
                if (typeof window?.app?.updateWalletChip === 'function' && method === 'WALLET') {
                    try { window.app.updateWalletChip(); } catch (e) { console.debug('Wallet chip refresh skip', e); }
                }
                if (data && typeof data.walletBalance !== 'undefined' && typeof window?.app?.setWalletChipBalance === 'function') {
                    window.app.setWalletChipBalance(data.walletBalance || 0);
                }
                if (data && data.cashbackAmount && Number(data.cashbackAmount) > 0) {
                    this.showCashbackModal(data.cashbackAmount, data.walletBalance, data.cashbackTurnover);
                }
                this.statusEl.textContent = 'Objednavka a platba byly ulozeny. Presmerovani do historie zakaznika...';
                this.statusEl.classList.add('chat-status-success');
                setTimeout(() => {
                    if (typeof window?.app?.customerHistory?.load === 'function') {
                        try { window.app.customerHistory.load(); } catch (e) { console.debug('history refresh skip', e); }
                    }
                    if (typeof window?.app?.navigation?.setActive === 'function') {
                        window.app.navigation.setActive('customer-history');
                    } else {
                        window.location.href = 'customer-history.html';
                    }
                }, 1500);
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

    // --- Prodejny & sklady CRUD na dashboardu ---
    function setupStoreCrudHandlers() {
        const addBtn = document.getElementById('store-add-btn');
        const editBtn = document.getElementById('store-edit-btn');
        const delBtn = document.getElementById('store-delete-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => openStoreDialog('create'));
        }
        if (editBtn) {
            editBtn.addEventListener('click', () => openStoreDialog('edit'));
        }
        if (delBtn) {
            delBtn.addEventListener('click', handleStoreDelete);
        }
    }

    async function refreshMarketDataAndRender() {
        try {
            const [stores, warehouses] = await Promise.all([fetchMarketSupermarkets(), fetchMarketWarehouses()]);
            state.marketSupermarkets = Array.isArray(stores) ? stores : [];
            state.marketWarehouses = Array.isArray(warehouses) ? warehouses : [];
            state.selectedStoreId = null;
            if (window.app?.dashboard?.render) {
                window.app.dashboard.render();
            }
        } catch (err) {
            console.error('Nepodarilo se obnovit prodejny/sklady', err);
            alert(err.message || 'Obnova prodejen selhala.');
        }
    }

    function pickStoreDataById(id) {
        if (!id) return { store: null, warehouse: null };
        const store = (state.marketSupermarkets || []).find(s => String(s.id) === String(id));
        const warehouse = store ? (state.marketWarehouses || []).find(w => String(w.supermarketId) === String(store.id)) : null;
        return { store, warehouse };
    }

    function buildStoreFormModal(mode, existingStore, existingWarehouse) {
        const overlay = document.createElement('div');
        overlay.className = 'modal active';
        overlay.style.zIndex = '9999';
        const title = mode === 'edit' ? 'Upravit prodejnu' : 'Nová prodejna';
        overlay.innerHTML = `
            <div class="modal-content" role="dialog" aria-modal="true" style="max-width:640px;">
                <div class="modal-header" style="align-items:flex-start;">
                    <div>
                        <p class="eyebrow" style="margin:0;">Prodejny &amp; sklady</p>
                        <h3 style="margin:0;">${title}</h3>
                    </div>
                    <button type="button" class="ghost-btn ghost-muted" data-store-close>&times;</button>
                </div>
                <div style="display:grid;gap:12px;">
                    <label style="display:grid;gap:6px;">
                        <span>Název prodejny</span>
                        <input type="text" id="store-name" value="${escapeHtml(existingStore?.nazev || '')}" required>
                    </label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <label style="display:grid;gap:6px;">
                            <span>Telefon</span>
                            <input type="text" id="store-tel" value="${escapeHtml(existingStore?.telefon || '')}">
                        </label>
                        <label style="display:grid;gap:6px;">
                            <span>Email</span>
                            <input type="email" id="store-email" value="${escapeHtml(existingStore?.email || '')}">
                        </label>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <label style="display:grid;gap:6px;">
                            <span>Ulice</span>
                            <input type="text" id="store-ulice" value="${escapeHtml(existingStore?.adresaUlice || '')}" required>
                        </label>
                        <label style="display:grid;gap:6px;">
                            <span>PSČ</span>
                            <input type="text" id="store-psc" value="${escapeHtml(existingStore?.adresaPsc || '')}" required>
                        </label>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <label style="display:grid;gap:6px;">
                            <span>Číslo popisné</span>
                            <input type="text" id="store-cpop" value="${escapeHtml(existingStore?.adresaCpop || '')}" required>
                        </label>
                        <label style="display:grid;gap:6px;">
                            <span>Číslo orientační</span>
                            <input type="text" id="store-corient" value="${escapeHtml(existingStore?.adresaCorient || '')}" required>
                        </label>
                    </div>
                    <div style="display:grid;gap:10px;border-top:1px solid var(--border);padding-top:10px;">
                        <strong>Sklad</strong>
                        <label style="display:grid;gap:6px;">
                            <span>Název skladu</span>
                            <input type="text" id="store-wh-name" value="${escapeHtml(existingWarehouse?.nazev || '')}">
                        </label>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                            <label style="display:grid;gap:6px;">
                                <span>Kapacita</span>
                                <input type="number" id="store-wh-cap" value="${existingWarehouse?.kapacita ?? ''}" min="0">
                            </label>
                            <label style="display:grid;gap:6px;">
                                <span>Telefon skladu</span>
                                <input type="text" id="store-wh-tel" value="${escapeHtml(existingWarehouse?.telefon || '')}">
                            </label>
                        </div>
                    </div>
                    <div class="dialog-actions" style="justify-content:flex-end;gap:10px;">
                        <button type="button" class="ghost-btn ghost-muted" data-store-close>Zavřít</button>
                        <button type="button" class="ghost-btn ghost-strong" id="store-save-btn">Uložit</button>
                    </div>
                    <p id="store-form-status" class="profile-muted"></p>
                </div>
            </div>
        `;
        return overlay;
    }

    async function openStoreDialog(mode) {
        const selectedId = state.selectedStoreId;
        const { store: existingStore, warehouse: existingWarehouse } = pickStoreDataById(selectedId);
        if (mode === 'edit' && !existingStore) {
            alert('Vyberte prodejnu pro úpravu.');
            return;
        }
        const overlay = buildStoreFormModal(mode, existingStore, existingWarehouse);
        const cleanup = () => overlay.remove();
        overlay.querySelectorAll('[data-store-close]').forEach(btn => btn.addEventListener('click', cleanup));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup();
        });
        overlay.querySelector('#store-save-btn')?.addEventListener('click', async () => {
            const name = overlay.querySelector('#store-name')?.value?.trim();
            const tel = overlay.querySelector('#store-tel')?.value?.trim() || '';
            const email = overlay.querySelector('#store-email')?.value?.trim() || '';
            const ulice = overlay.querySelector('#store-ulice')?.value?.trim();
            const psc = overlay.querySelector('#store-psc')?.value?.trim();
            const cpop = overlay.querySelector('#store-cpop')?.value?.trim();
            const corient = overlay.querySelector('#store-corient')?.value?.trim();
            const whName = overlay.querySelector('#store-wh-name')?.value?.trim() || '';
            const whCap = Number(overlay.querySelector('#store-wh-cap')?.value || 0) || 0;
            const whTel = overlay.querySelector('#store-wh-tel')?.value?.trim() || '';
            const statusEl = overlay.querySelector('#store-form-status');

            if (!name || !ulice || !psc || !cpop || !corient) {
                statusEl.textContent = 'Vyplňte povinná pole prodejny (název, ulice, č.p., č.o., PSČ).';
                return;
            }
            statusEl.textContent = 'Ukládám...';
            try {
                const savedStore = await upsertSupermarket({
                    id: mode === 'edit' ? existingStore?.id : null,
                    nazev: name,
                    telefon: tel,
                    email: email,
                    adresaId: mode === 'edit' ? existingStore?.adresaId : null,
                    adresaUlice: ulice,
                    adresaCpop: cpop,
                    adresaCorient: corient,
                    adresaPsc: psc
                });
                const storeId = savedStore?.id || existingStore?.id;
                if (whName && storeId) {
                    await upsertWarehouse({
                        id: existingWarehouse?.id || null,
                        nazev: whName,
                        kapacita: whCap,
                        telefon: whTel,
                        supermarketId: storeId
                    });
                }
                await refreshMarketDataAndRender();
                cleanup();
            } catch (err) {
                console.error('Uložení prodejny/skladu selhalo', err);
                statusEl.textContent = err.message || 'Uložení prodejny selhalo.';
            }
        });
        document.body.appendChild(overlay);
    }

    async function handleStoreDelete() {
        const selectedId = state.selectedStoreId;
        if (!selectedId) {
            alert('Vyberte prodejnu ke smazání.');
            return;
        }
        if (!confirm('Opravdu smazat vybranou prodejnu včetně skladu?')) {
            return;
        }
        try {
            await deleteSupermarketById(selectedId);
            await refreshMarketDataAndRender();
        } catch (err) {
            console.error('Smazání prodejny selhalo', err);
            alert(err.message || 'Smazání se nepodařilo.');
        }
    }

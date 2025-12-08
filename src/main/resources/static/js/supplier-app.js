const apiBaseUrl = (window.location.origin && window.location.origin !== 'null') ? window.location.origin : 'http://localhost:8082';
const apiUrl = (path) => `${apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
const currencyFormatter = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

function requireToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'landing.html';
    }
    return token;
}

async function fetchJson(path) {
    const token = requireToken();
    const res = await fetch(apiUrl(path), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });
    if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        window.location.href = 'landing.html';
        return null;
    }
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res.json();
}

async function postJson(path, body) {
    const token = requireToken();
    const res = await fetch(apiUrl(path), {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : null
    });
    if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        window.location.href = 'landing.html';
        return null;
    }
    if (res.status === 204) return null;
    const text = await res.text();
    if (!res.ok) throw new Error(text || 'Neznámá chyba');
    try {
        return JSON.parse(text);
    } catch (e) {
        return text;
    }
}

function renderOrders(container, orders, options = {}) {
    if (!container) return;
    if (!orders || !orders.length) {
        const msg = options.emptyText || 'Žádné objednávky.';
        container.innerHTML = `<p class="profile-muted">${msg}</p>`;
        return;
    }
    container.innerHTML = orders.map(order => {
        const buttons = [];
        if (options.allowClaim) {
            buttons.push(`<button class="ghost-btn ghost-strong" data-claim="${order.id}">Vezmu</button>`);
        } else {
            if (order.statusId === 2) {
                buttons.push(`<button class="ghost-btn" data-status="3" data-id="${order.id}">Připravuji</button>`);
                buttons.push(`<button class="ghost-btn ghost-muted" data-status="6" data-id="${order.id}">Zrušit</button>`);
            } else if (order.statusId === 3) {
                buttons.push(`<button class="ghost-btn" data-status="4" data-id="${order.id}">Odesláno</button>`);
                buttons.push(`<button class="ghost-btn ghost-muted" data-status="6" data-id="${order.id}">Zrušit</button>`);
            } else if (order.statusId === 4) {
                buttons.push(`<button class="ghost-btn ghost-strong" data-status="5" data-id="${order.id}">Dokončit</button>`);
                buttons.push(`<button class="ghost-btn ghost-muted" data-status="6" data-id="${order.id}">Zrušit</button>`);
            }
        }
        const itemsHtml = (order.items || []).map(it =>
            `<li>${it.name} · ${it.qty} ks × ${currencyFormatter.format(it.price || 0)}</li>`
        ).join('');
        return `
        <article class="panel" data-order-id="${order.id}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                <div>
                    <h3 style="margin:0;">Objednávka #${order.id}</h3>
                    <p style="margin:0;color:var(--muted);">${order.supermarket || '—'} • Stav: ${order.status || order.statusId}</p>
                    ${order.rewardEstimate ? `<p style="margin:4px 0 0;">Odhad výplaty: <strong>${currencyFormatter.format(order.rewardEstimate)}</strong></p>` : ''}
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${buttons.join('')}
                </div>
            </div>
            <ul style="margin-top:10px;padding-left:18px;">${itemsHtml}</ul>
        </article>
        `;
    }).join('');
}

function showToast(message) {
    const div = document.createElement('div');
    div.textContent = message;
    div.style.position = 'fixed';
    div.style.bottom = '20px';
    div.style.right = '20px';
    div.style.background = '#111827';
    div.style.color = '#fff';
    div.style.padding = '12px 16px';
    div.style.borderRadius = '12px';
    div.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
    div.style.zIndex = '9999';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2500);
}

async function init() {
    const root = document.getElementById('app-root');
    const token = requireToken();
    if (!token) return;

    root.classList.remove('app-boot');
    root.innerHTML = `
      <div class="workspace" style="padding:24px;max-width:1100px;margin:0 auto;">
        <header style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div>
                <p class="eyebrow">Dodavatel</p>
                <h1 style="margin:4px 0 0;">Dodavatelské objednávky</h1>
            </div>
            <div>
                <a class="nav-link" href="index.html">← Zpět do aplikace</a>
            </div>
        </header>
        <section style="margin-top:24px;" id="free-orders-section">
            <h2>Volné objednávky</h2>
            <div id="free-orders"></div>
        </section>
        <section style="margin-top:24px;" id="my-orders-section">
            <h2>Moje objednávky</h2>
            <div id="my-orders"></div>
        </section>
      </div>
    `;

    const freeContainer = document.getElementById('free-orders');
    const myContainer = document.getElementById('my-orders');

    async function loadAll() {
        try {
            const [free, mine] = await Promise.all([
                fetchJson('/api/supplier/orders/free'),
                fetchJson('/api/supplier/orders/mine')
            ]);
            renderOrders(freeContainer, free || [], { allowClaim: true, emptyText: 'Žádné volné objednávky – zásoby jsou v pořádku.' });
            renderOrders(myContainer, mine || [], { allowClaim: false, emptyText: 'Zatím žádné převzaté objednávky.' });

            freeContainer.querySelectorAll('[data-claim]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-claim');
                    try {
                        await postJson(`/api/supplier/orders/${id}/claim`);
                        showToast('Objednávka převzatá');
                        await loadAll();
                    } catch (e) {
                        alert(e.message || 'Nelze převzít objednávku.');
                    }
                });
            });
            myContainer.querySelectorAll('[data-status]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    const status = Number(btn.getAttribute('data-status'));
                    try {
                        const res = await postJson(`/api/supplier/orders/${id}/status`, { statusId: status });
                        if (res && res.reward) {
                            alert(`Hotovo! Výplata: ${currencyFormatter.format(res.reward)}\nNový zůstatek: ${currencyFormatter.format(res.balance || 0)}`);
                        } else {
                            showToast('Stav upraven');
                        }
                        await loadAll();
                    } catch (e) {
                        alert(e.message || 'Nelze změnit stav.');
                    }
                });
            });
        } catch (e) {
            freeContainer.innerHTML = `<p class="profile-muted">${e.message || 'Chyba načítání volných objednávek.'}</p>`;
        }
    }

    loadAll();
}

document.addEventListener('DOMContentLoaded', init);

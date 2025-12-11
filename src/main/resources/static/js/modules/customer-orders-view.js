const fallbackFormatter = new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0
});

export default class CustomerOrdersView {
    constructor(state, formatter, opts = {}) {
        this.state = state;
        this.formatter = formatter || fallbackFormatter;
        this.tbody = document.getElementById('customer-orders-body');
        this.apiUrl = opts.apiUrl;
        this.refreshWalletChip = typeof opts.refreshWalletChip === 'function' ? opts.refreshWalletChip : () => {};
    }

    render() {
        if (!this.tbody) return;
        const orders = Array.isArray(this.state.data.customerOrders) ? this.state.data.customerOrders : [];
        if (!orders.length) {
            this.tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"> Zadne objednavky.</td></tr>';
            return;
        }
        this.tbody.innerHTML = orders.map(order => `
            <tr>
                <td>${order.cislo || '—'}</td>
                <td>${order.store || ''}</td>
                <td>${order.status || ''}</td>
                <td>${order.date || ''}</td>
                <td>${order.amount ? this.formatter.format(order.amount) : ''}</td>
                <td>
                    <button class="ghost-btn ghost-muted" data-refund-order="${order.id || ''}" data-refund-amount="${order.amount || ''}">
                        Vratit na ucet
                    </button>
                </td>
            </tr>
        `).join('');
        this.tbody.querySelectorAll('[data-refund-order]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.refundOrder;
                const amount = parseFloat(btn.dataset.refundAmount || '0');
                this.refundOrder(btn, id, amount, orders.find(o => (o.id || '').toString() === (id || '').toString()));
            });
        });
    }

    async refundOrder(buttonEl, orderId, amount, order) {
        const displayNumber = order && order.cislo ? order.cislo : 'bez čísla';
        if (!orderId) {
            alert('Chybi ID objednavky.');
            return;
        }
        if (!this.apiUrl) {
            alert('API adresa neni k dispozici.');
            return;
        }
        if (!amount || amount <= 0) {
            alert('Castka k vraceni neni platna.');
            return;
        }
        if (!confirm(`Vratit ${this.formatter.format(amount)} na ucet za objednavku ${displayNumber}?`)) {
            return;
        }
        if (buttonEl) {
            buttonEl.disabled = true;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Nejste prihlasen.');
            if (buttonEl) buttonEl.disabled = false;
            return;
        }
        try {
            const response = await fetch(this.apiUrl('/api/wallet/refund'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ orderId, amount })
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Refund se nepodaril.');
            }
            alert('Refund byl proveden.');
            if (buttonEl) {
                buttonEl.textContent = 'Vraceno';
                buttonEl.disabled = true;
                const row = buttonEl.closest('tr');
                const statusCell = row ? row.querySelector('td:nth-child(3)') : null;
                if (statusCell) {
                    statusCell.textContent = 'Zruseno';
                }
            }
            this.refreshWalletChip();
        } catch (err) {
            alert(err.message || 'Refund se nepodaril.');
            if (buttonEl) buttonEl.disabled = false;
        }
    }
}

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
        const orders = Array.isArray(this.state.data.orders) ? this.state.data.orders : [];
        if (!orders.length) {
            this.tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Žádné objednávky.</td></tr>';
            return;
        }
        this.tbody.innerHTML = orders.map(order => `
            <tr>
                <td>${order.id || ''}</td>
                <td>${order.store || ''}</td>
                <td>${order.status || ''}</td>
                <td>${order.date || ''}</td>
                <td>${order.amount ? this.formatter.format(order.amount) : ''}</td>
                <td>
                    <button class="ghost-btn ghost-muted" data-refund-order="${order.id || ''}" data-refund-amount="${order.amount || ''}">
                        Vrátit na účet
                    </button>
                </td>
            </tr>
        `).join('');
        this.tbody.querySelectorAll('[data-refund-order]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.refundOrder;
                const amount = parseFloat(btn.dataset.refundAmount || '0');
                this.refundOrder(id, amount);
            });
        });
    }

    async refundOrder(orderId, amount) {
        if (!orderId) {
            alert('Chybí ID objednávky.');
            return;
        }
        if (!this.apiUrl) {
            alert('API adresa není k dispozici.');
            return;
        }
        if (!amount || amount <= 0) {
            alert('Částka k vrácení není platná.');
            return;
        }
        if (!confirm(`Vrátit ${this.formatter.format(amount)} na účet za objednávku ${orderId}?`)) {
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Nejste přihlášen.');
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
                throw new Error(text || 'Refund se nepodařil.');
            }
            alert('Refund byl proveden.');
            this.refreshWalletChip();
        } catch (err) {
            alert(err.message || 'Refund se nepodařil.');
        }
    }
}

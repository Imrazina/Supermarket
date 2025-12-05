const fallbackFormatter = new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0
});

export default class CustomerOrdersView {
    constructor(state, formatter) {
        this.state = state;
        this.formatter = formatter || fallbackFormatter;
        this.tbody = document.getElementById('customer-orders-body');
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
                <td><button class="ghost-btn ghost-muted" data-cancel-order="${order.id || ''}">Zrušit</button></td>
            </tr>
        `).join('');
        this.tbody.querySelectorAll('[data-cancel-order]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.cancelOrder;
                alert(`Zrušení objednávky ${id} zatím není implementováno.`);
            });
        });
    }
}

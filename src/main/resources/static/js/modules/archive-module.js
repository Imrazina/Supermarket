export default class ArchiveModule {
    constructor(state) {
        this.state = state;
        this.logTable = document.getElementById('file-table-body');
        this.folderTree = document.getElementById('folder-tree');
        this.logDetail = document.getElementById('log-detail');
        this.expanded = new Set();
        this.apiBaseUrl = this.computeApiBase();
        this.selectedLog = null;
    }

    init() {
        if (this.folderTree) {
            this.folderTree.addEventListener('click', event => {
                const btn = event.target.closest('[data-folder]');
                if (!btn) return;
                const nodeId = btn.dataset.id ? String(btn.dataset.id) : null;
                const item = btn.closest('.tree-item');
                if (item && item.classList.contains('has-children') && nodeId) {
                    if (this.expanded.has(nodeId)) {
                        this.expanded.delete(nodeId);
                    } else {
                        this.expanded.add(nodeId);
                    }
                }
                this.state.selectedFolder = btn.dataset.folder;
                this.renderTree();
                this.fetchLogs(nodeId);
            });
        }
        this.fetchTree();
    }

    computeApiBase() {
        const currentOrigin = (window.location.origin && window.location.origin !== 'null') ? window.location.origin : '';
        const guessedLocalApi = (!currentOrigin || (window.location.hostname === 'localhost' && window.location.port !== '8082'))
            ? 'http://localhost:8082'
            : currentOrigin;
        const bodyBase = document.body.dataset.apiBase?.trim() || window.API_BASE_URL || guessedLocalApi;
        return bodyBase.replace(/\/$/, '');
    }

    authHeaders() {
        const token = localStorage.getItem('token') || '';
        return {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        };
    }

    async fetchTree() {
        try {
            const res = await fetch(`${this.apiBaseUrl}/api/archive/tree`, { headers: this.authHeaders() });
            if (!res.ok) return;
            this.state.data.archiveTree = await res.json();
            // žádný výchozí výběr -> načteme logy bez filtru
            this.renderTree();
            this.fetchLogs(null);
        } catch (err) {
            console.error('Archive tree load failed', err);
        }
    }

    async fetchLogs(archiveId) {
        const id = archiveId || null;
        try {
            const url = id ? `${this.apiBaseUrl}/api/archive/logs?archiveId=${id}&size=100`
                           : `${this.apiBaseUrl}/api/archive/logs?size=100`;
            const res = await fetch(url, { headers: this.authHeaders() });
            if (!res.ok) return;
            const logs = await res.json();
            console.debug('[archive] raw logs response', logs);
            this.state.data.logs = (logs || []).map(log => ({
                table: log.table,
                operation: log.op,
                timestamp: log.timestamp,
                archive: log.archive,
                descr: log.descr,
                recordId: log.recordId,
                newData: log.newData || log.novaData || '',
                oldData: log.oldData || log.staraData || '',
                recordName: log.recordName || this.extractName(log.newData || log.novaData) || this.extractName(log.oldData || log.staraData) || ''
            }));
            this.selectedLog = this.state.data.logs[0] || null;
            this.renderLogs();
        } catch (err) {
            console.error('Archive logs load failed', err);
        }
    }

    renderTree() {
        if (!this.folderTree) return;
        const nodes = this.state.data.archiveTree || [];
        const byParent = nodes.reduce((acc, node) => {
            const key = node.parentId === null ? 'root' : String(node.parentId);
            acc[key] = acc[key] || [];
            acc[key].push(node);
            return acc;
        }, {});
        (byParent['root'] || []).forEach(root => this.expanded.add(String(root.id)));
        const renderBranch = (parentKey) => {
            const children = byParent[parentKey] || [];
            if (!children.length) return '';
            return `<ul class="tree-list">
                ${children.map(child => `
                    <li class="tree-item ${byParent[String(child.id)] && byParent[String(child.id)].length ? 'has-children' : ''} ${this.expanded.has(String(child.id)) ? 'expanded' : ''}">
                        <button class="tree-node" data-folder="${child.name}" data-id="${child.id}">
                            <span class="material-symbols-rounded">folder</span>
                            <div>
                                <strong>${child.name}</strong>
                                <small class="muted">${child.path || ''}</small>
                            </div>
                        </button>
                        ${renderBranch(String(child.id))}
                    </li>
                `).join('')}
            </ul>`;
        };
        this.folderTree.innerHTML = nodes.length ? renderBranch('root') : '<p>Žádné složky.</p>';
    }

    renderLogs() {
        if (this.logTable) {
            const logs = this.state.data.logs || [];
            this.logTable.innerHTML = logs.length
                ? logs.map((log, idx) => `
                    <tr class="${this.selectedLog === log ? 'active' : ''}" data-log-idx="${idx}">
                        <td>${log.table}</td>
                        <td>${log.operation}</td>
                        <td>${log.archive || ''}</td>
                        <td>${log.recordName || ''}</td>
                        <td>${log.timestamp}</td>
                        <td>${log.newData || ''}</td>
                        <td>${log.oldData || ''}</td>
                        <td>${log.descr || ''}</td>
                    </tr>
                `).join('')
                : '<tr><td colspan="8">Žádné logy pro tuto složku.</td></tr>';
            this.logTable.querySelectorAll('tr[data-log-idx]')?.forEach(row => {
                row.addEventListener('click', () => {
                    const idx = Number(row.dataset.logIdx);
                    this.selectedLog = logs[idx];
                    this.renderLogs();
                });
            });
        }

        if (this.logDetail) {
            if (this.selectedLog) {
                this.logDetail.innerHTML = `
                    <strong>${this.selectedLog.table}</strong> · ${this.selectedLog.operation}<br>
                    <small>${this.selectedLog.timestamp}</small><br>
                    <p>${this.selectedLog.descr || ''}</p>
                    <p><strong>záznam:</strong> ${this.selectedLog.recordName || '-'}</p>
                    <p class="muted">Archiv: ${this.selectedLog.archive || ''}</p>
                    <p class="muted">Nová data: ${this.selectedLog.newData || '-'}</p>
                    <p class="muted">Stará data: ${this.selectedLog.oldData || '-'}</p>
                `;
            } else {
                this.logDetail.innerHTML = '<p class="muted">Vyberte log pro detail.</p>';
            }
        }
    }

    render() {
        this.renderTree();
        this.renderLogs();
    }

    extractName(dataStr) {
        if (!dataStr) return '';
        const match = String(dataStr).match(/nazev=([^;]+)/i);
        return match ? match[1].trim() : '';
    }
}

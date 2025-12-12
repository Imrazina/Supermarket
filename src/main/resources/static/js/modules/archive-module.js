export default class ArchiveModule {
    constructor(state) {
        this.state = state;
        this.logTable = document.getElementById('file-table-body');
        this.tableHead = document.getElementById('audit-table-head');
        this.table = document.querySelector('[data-view="records"] table');
        this.folderTree = document.getElementById('folder-tree');
        this.view = document.querySelector('[data-view="records"]');
        this.navLink = document.querySelector('.nav-link[data-view="records"]');
        this.uploadInput = document.getElementById('file-upload-input');
        this.uploadBtn = document.getElementById('file-upload-btn');
        this.uploadHint = document.getElementById('upload-hint');
        this.reportBtn = document.getElementById('report-generate-btn');
        this.reportMonthSelect = document.getElementById('report-month-select');
        this.reportControls = document.querySelector('.report-trigger');
        this.reportNodeId = '53';
        this.previewModal = document.getElementById('file-preview-modal');
        this.previewFrame = document.getElementById('file-preview-frame');
        this.previewImage = document.getElementById('file-preview-image');
        this.previewTitle = document.getElementById('file-preview-title');
        this.previewError = document.getElementById('file-preview-error');
        this.previewClose = document.getElementById('file-preview-close');
        this.previewText = document.getElementById('file-preview-text');
        this.previewEditor = document.getElementById('file-preview-editor');
        this.previewEditBtn = document.getElementById('file-preview-edit');
        this.previewSaveBtn = document.getElementById('file-preview-save');
        this.previewStatus = document.getElementById('file-preview-status');
        this.currentPreviewUrl = null;
        this.currentPreviewFile = null;
        this.currentPreviewMode = null;
        this.editorVisible = false;
        this.logDetailCard = document.getElementById('log-detail-card');
        this.selectedLog = null;
        this.selectedLogId = null;
        this.dialogModal = document.getElementById('dialog-modal');
        this.dialogTitle = document.getElementById('dialog-title');
        this.dialogMessage = document.getElementById('dialog-message');
        this.dialogInput = document.getElementById('dialog-input');
        this.dialogConfirm = document.getElementById('dialog-confirm');
        this.dialogCancel = document.getElementById('dialog-cancel');
        this.dialogResolver = null;
        this.expanded = new Set();
        this.apiBaseUrl = this.computeApiBase();
        this.selectedNodeId = null;
        this.mode = 'logs';
    }

    init() {
        if (!this.hasAccess()) {
            this.hideView();
            return;
        }
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
                this.selectedNodeId = nodeId;
                this.state.selectedFolder = btn.dataset.folder;
                this.renderTree();
                this.loadForNode(nodeId);
            });
        }
        if (this.uploadBtn && this.uploadInput) {
            this.uploadBtn.addEventListener('click', () => this.uploadInput.click());
            this.uploadInput.addEventListener('change', () => this.handleUpload());
        }
        if (this.reportBtn) {
            this.reportBtn.addEventListener('click', () => this.handleGenerateReports());
            if (!this.canGenerateReports()) {
                this.reportBtn.style.display = 'none';
                if (this.reportMonthSelect) this.reportMonthSelect.style.display = 'none';
                if (this.reportControls) this.reportControls.style.display = 'none';
            } else {
                this.populateReportMonths();
                const defaultNode = this.findNode(this.pickDefaultNodeId());
                this.toggleReportControls(this.isReportNode(defaultNode));
            }
        }
        if (this.previewClose) {
            this.previewClose.addEventListener('click', () => this.closePreview());
        }
        if (this.previewModal) {
            this.previewModal.addEventListener('click', (e) => {
                if (e.target === this.previewModal) {
                    this.closePreview();
                }
            });
        }
        if (this.previewSaveBtn) {
            this.previewSaveBtn.addEventListener('click', () => this.saveEdits());
        }
        if (this.previewEditor) {
            this.previewEditor.addEventListener('input', () => this.markDirty());
        }
        if (this.dialogModal) {
            this.dialogModal.addEventListener('click', (e) => {
                if (e.target === this.dialogModal) {
                    this.resolveDialog(null);
                }
            });
        }
        if (this.dialogCancel) {
            this.dialogCancel.addEventListener('click', () => this.resolveDialog(null));
        }
        this.fetchTree();
    }

    hasAccess() {
        const permissions = this.state.data?.profile?.permissions;
        return Array.isArray(permissions) && permissions.includes('VIEW_ARCHIVE');
    }

    canGenerateReports() {
        const permissions = this.state.data?.profile?.permissions;
        return Array.isArray(permissions) && permissions.includes('CLIENT_ORDER_MANAGE');
    }

    populateReportMonths() {
        if (!this.reportMonthSelect) return;
        const sel = this.reportMonthSelect;
        sel.innerHTML = '';
        const optAuto = document.createElement('option');
        optAuto.value = '';
        optAuto.textContent = 'Minulý měsíc';
        sel.appendChild(optAuto);
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const opt = document.createElement('option');
            opt.value = `${yyyy}-${mm}`;
            opt.textContent = `${yyyy}-${mm}`;
            sel.appendChild(opt);
        }
    }

    hideView() {
        this.view?.remove();
        this.navLink?.remove();
    }

    computeApiBase() {
        const currentOrigin = (window.location.origin && window.location.origin !== 'null') ? window.location.origin : '';
        const guessedLocalApi = (!currentOrigin || (window.location.hostname === 'localhost' && window.location.port !== '8082'))
            ? 'http://localhost:8082'
            : currentOrigin;
        const bodyBase = document.body.dataset.apiBase?.trim() || window.API_BASE_URL || guessedLocalApi;
        return bodyBase.replace(/\/$/, '');
    }

    isLogLabel(name) {
        if (!name) return false;
        const lower = String(name).toLowerCase();
        return (
            /\blog\b/i.test(lower)
            || lower.includes('zpravy')
            || lower.includes('zpráva')
            || lower.includes('uzivatele')
            || lower.includes('uživatele')
            || lower.includes('ucty')
            || lower.includes('účty')
            || lower.includes('platby')
        );
    }

    isLogPath(path) {
        if (!path) return false;
        return String(path)
            .split('/')
            .some(segment => this.isLogLabel(segment));
    }

    authHeaders() {
        const token = localStorage.getItem('token') || '';
        return {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        };
    }

    async fetchTree(selectId = null) {
        try {
            const res = await fetch(`${this.apiBaseUrl}/api/archive/tree`, { headers: this.authHeaders() });
            if (!res.ok) return;
            this.state.data.archiveTree = await res.json();
            const targetId = selectId || this.pickDefaultNodeId();
            this.selectedNodeId = targetId;
            this.renderTree();
            await this.loadForNode(targetId);
        } catch (err) {
            console.error('Archive tree load failed', err);
        }
    }

    async loadForNode(nodeId) {
        const node = this.findNode(nodeId);
        const isLog = this.isLogNode(node);
        const isUserAudit = this.isUserAuditNode(node);
        const isRoot = node && node.parentId === null;
        const isSupermarket = this.isSupermarketNode(node);
        const hasChildren = node ? (this.state.data.archiveTree || []).some(n => String(n.parentId) === String(node.id)) : false;
        if (!node) {
            this.mode = 'placeholder';
            this.setTableModeClasses();
            this.state.data.files = [];
            this.selectedLog = null;
            this.renderHead();
            this.renderPlaceholder(null);
            this.renderLogDetail(true);
            this.toggleUpload(false);
            this.toggleReportControls(false);
            return;
        }
        if (isLog && hasChildren) {
            this.mode = 'placeholder';
            this.setTableModeClasses();
            this.state.data.files = [];
            this.state.data.logs = [];
            this.selectedLog = null;
            this.renderPlaceholder(node);
            this.renderLogDetail(true);
            this.toggleUpload(false);
            this.toggleReportControls(false);
        } else if (isLog) {
            this.mode = 'logs';
            this.setTableModeClasses();
            this.state.data.files = [];
            this.selectedLog = null;
            this.renderHead();
            await this.fetchLogs(nodeId);
            this.toggleUpload(false);
            this.toggleReportControls(false);
        } else if (isUserAudit) {
            this.mode = 'logs';
            this.setTableModeClasses();
            this.state.data.files = [];
            this.selectedLog = null;
            this.renderHead();
            await this.fetchLogs(null, ['UZIVATEL', 'ZAKAZNIK', 'ZAMESTNANEC', 'DODAVATEL']);
            this.toggleUpload(false);
            this.toggleReportControls(false);
        // Supermarket-like top-level folders should only block listing when they act as parents.
        } else if (isRoot || (isSupermarket && hasChildren)) {
            this.mode = 'placeholder';
            this.setTableModeClasses();
            this.state.data.files = [];
            this.state.data.logs = [];
            this.selectedLog = null;
            this.renderPlaceholder(node);
            this.renderLogDetail(true);
            this.toggleUpload(false);
            this.toggleReportControls(false);
        } else {
            this.mode = 'files';
            this.setTableModeClasses();
            this.state.data.logs = [];
            this.selectedLog = null;
            this.renderHead();
            this.renderFiles(); // show placeholder before fetch
            await this.fetchFiles(nodeId);
            this.toggleUpload(this.isUploadAllowed(node));
        }
        this.toggleReportControls(this.canGenerateReports() && this.isReportNode(node));
    }

    pickDefaultNodeId() {
        const nodes = this.state.data.archiveTree || [];
        if (!nodes.length) return null;
        const report = this.findReportNode();
        if (report) return String(report.id);
        const root = nodes.find(n => n.parentId === null);
        return root ? String(root.id) : String(nodes[0].id);
    }

    toggleUpload(enabled) {
        if (!this.uploadBtn || !this.uploadInput) return;
        this.uploadBtn.style.display = enabled ? 'inline-flex' : 'none';
        this.uploadInput.disabled = !enabled;
        if (this.uploadHint) {
            this.uploadHint.textContent = '';
        }
    }

    setTableModeClasses() {
        if (!this.table) return;
        this.table.classList.toggle('logs-table', this.mode === 'logs');
        this.table.classList.toggle('files-table', this.mode === 'files');
    }

    findNode(id) {
        if (!id) return null;
        return (this.state.data.archiveTree || []).find(n => String(n.id) === String(id)) || null;
    }

    isLogNode(node) {
        if (!node) return false;
        if (String(node.id) === String(this.reportNodeId)) return false;
        if (this.isLogLabel(node.name) || this.isLogPath(node.path)) return true;
        const parent = this.findNode(node.parentId);
        return parent ? this.isLogNode(parent) : false;
    }

    isReportNode(node) {
        if (!node) return false;
        if (String(node.id) === String(this.reportNodeId)) return true;
        const name = String(node.name || '').toLowerCase();
        if (name.includes('reporty uctu') || name === 'reports' || name.includes('reporty')) return true;
        const path = String(node.path || '').toLowerCase();
        return path.includes('reporty uctu') || path.includes('/reports');
    }

    findReportNode() {
        const nodes = this.state.data.archiveTree || [];
        return nodes.find(n => this.isReportNode(n)) || null;
    }

    isUploadAllowed(node) {
        if (!node) return false;
        if (this.isLogNode(node)) return false;
        if (this.isUserAuditNode(node)) return false;
        return true;
    }

    async fetchLogs(archiveId, tableFilter = null) {
        const id = archiveId || null;
        try {
            const params = [];
            if (id) params.push(`archiveId=${encodeURIComponent(id)}`);
            params.push('size=100');
            if (tableFilter && !Array.isArray(tableFilter)) {
                params.push(`table=${encodeURIComponent(tableFilter)}`);
            }
            const url = `${this.apiBaseUrl}/api/archive/logs?${params.join('&')}`;
            const res = await fetch(url, { headers: this.authHeaders() });
            if (!res.ok) return;
            const logs = await res.json();
            let mapped = (logs || []).map(log => ({
                id: log.id || log.idLog,
                table: log.table,
                operation: log.op,
                timestamp: log.timestamp,
                archive: log.archive,
                descr: log.descr,
                recordId: log.recordId,
                newData: log.newData || log.novaData || '',
                oldData: log.oldData || log.staraData || '',
                recordName: this.resolveRecordNameClient(log)
            }));
            if (Array.isArray(tableFilter) && tableFilter.length) {
                const set = new Set(tableFilter.map(t => String(t).toUpperCase()));
                mapped = mapped.filter(l => set.has(String(l.table).toUpperCase()));
            }
            this.state.data.logs = mapped;
            this.selectedLog = this.state.data.logs[0] || null;
            this.renderLogs();
        } catch (err) {
            console.error('Archive logs load failed', err);
        }
    }

    resolveRecordNameClient(log) {
        const direct = log.recordName;
        if (direct) return direct;
        const fromNew = this.extractName(log.newData || log.novaData);
        const fromOld = this.extractName(log.oldData || log.staraData);
        if (fromNew) return fromNew;
        if (fromOld) return fromOld;
        const userName = this.extractUserName(log.newData || log.novaData) || this.extractUserName(log.oldData || log.staraData);
        if (userName) return userName;
        const genericName = this.extractFieldValue(log.newData || log.novaData, ['uzivatel', 'zakaznik', 'zamestnanec', 'dodavatel'])
            || this.extractFieldValue(log.oldData || log.staraData, ['uzivatel', 'zakaznik', 'zamestnanec', 'dodavatel']);
        if (genericName) return genericName;
        return log.recordId || '';
    }

    extractUserName(dataStr) {
        if (!dataStr) return '';
        const first = String(dataStr).match(/jmeno=([^;,]+)/i);
        const last = String(dataStr).match(/prijmeni=([^;,]+)/i);
        if (first || last) {
            const f = first ? first[1].trim() : '';
            const l = last ? last[1].trim() : '';
            return `${f} ${l}`.trim();
        }
        return '';
    }

    extractFieldValue(dataStr, keys = []) {
        if (!dataStr || !keys?.length) return '';
        const str = String(dataStr);
        for (const key of keys) {
            const regex = new RegExp(`\\b${key}\\s*=\\s*([^;]+)`, 'i');
            const match = str.match(regex);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return '';
    }

    async fetchFiles(archiveId) {
        const id = archiveId || null;
        if (!id) {
            this.state.data.files = [];
            this.renderFiles();
            return;
        }
        try {
            const res = await fetch(`${this.apiBaseUrl}/api/archive/files?archiveId=${id}&size=200`, { headers: this.authHeaders() });
            if (!res.ok) {
                this.state.data.files = [];
                this.renderFiles();
                return;
            }
            const files = await res.json();
            this.state.data.files = (files || []).map(f => ({
                id: f.id,
                name: f.name,
                ext: f.ext,
                type: f.type,
                description: f.description,
                archive: f.archive,
                owner: f.owner,
                uploaded: f.uploaded,
                updated: f.updated,
                size: f.size
            }));
            this.renderFiles();
        } catch (err) {
            console.error('Archive files load failed', err);
            this.state.data.files = [];
            this.renderFiles();
        }
    }

    async handleUpload() {
        if (!this.uploadInput || !this.uploadBtn) return;
        const file = this.uploadInput.files?.[0];
        if (!file) {
            alert('Vyberte soubor.');
            return;
        }
        const node = this.findNode(this.selectedNodeId);
        if (this.isLogNode(node)) {
            alert('Nahrávání do LOG není povoleno.');
            return;
        }
        if (!node) {
            alert('Vyberte složku pro nahrání souboru.');
            return;
        }
        const form = new FormData();
        form.append('file', file);
        form.append('archiveId', this.selectedNodeId || '');
        try {
            this.uploadBtn.disabled = true;
            const res = await fetch(`${this.apiBaseUrl}/api/archive/files/upload`, {
                method: 'POST',
                headers: { 'Authorization': this.authHeaders()['Authorization'] },
                body: form
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Nahrávání selhalo');
            }
            this.uploadInput.value = '';
            await this.fetchFiles(this.selectedNodeId);
        } catch (err) {
            console.error('Upload failed', err);
            alert(err.message || 'Nahrávání selhalo');
        } finally {
            this.uploadBtn.disabled = false;
        }
    }

    renderTree() {
        if (!this.folderTree) return;
        const nodes = this.state.data.archiveTree || [];
        const nodesById = nodes.reduce((acc, n) => {
            acc[String(n.id)] = n;
            return acc;
        }, {});
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
                        <button class="tree-node ${this.nodeClass(child, byParent, nodesById)}" data-folder="${child.name}" data-id="${child.id}">
                            <span class="material-symbols-rounded">folder</span>
                            <div>
                                <strong>${child.name}</strong>
                            </div>
                        </button>
                        ${renderBranch(String(child.id))}
                    </li>
                `).join('')}
            </ul>`;
        };
        this.folderTree.innerHTML = nodes.length ? renderBranch('root') : '<p>Žádné složky.</p>';
    }

    renderHead() {
        if (!this.tableHead) return;
        if (this.mode === 'logs') {
            this.tableHead.innerHTML = `
                <tr>
                    <th>tabulka</th>
                    <th>operace</th>
                    <th>záznam</th>
                    <th>čas</th>
                    <th>popis</th>
                </tr>`;
        } else {
            this.tableHead.innerHTML = `
                <tr>
                    <th>soubor</th>
                    <th>typ</th>
                    <th>vlastník</th>
                    <th>nahráno</th>
                    <th>upraveno</th>
                    <th>velikost (B)</th>
                </tr>`;
        }
    }

    renderLogs() {
        if (this.tableHead) {
            this.tableHead.innerHTML = `
                <tr>
                    <th>tabulka</th>
                    <th>operace</th>
                    <th>záznam</th>
                    <th>čas</th>
                    <th>popis</th>
                </tr>`;
        }
        if (!this.logTable) return;
        const logs = this.state.data.logs || [];
        if (logs.length) {
            const existing = this.selectedLogId ? logs.find(l => this.makeLogId(l) === this.selectedLogId) : null;
            this.selectedLog = existing || logs[0];
            this.selectedLogId = this.selectedLog ? this.makeLogId(this.selectedLog) : null;
        } else {
            this.selectedLog = null;
            this.selectedLogId = null;
        }
        this.logTable.innerHTML = logs.length
            ? logs.map(log => `
                <tr class="${this.makeLogId(log) === this.selectedLogId ? 'active' : ''}" data-log-id="${this.makeLogId(log)}">
                    <td>${log.table}</td>
                    <td>${log.operation}</td>
                    <td>${log.recordName || ''}</td>
                    <td>${log.timestamp}</td>
                    <td>${log.descr || ''}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="5" class="table-placeholder">Vyberte log pro zobrazení.</td></tr>';

        this.logTable.querySelectorAll('tr[data-log-id]')?.forEach(row => {
            row.addEventListener('click', () => {
                const idx = Array.from(this.logTable.querySelectorAll('tr[data-log-id]')).indexOf(row);
                if (idx >= 0 && logs[idx]) {
                    this.selectedLog = logs[idx];
                    this.selectedLogId = this.makeLogId(logs[idx]);
                    this.renderLogs();
                }
            });
        });

        this.renderLogDetail();
    }

    renderFiles() {
        if (this.tableHead) {
            this.tableHead.innerHTML = `
                <tr>
                    <th>soubor</th>
                    <th>přípona</th>
                    <th>typ</th>
                    <th>popis</th>
                    <th>vlastník</th>
                    <th>nahráno</th>
                    <th>upraveno</th>
                    <th>velikost (B)</th>
                    <th>akce</th>
                </tr>`;
        }
        if (!this.logTable) return;
        const files = this.state.data.files || [];
        const folderName = this.state.selectedFolder || '';
        this.logTable.innerHTML = files.length
            ? files.map(file => `
                <tr>
                    <td>${file.name}</td>
                    <td>${file.ext || ''}</td>
                    <td>${file.type}</td>
                    <td>${file.description || ''}</td>
                    <td>${file.owner || ''}</td>
                    <td>${file.uploaded || ''}</td>
                    <td>${file.updated || ''}</td>
                    <td>${file.size != null ? file.size : ''}</td>
                    <td>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button class="ghost-btn" data-preview="${file.id}">Otevřít</button>
                            <button class="ghost-btn ghost-strong" data-download="${file.id}">Stáhnout</button>
                            <button class="ghost-btn ghost-danger" data-delete="${file.id}">Smazat</button>
                        </div>
                    </td>
                </tr>
            `).join('')
            : `<tr><td colspan="9" class="table-placeholder">Nahrajte soubor do složky "${folderName || 'vybraná složka'}".</td></tr>`;

        this.logTable.querySelectorAll('button[data-preview]')?.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.preview;
                const file = files.find(f => String(f.id) === String(id));
                if (file) {
                    this.previewFile(file);
                }
            });
        });

        this.logTable.querySelectorAll('button[data-download]')?.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.download;
                const file = files.find(f => String(f.id) === String(id));
                if (file) {
                    this.downloadFile(file);
                }
            });
        });

        this.logTable.querySelectorAll('button[data-delete]')?.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.delete;
                const file = files.find(f => String(f.id) === String(id));
                if (file) {
                    this.deleteFile(file);
                }
            });
        });

        this.renderLogDetail(true);
    }

    renderLogsOrFiles() {
        if (this.mode === 'logs') {
            this.renderLogs();
        } else if (this.mode === 'files') {
            this.renderFiles();
        } else {
            this.renderPlaceholder(this.findNode(this.selectedNodeId));
        }

        this.setTableModeClasses();
        this.renderLogDetail(this.mode !== 'logs');
    }

    toggleReportControls(show) {
        if (!this.reportControls) return;
        this.reportControls.style.display = show ? 'flex' : 'none';
    }

    async handleGenerateReports() {
        if (!this.canGenerateReports()) return;
        const token = localStorage.getItem('token') || '';
        const headers = {
            'Authorization': `Bearer ${token}`
        };
        let year = null;
        let month = null;
        const val = this.reportMonthSelect?.value || '';
        if (val) {
            const parts = val.split('-');
            if (parts.length === 2) {
                year = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10);
            }
        }
        const params = [];
        if (year) params.push(`year=${year}`);
        if (month) params.push(`month=${month}`);
        const url = `${this.apiBaseUrl}/api/wallet/reports${params.length ? '?' + params.join('&') : ''}`;
        try {
            if (this.uploadHint) {
                this.uploadHint.textContent = 'Generuji reporty...';
            }
            const res = await fetch(url, { method: 'POST', headers });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || 'Nelze vygenerovat reporty.');
            }
            if (this.uploadHint) {
                this.uploadHint.textContent = 'Reporty vytvořeny v archivu.';
            }
            // po vygenerování zkus načíst reportovou složku
            const reportNode = this.findReportNode() || this.findNode(this.selectedNodeId) || this.findNode(this.pickDefaultNodeId());
            if (reportNode) {
                this.selectedNodeId = String(reportNode.id);
                await this.fetchTree(this.selectedNodeId);
                await this.fetchFiles(this.selectedNodeId);
            } else {
                await this.fetchTree();
            }
        } catch (err) {
            console.error('Generate reports failed', err);
            if (this.uploadHint) {
                this.uploadHint.textContent = err.message || 'Chyba generování reportů.';
            }
        }
    }

    render() {
        this.renderTree();
        this.renderLogsOrFiles();
    }

    extractName(dataStr) {
        if (!dataStr) return '';
        const match = String(dataStr).match(/nazev=([^;]+)/i);
        return match ? match[1].trim() : '';
    }

    async downloadFile(file) {
        try {
            const res = await fetch(`${this.apiBaseUrl}/api/archive/files/${file.id}/data`, {
                headers: this.authHeaders()
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Stažení selhalo');
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const ext = file.ext ? `.${file.ext}` : '';
            a.download = `${file.name || 'soubor'}${ext}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed', err);
            alert(err.message || 'Stažení selhalo');
        }
    }

    async previewFile(file) {
        if (!this.previewModal || !this.previewFrame) {
            alert('Náhled není dostupný, stáhněte soubor.');
            return;
        }
        this.currentPreviewFile = file;
        this.showPreviewShell(file);
        const initialMode = this.getPreviewMode(file);
        if (initialMode === 'block') {
            this.showPreviewError(`Náhled není podporován pro ${file.ext || 'tento typ souboru'}. Použijte Stáhnout.`);
            return;
        }
        if (initialMode === 'office') {
            await this.fetchOfficePreview(file);
            return;
        }
        try {
            const res = await fetch(`${this.apiBaseUrl}/api/archive/files/${file.id}/data`, {
                headers: this.authHeaders()
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Náhled selhal');
            }
            const contentType = (res.headers.get('content-type') || '').toLowerCase();
            const effectiveMode = this.getPreviewMode(file, contentType);
            if (effectiveMode === 'block') {
                this.showPreviewError(`Náhled není podporován pro ${file.ext || 'tento typ souboru'}. Použijte Stáhnout.`);
                return;
            }
            if (effectiveMode === 'office') {
                await this.fetchOfficePreview(file);
                return;
            }
            if (effectiveMode === 'text') {
                const text = await res.text();
                this.showTextPreview(text);
            } else if (effectiveMode === 'image') {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                this.currentPreviewUrl = url;
                this.showImagePreview(url);
            } else {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                this.currentPreviewUrl = url;
                this.showIframePreview(url);
            }
        } catch (err) {
            console.error('Preview failed', err);
            this.showPreviewError(err.message || 'Náhled selhal');
            alert(err.message || 'Náhled selhal');
        }
    }

    showPreviewShell(file) {
        this.closePreview(true);
        if (this.previewTitle) {
            this.previewTitle.textContent = file.name || 'Soubor';
        }
        this.clearPreviewState();
        this.previewModal?.classList.add('active');
        this.previewModal?.setAttribute('aria-hidden', 'false');
    }

    async closePreview(keepHidden) {
        if (!keepHidden && this.currentPreviewMode === 'editable' && this.editorDirty) {
            const shouldSave = await this.confirmDialog('Uložit změny před zavřením?');
            if (shouldSave) {
                const saved = await this.saveEdits(true);
                if (!saved) {
                    return;
                }
            }
        }
        if (this.previewFrame) {
            this.previewFrame.src = 'about:blank';
        }
        if (this.currentPreviewUrl) {
            window.URL.revokeObjectURL(this.currentPreviewUrl);
            this.currentPreviewUrl = null;
        }
        if (!keepHidden) {
            this.previewModal?.classList.remove('active');
            this.previewModal?.setAttribute('aria-hidden', 'true');
            this.currentPreviewFile = null;
        }
    }

    clearPreviewState() {
        this.currentPreviewMode = null;
        this.editorVisible = false;
        this.editorDirty = false;
        this.editorOriginal = '';
        if (this.previewError) {
            this.previewError.textContent = '';
            this.previewError.style.display = 'none';
        }
        if (this.previewStatus) {
            this.previewStatus.textContent = '';
        }
        if (this.previewFrame) {
            this.previewFrame.src = 'about:blank';
            this.previewFrame.style.display = 'block';
        }
        if (this.previewImage) {
            this.previewImage.src = '';
            this.previewImage.style.display = 'none';
        }
        if (this.previewText) {
            this.previewText.textContent = '';
            this.previewText.style.display = 'none';
        }
        if (this.previewEditor) {
            this.previewEditor.value = '';
            this.previewEditor.style.display = 'none';
        }
        if (this.previewEditBtn) {
            this.previewEditBtn.style.display = 'none';
            this.previewEditBtn.textContent = 'Upravit';
        }
        if (this.previewSaveBtn) {
            this.previewSaveBtn.style.display = 'none';
            this.previewSaveBtn.disabled = false;
        }
    }


    showTextPreview(text, editable = true) {
        if (this.previewFrame) {
            this.previewFrame.src = 'about:blank';
            this.previewFrame.style.display = 'none';
        }
        if (this.previewImage) {
            this.previewImage.src = '';
            this.previewImage.style.display = 'none';
        }
        if (this.previewText) {
            this.previewText.textContent = text;
            this.previewText.style.display = 'block';
        }
        if (editable) {
            this.enableEditing(text);
        } else {
            this.disableEditing();
        }
    }

    showPreviewError(message) {
        if (this.previewError) {
            this.previewError.textContent = message || 'Náhled selhal';
            this.previewError.style.display = 'block';
        }
    }

    showImagePreview(url) {
        if (this.previewFrame) {
            this.previewFrame.src = 'about:blank';
            this.previewFrame.style.display = 'none';
        }
        if (this.previewText) {
            this.previewText.textContent = '';
            this.previewText.style.display = 'none';
        }
        if (this.previewImage) {
            this.previewImage.src = url;
            this.previewImage.style.display = 'block';
        }
        this.disableEditing();
    }

    async fetchOfficePreview(file) {
        try {
            const res = await fetch(`${this.apiBaseUrl}/api/archive/files/${file.id}/preview`, {
                headers: this.authHeaders()
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Náhled není podporován.');
            }
            const text = await res.text();
            this.showTextPreview(text || 'Soubor je prázdný.', this.isOfficeEditable(file));
        } catch (err) {
            console.error('Office preview failed', err);
            this.showPreviewError(err.message || 'Náhled selhal.');
        }
    }

    showIframePreview(url) {
        if (this.previewImage) {
            this.previewImage.src = '';
            this.previewImage.style.display = 'none';
        }
        if (this.previewText) {
            this.previewText.textContent = '';
            this.previewText.style.display = 'none';
        }
        if (this.previewFrame) {
            this.previewFrame.style.display = 'block';
            this.previewFrame.src = url;
        }
        this.disableEditing();
    }

    enableEditing(text) {
        this.currentPreviewMode = 'editable';
        this.editorVisible = true;
        this.editorDirty = false;
        this.editorOriginal = text || '';
        if (this.previewEditBtn) {
            this.previewEditBtn.style.display = 'none';
        }
        if (this.previewSaveBtn) {
            this.previewSaveBtn.style.display = 'inline-flex';
            this.previewSaveBtn.disabled = false;
        }
        if (this.previewEditor) {
            this.previewEditor.value = text || '';
            this.previewEditor.style.display = 'block';
        }
        if (this.previewText) {
            this.previewText.style.display = 'none';
        }
    }

    disableEditing() {
        this.currentPreviewMode = null;
        this.editorVisible = false;
        if (this.previewSaveBtn) {
            this.previewSaveBtn.style.display = 'none';
        }
        if (this.previewEditor) {
            this.previewEditor.style.display = 'none';
        }
    }

    async saveEdits(returnBool = false) {
        if (!this.currentPreviewFile || this.currentPreviewMode !== 'editable') return;
        if (!this.previewEditor) return;
        const text = this.previewEditor.value || '';
        if (this.previewSaveBtn) this.previewSaveBtn.disabled = true;
        this.setStatus('Ukládám…');
        try {
            const res = await fetch(`${this.apiBaseUrl}/api/archive/files/${this.currentPreviewFile.id}/edit`, {
                method: 'PUT',
                headers: {
                    'Authorization': this.authHeaders()['Authorization'],
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: text
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Uložení selhalo');
            }
            this.showTextPreview(text);
            this.editorDirty = false;
            this.editorOriginal = text;
            this.setStatus('Uloženo.', true);
            if (this.selectedNodeId) {
                this.fetchFiles(this.selectedNodeId);
            }
        } catch (err) {
            console.error('Save edits failed', err);
            this.showPreviewError(err.message || 'Uložení selhalo');
            this.setStatus('');
        } finally {
            if (this.previewSaveBtn) this.previewSaveBtn.disabled = false;
            if (returnBool) return false;
        }
        if (returnBool) return true;
    }

    setStatus(msg, success = false) {
        if (!this.previewStatus) return;
        this.previewStatus.textContent = msg || '';
        this.previewStatus.style.color = success ? 'var(--success)' : 'var(--muted)';
    }

    markDirty() {
        if (this.currentPreviewMode === 'editable') {
            this.editorDirty = this.previewEditor?.value !== this.editorOriginal;
            if (this.editorDirty) {
                this.setStatus('Neuložené změny');
            } else {
                this.setStatus('');
            }
        }
    }

    renderLogDetail(hide = false) {
        if (!this.logDetailCard) return;
        if (hide || this.mode !== 'logs') {
            this.logDetailCard.style.display = 'none';
            this.logDetailCard.innerHTML = '';
            return;
        }
        this.logDetailCard.style.display = 'block';
        if (!this.selectedLog) {
            this.logDetailCard.innerHTML = '<div class="log-detail-value">Vyberte log pro detail.</div>';
            return;
        }
        const log = this.selectedLog;
        const safe = (v) => v ? v : '-';
        const newData = log.newData || '';
        const oldData = log.oldData || '';
        const descr = log.descr || '';
        this.logDetailCard.innerHTML = `
            <h4>Detail záznamu</h4>
            <div class="log-detail-grid">
                <div class="log-detail-row"><span class="log-detail-label">tabulka:</span><span class="log-detail-value">${safe(log.table)}</span></div>
                <div class="log-detail-row"><span class="log-detail-label">operace:</span><span class="log-detail-value">${safe(log.operation)}</span></div>
                <div class="log-detail-row"><span class="log-detail-label">záznam:</span><span class="log-detail-value">${safe(log.recordName)}</span></div>
                <div class="log-detail-row"><span class="log-detail-label">popis:</span><span class="log-detail-value">${safe(descr)}</span></div>
                <div class="log-detail-row"><span class="log-detail-label">archiv:</span><span class="log-detail-value">${safe(log.archive)}</span></div>
                <div class="log-detail-row"><span class="log-detail-label">čas:</span><span class="log-detail-value">${safe(log.timestamp)}</span></div>
                <div class="log-detail-row"><span class="log-detail-label">nová data:</span><span class="log-detail-value">${safe(newData)}</span></div>
                <div class="log-detail-row"><span class="log-detail-label">stará data:</span><span class="log-detail-value">${safe(oldData)}</span></div>
            </div>
            <div class="log-detail-actions">
                <button class="ghost-btn ghost-muted" id="log-edit-btn">Upravit popis</button>
                <button class="ghost-btn ghost-danger" id="log-delete-btn">Smazat log</button>
            </div>
        `;
        this.registerLogDetailActions(log);
    }

    async deleteFile(file) {
        const confirmed = await this.confirmDialog(`Opravdu smazat soubor "${file.name}"?`);
        if (!confirmed) return;
        try {
            const res = await fetch(`${this.apiBaseUrl}/api/archive/files/${file.id}`, {
                method: 'DELETE',
                headers: this.authHeaders()
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Smazání selhalo');
            }
            await this.fetchFiles(this.selectedNodeId);
        } catch (err) {
            console.error('Delete failed', err);
            alert(err.message || 'Smazání selhalo');
        }
    }

    getPreviewMode(file, contentType) {
        const name = (file?.name || '').toString().trim().toLowerCase();
        const extMeta = (file?.ext || '').toString().trim().toLowerCase().replace(/^\./, '');
        const extFromName = name.includes('.') ? name.split('.').pop() : '';
        const extNoDot = extMeta || extFromName;
        const extWithDot = extNoDot ? `.${extNoDot}` : '';
        const ct = (contentType || '').toLowerCase();
        const isDoc = extNoDot === 'doc' || extNoDot === 'docx' || ct.includes('msword') || ct.includes('wordprocessingml');
        const isSpreadsheet = extNoDot === 'xls' || extNoDot === 'xlsx' || ct.includes('spreadsheetml') || ct.includes('ms-excel');
        if (isDoc || isSpreadsheet) return 'office';
        if (this.isImagePreview(ct, extNoDot)) return 'image';
        if (this.isTextPreview(ct, extWithDot)) return 'text';
        if (this.isIframePreview(ct, extWithDot)) return 'iframe';
        return 'iframe';
    }

    isOfficeEditable(file) {
        const name = (file?.name || '').toString().trim().toLowerCase();
        const extMeta = (file?.ext || '').toString().trim().toLowerCase().replace(/^\./, '');
        const extFromName = name.includes('.') ? name.split('.').pop() : '';
        const extNoDot = extMeta || extFromName;
        return extNoDot === 'docx';
    }

    registerLogDetailActions(log) {
        const editBtn = document.getElementById('log-edit-btn');
        const delBtn = document.getElementById('log-delete-btn');
        if (editBtn) {
            editBtn.onclick = () => this.updateLogDescription(log);
        }
        if (delBtn) {
            delBtn.onclick = () => this.deleteLog(log);
        }
    }

    makeLogId(log) {
        if (log && log.id != null) {
            return String(log.id);
        }
        return `${log.timestamp || ''}-${log.recordId || ''}-${log.operation || ''}`;
    }

    async deleteLog(log) {
        const confirmed = await this.confirmDialog('Opravdu smazat tento log?');
        if (!confirmed) return;
        try {
            const res = await fetch(`${this.apiBaseUrl}/api/archive/logs/${log.id || log.idLog || ''}`, {
                method: 'DELETE',
                headers: this.authHeaders()
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Smazání selhalo');
            }
            await this.fetchLogs(this.selectedNodeId);
        } catch (err) {
            console.error('Delete log failed', err);
            alert(err.message || 'Smazání selhalo');
        }
    }

    async updateLogDescription(log) {
        const current = log.descr || '';
        const updated = await this.promptDialog('Upravte popis logu:', current);
        if (updated === null) return;
        try {
            const res = await fetch(`${this.apiBaseUrl}/api/archive/logs/${log.id || log.idLog || ''}/description`, {
                method: 'PUT',
                headers: {
                    ...this.authHeaders(),
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: updated
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Uložení popisu selhalo');
            }
            await this.fetchLogs(this.selectedNodeId);
        } catch (err) {
            console.error('Update log description failed', err);
            alert(err.message || 'Uložení popisu selhalo');
        }
    }

    async confirmDialog(message) {
        const res = await this.openDialog({ title: 'Potvrzení', message, showInput: false });
        return res === true;
    }

    async promptDialog(title, defaultValue = '') {
        const res = await this.openDialog({ title, message: '', showInput: true, defaultValue });
        return typeof res === 'string' ? res : null;
    }

    openDialog({ title, message, showInput = false, defaultValue = '' }) {
        if (!this.dialogModal || !this.dialogConfirm || !this.dialogCancel || !this.dialogTitle || !this.dialogMessage) {
            return Promise.resolve(null);
        }
        if (this.dialogInput) {
            this.dialogInput.style.display = showInput ? 'block' : 'none';
            this.dialogInput.value = defaultValue || '';
        }
        this.dialogTitle.textContent = title || '';
        this.dialogMessage.textContent = message || '';
        this.dialogModal.classList.add('active');
        this.dialogModal.setAttribute('aria-hidden', 'false');
        return new Promise(resolve => {
            this.dialogResolver = resolve;
            this.dialogConfirm.onclick = () => {
                const value = showInput && this.dialogInput ? this.dialogInput.value : true;
                this.resolveDialog(value);
            };
        });
    }

    resolveDialog(value) {
        if (this.dialogResolver) {
            this.dialogResolver(value);
            this.dialogResolver = null;
        }
        if (this.dialogModal) {
            this.dialogModal.classList.remove('active');
            this.dialogModal.setAttribute('aria-hidden', 'true');
        }
    }

    isTextPreview(contentType, ext = '') {
        const lowerExt = ext.toLowerCase();
        if (!contentType && !lowerExt) return false;
        const ctOk = contentType && (contentType.startsWith('text/')
            || contentType.includes('json')
            || contentType.includes('xml')
            || contentType.includes('csv')
            || contentType.includes('yaml')
            || contentType.includes('javascript'));
        const extOk = lowerExt.endsWith('.json') || lowerExt === 'json'
            || lowerExt.endsWith('.xml') || lowerExt === 'xml'
            || lowerExt.endsWith('.csv') || lowerExt === 'csv'
            || lowerExt.endsWith('.yaml') || lowerExt === 'yaml'
            || lowerExt.endsWith('.yml') || lowerExt === 'yml'
            || lowerExt.endsWith('.txt') || lowerExt === 'txt'
            || lowerExt.endsWith('.log') || lowerExt === 'log';
        return ctOk || extOk;
    }

    isImagePreview(contentType, extNoDot = '') {
        const ctOk = contentType && contentType.startsWith('image/');
        const extOk = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extNoDot);
        return ctOk || extOk;
    }

    isIframePreview(contentType, ext = '') {
        const lowerExt = ext.toLowerCase();
        if (!contentType && !lowerExt) return false;
        const ctOk = contentType && (contentType.includes('pdf')
            || contentType.includes('html'));
        const extOk = lowerExt.endsWith('.pdf') || lowerExt === 'pdf'
            || lowerExt.endsWith('.htm') || lowerExt === 'htm'
            || lowerExt.endsWith('.html') || lowerExt === 'html';
        return ctOk || extOk;
    }

    nodeClass(child, byParent, nodesById) {
        const name = (child.name || '').toLowerCase();
        if (this.isLogLabel(name)) return 'log-node';                  // LOG: žlutá
        const parent = child.parentId ? nodesById[String(child.parentId)] : null;
        const parentName = (parent?.name || '').toLowerCase();
        if (this.isLogLabel(parentName)) return 'log-leaf-node';       // děti LOGu: světle žluté
        if (child.parentId === null) return 'root-node';               // hlavní archiv: modrý
        if (parent && parent.parentId === null) return 'supermarket-node'; // supermarkety: zelené
        return 'folder-node';                                          // ostatní: modré
    }

    isSupermarketNode(node) {
        if (!node) return false;
        const parent = this.findNode(node.parentId);
        return parent && parent.parentId === null;
    }

    isUserAuditNode(node) {
        if (!node) return false;
        const name = (node.name || '').toLowerCase();
        return name === 'uzivatele' || name === 'uživatele';
    }

    renderPlaceholder(node) {
        if (this.tableHead) {
            this.tableHead.innerHTML = '';
        }
        if (this.logTable) {
            const name = node?.name || 'vybraný uzel';
            this.logTable.innerHTML = `<tr><td colspan="8" class="table-placeholder">Vyberte složku pro ${name}.</td></tr>`;
        }
        this.renderLogDetail(true);
    }
}

from pathlib import Path
import re
path = Path('src/main/resources/static/js/console-app.js')
text = path.read_text(encoding='utf-8', errors='ignore')
pattern = r"registerUtilityButtons\(\) \{[\s\S]*?\n\s*renderImpersonationChip"
replacement = """
        registerUtilityButtons() {
            const walletBtn = document.getElementById('wallet-btn');
            walletBtn?.addEventListener('click', () => this.openWalletPanel());
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

        renderImpersonationChip"""
new_text, n = re.subn(pattern, replacement, text, flags=re.MULTILINE)
if n == 0:
    raise SystemExit('pattern not replaced')
path.write_text(new_text, encoding='utf-8')
print('replaced', n)

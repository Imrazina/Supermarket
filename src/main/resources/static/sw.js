self.addEventListener('notificationclick', event => {
    event.notification.close();
    const text = event.notification.data?.bodyToCopy || '';

    event.waitUntil(
        (async () => {
            // Pokusíme se najít otevřené okno copy.html
            const allClients = await clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            });

            const copyClient = allClients.find(c => c.url.includes('/copy.html'));

            if (copyClient) {
                // Pošleme text do existujícího okna
                copyClient.postMessage({
                    type: 'copy',
                    text: text
                });
                copyClient.focus();
            } else {
                // Pokud okno neexistuje, otevřeme nové
                await clients.openWindow(`/copy.html?text=${encodeURIComponent(text)}`);
            }
        })()
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const text = event.notification.data?.bodyToCopy || '';
    console.log('[sw] notification click', event);

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

self.addEventListener('push', event => {
    console.log('[sw] push event', event);
    const defaultPayload = {
        title: 'BDAS Supermarket',
        body: 'Máte novou zprávu v konzoli.',
        data: {}
    };

    let payload = defaultPayload;
    if (event.data) {
        try {
            const parsed = event.data.json();
            payload = {
                ...defaultPayload,
                ...parsed,
                data: {
                    ...defaultPayload.data,
                    ...(parsed?.data || {})
                }
            };
        } catch (error) {
            const text = event.data.text();
            payload = {
                ...defaultPayload,
                body: text || defaultPayload.body
            };
        }
    }

    const options = {
        body: payload.body,
        icon: payload.icon || '/images/icons/icon-192x192.png',
        badge: payload.badge || '/images/icons/icon-72x72.png',
        data: payload.data,
        vibrate: [150, 50, 150],
        tag: payload.tag || `bdas-chat-${Date.now()}`,
        renotify: false,
        requireInteraction: true
    };

    event.waitUntil(
        (async () => {
            console.log('[sw] showing notification', payload);
            await self.registration.showNotification(payload.title, options);
        })()
    );
});

self.addEventListener('pushsubscriptionchange', event => {
    console.warn('[sw] push subscription change detected', event);
});

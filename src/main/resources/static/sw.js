self.addEventListener('notificationclick', event => {
    event.notification.close();
    const text = event.notification.data?.bodyToCopy || '';

    event.waitUntil(
        (async () => {
            // Пытаемся найти открытое окно copy.html
            const allClients = await clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            });

            const copyClient = allClients.find(c => c.url.includes('/copy.html'));

            if (copyClient) {
                // Отправляем текст в существующее окно
                copyClient.postMessage({
                    type: 'copy',
                    text: text
                });
                copyClient.focus();
            } else {
                // Если окно не найдено, открываем новое
                await clients.openWindow(`/copy.html?text=${encodeURIComponent(text)}`);
            }
        })()
    );
});
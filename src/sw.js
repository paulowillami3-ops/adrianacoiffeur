import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'Adriana Coiffeur', body: event.data.text() };
        }
    }

    const title = data.title || 'Adriana Coiffeur';
    const options = {
        body: data.body || 'Você tem uma nova mensagem.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: { url: data.url || '/' }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            // Focus existing window
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});

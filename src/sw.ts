/// <reference lib="webworker" />

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;
declare function importScripts(...urls: string[]): void;

// ===== 1. WORKBOX: Precaching & Routing =====
self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

// ===== 2. WORKBOX: Dynamic Asset Caching =====
// Cache Firebase Storage Images aggressively to save bandwidth and speed up UI
registerRoute(
    ({ url }) => url.origin === 'https://firebasestorage.googleapis.com',
    new CacheFirst({
        cacheName: 'firebase-images',
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 150,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
            }),
        ],
    })
);

// Cache Google Fonts
registerRoute(
    ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
    new StaleWhileRevalidate({
        cacheName: 'google-fonts',
        plugins: [
            new ExpirationPlugin({ maxEntries: 20 }),
        ],
    })
);

// Firebase scripts removed to provide 100% Native Web Push Control.
// By NOT initializing firebase.messaging() in the SW, we prevent FCM from intercepting and duplicating pushes.
// This allows iOS APNs to wake the device using standard notification payloads natively.
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '');
console.log('[SW] Unified Native Push initialized. iOS:', isIOS);

// ===== 3. IndexedDB =====
function saveToIndexedDB(data: Record<string, string>) {
    return new Promise<Record<string, unknown>>((resolve, reject) => {
        const req = indexedDB.open('graft-fcm-data', 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('background_messages')) {
                db.createObjectStore('background_messages', { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction(['background_messages'], 'readwrite');
            const payload = { ...data, savedAt: Date.now() };
            const add = tx.objectStore('background_messages').add(payload);
            add.onsuccess = () => resolve(payload);
            add.onerror = () => reject(new Error('DB add failed'));
        };
        req.onerror = () => reject(new Error('DB open failed'));
    });
}

// ===== 4. Broadcast (iOS-safe) =====
function broadcastToApp(type: string, payload: unknown) {
    try {
        if ('BroadcastChannel' in self) {
            const ch = new BroadcastChannel('fcm_data_messages');
            ch.postMessage({ type, payload });
            setTimeout(() => ch.close(), 100);
        }
    } catch {
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
            cls.forEach(c => c.postMessage({ type, payload }));
        });
    }
}

// ===== 5. Background / Push messages explicitly handled for iOS/PWA reliability =====
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let payload: any = {};
    try {
        payload = event.data.json();
    } catch (e) {
        return;
    }

    console.log('[SW] Push Event intercepted:', payload);

    const d = payload.data || {};
    const n = payload.notification || {};

    const name = d.patientName || n.title || 'Graft';
    const text = d.text || n.body || 'Yangi xabar qabul qilindi';
    const pid = d.patientId || null;
    const url = pid ? `/?patient=${pid}&view=chat` : '/';

    const opts: any = {
        body: text, // Don't prepend name because we use name as the title
        icon: '/apple-touch-icon.png',
        badge: '/favicon-96x96.png',
        tag: `graft-${pid || Date.now()}`,
        renotify: true,
        data: { url },
    };

    if (!isIOS) {
        opts.vibrate = [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40, 500];
        opts.requireInteraction = true;
    }

    // We only pass the notification promise to waitUntil.
    // This absolutely guarantees iOS will display the notification before we even touch IndexedDB.
    const notificationPromise = self.registration.showNotification(name, opts).then(() => {
        // AFTER the OS has confirmed the notification, we SAFELY try to update the local DB
        try {
            // Some iOS versions throw synchronously immediately on locked devices
            const dbPromise = saveToIndexedDB(d)
                .then(saved => broadcastToApp('BACKGROUND_DATA_SYNC', saved))
                .catch(err => console.warn('[SW] Async IDB save failed:', err));

            // Timeout hack for IndexedDB hanging
            return Promise.race([
                dbPromise,
                new Promise(resolve => setTimeout(resolve, 2000))
            ]);
        } catch (syncErr) {
            console.warn('[SW] Sync IDB blocked by OS:', syncErr);
            return Promise.resolve();
        }
    }).catch(err => {
        console.error('[SW] Notification display failed:', err);
    });

    event.waitUntil(notificationPromise);
});

// ===== 6. Click handler =====
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = new URL(event.notification.data?.url || '/', self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
            for (const c of cls) {
                if (c.url.includes(self.location.origin) && 'focus' in c) {
                    (c as WindowClient).focus();
                    broadcastToApp('NAVIGATE', { url: target });
                    return c;
                }
            }
            return self.clients.openWindow(target);
        })
    );
});

// ===== 7. Push safety net removed (Redundant since we explicitly catch push above) =====

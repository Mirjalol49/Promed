/// <reference lib="webworker" />

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;
declare const firebase: any;
declare function importScripts(...urls: string[]): void;

// ===== 1. WORKBOX: Precaching & Routing =====
self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

// ===== 2. FIREBASE MESSAGING =====
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyD_FGKU1Lzdp-DJRr7tgXehH2JmuAZKMYc",
    authDomain: "graft-dashboard.firebaseapp.com",
    projectId: "graft-dashboard",
    storageBucket: "graft-dashboard.firebasestorage.app",
    messagingSenderId: "120238255414",
    appId: "1:120238255414:web:f0aa109b5f80644e845797",
    measurementId: "G-VSREQ7WEVP",
    databaseURL: "https://graft-dashboard-default-rtdb.firebaseio.com"
});

const messaging = firebase.messaging();
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '');
console.log('[SW] Unified. iOS:', isIOS);

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

// ===== 5. Background messages =====
messaging.onBackgroundMessage((payload: any) => {
    console.log('[SW] BG msg:', payload);
    const d = payload.data || {};
    const name = d.patientName || 'Medical Alert';
    const text = d.text || 'Yangi xabar qabul qilindi';
    const pid = d.patientId || null;
    const url = pid ? `/?patient=${pid}&view=chat` : '/';

    const opts: any = {
        body: `${name}: ${text}`,
        icon: '/apple-touch-icon.png',
        badge: '/favicon-96x96.png',
        tag: `graft-${pid || 'gen'}`,
        renotify: true,
        data: { url },
    };
    if (!isIOS) {
        opts.vibrate = [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40, 500];
        opts.requireInteraction = true;
    }

    return saveToIndexedDB(d)
        .then(saved => {
            broadcastToApp('BACKGROUND_DATA_SYNC', saved);
            return self.registration.showNotification('Graft', opts);
        })
        .catch(() => self.registration.showNotification('Graft', opts));
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

// ===== 7. Push safety net =====
self.addEventListener('push', (event) => {
    if (!event.data) return;
    try { console.log('[SW] Push:', event.data.json()); } catch { /* noop */ }
});

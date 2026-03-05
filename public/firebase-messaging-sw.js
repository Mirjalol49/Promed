importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// 1. Initialize Firebase
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

// iOS Detection: Safari SW doesn't support vibrate, requireInteraction, etc.
const isIOS = /iPad|iPhone|iPod/.test(self.navigator?.userAgent || '');

console.log('[ServiceWorker] Initialized. iOS:', isIOS);

// CRITICAL FOR iOS: Take control immediately on install
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install event');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate event');
    event.waitUntil(self.clients.claim());
});

// 2. Local DB Helper: Save to IndexedDB immediately for zero-loading state
function saveToIndexedDB(messageData) {
    return new Promise((resolve, reject) => {
        const DB_NAME = 'graft-fcm-data';
        const DB_VERSION = 1;
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('background_messages')) {
                db.createObjectStore('background_messages', { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['background_messages'], 'readwrite');
            const store = transaction.objectStore('background_messages');

            const payload = {
                ...messageData,
                savedAt: Date.now(),
            };

            const addRequest = store.add(payload);

            addRequest.onsuccess = () => resolve(payload);
            addRequest.onerror = (e) => reject(e.target.error);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Helper: Safely broadcast to foreground app
function broadcastToApp(messageType, payload) {
    try {
        if ('BroadcastChannel' in self) {
            const channel = new BroadcastChannel('fcm_data_messages');
            channel.postMessage({ type: messageType, payload });
            // Close after a tick to avoid resource leaks
            setTimeout(() => channel.close(), 100);
        }
    } catch (e) {
        console.warn('[ServiceWorker] BroadcastChannel failed, using clients.matchAll fallback:', e);
        // Fallback: Use postMessage to all clients directly (iOS compatible)
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            clients.forEach((client) => {
                client.postMessage({ type: messageType, payload });
            });
        });
    }
}

// 3. The Interceptor: Handle the silent data payload natively
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let payload = {};
    try {
        payload = event.data.json();
    } catch (e) {
        return;
    }

    console.log('[ServiceWorker] Intercepted Push Event:', payload);

    const d = payload.data || {};
    const n = payload.notification || {};

    const patientName = d.patientName || n.title || 'Medical Alert';
    const messageText = d.text || n.body || 'Yangi xabar qabul qilindi';
    const patientId = d.patientId || null;

    // Determine target URL for click handling
    const customUrl = patientId ? `/?patient=${patientId}&view=chat` : `/`;

    // Build notification options (iOS-safe: no vibrate, no requireInteraction)
    const notificationOptions = {
        body: messageText,
        icon: '/apple-touch-icon.png',
        badge: '/favicon-96x96.png',
        tag: `graft-msg-${patientId || Date.now()}`, // Prevent duplicate notifications
        renotify: true, // Re-alert even with same tag
        data: { url: customUrl },
    };

    // Add features only supported on Android/Desktop (NOT iOS Safari)
    if (!isIOS) {
        notificationOptions.vibrate = [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40, 500];
        notificationOptions.requireInteraction = true;
    }

    // CRITICAL FIX FOR iOS LOCKED STATE:
    // When an iPhone is locked, its Data Protection prevents IDB writes from completing.
    // So we MUST immediately request the OS to show the notification without waiting for IDB!
    const notificationPromise = self.registration.showNotification(patientName, notificationOptions);

    const dataTask = saveToIndexedDB(d)
        .then(savedData => {
            broadcastToApp('BACKGROUND_DATA_SYNC', savedData);
        })
        .catch(err => {
            console.warn('[ServiceWorker] Array write IDB failed (expected on iOS lock):', err);
        });

    // Provide a small timeout for IDB to prevent SW hang
    const safeDataTask = Promise.race([
        dataTask,
        new Promise(resolve => setTimeout(resolve, 3000))
    ]);

    event.waitUntil(Promise.all([notificationPromise, safeDataTask]));
});

// 4. Custom Click Logic (Focus or New Window)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

    const promiseChain = self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then((windowClients) => {
        let openAppClient = null;

        for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url.includes(self.location.origin) && 'focus' in client) {
                openAppClient = client;
                break;
            }
        }

        if (openAppClient) {
            openAppClient.focus();

            // Tell the React app to navigate
            broadcastToApp('NAVIGATE', { url: urlToOpen });

            return openAppClient;
        } else {
            return self.clients.openWindow(urlToOpen);
        }
    });

    event.waitUntil(promiseChain);
});

// 5. Redundant push fallback removed (Handled comprehensively above)


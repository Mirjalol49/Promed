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
                savedAt: Date.now(), // timestamp for ordering the UI
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

// 3. The Interceptor: Handle the silent data payload
messaging.onBackgroundMessage((payload) => {
    console.log('[ServiceWorker] Intercepted silent Data Message:', payload);
    const data = payload.data || {};

    const patientName = data.patientName || 'Medical Alert';
    const messageText = data.text || 'Yangi xabar qabul qilindi';
    const patientId = data.patientId || null;

    // Determine target URL for click handling
    const customUrl = patientId ? `/?patient=${patientId}&view=chat` : `/`;

    // Chain: Save -> Broadcast -> Render Notification
    const promiseChain = saveToIndexedDB(data).then((savedData) => {

        // A. Broadcast to foreground app if open to instantly inject to UI state
        if ('BroadcastChannel' in self) {
            const channel = new BroadcastChannel('fcm_data_messages');
            channel.postMessage({ type: 'BACKGROUND_DATA_SYNC', payload: savedData });
        }

        // B. Manually trigger standard OS notification with medical UI/UX
        return self.registration.showNotification(patientName, {
            body: messageText,
            icon: '/apple-touch-icon.png', // Best for medical/pro feel
            badge: '/favicon-96x96.png', // Small icon for android status bar
            // Custom Pulse Vibration (Simulates Heartbeat/Urgency)
            vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40, 500],
            data: { url: customUrl }, // Attach click destination
            requireInteraction: true // Keep on screen for doctors who are busy
        });
    });

    return promiseChain;
});

// 4. Custom Click Logic (Focus or New Window)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

    // Check all open windows for this PWA
    const promiseChain = clients.matchAll({
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
            // Already open: Focus the tab
            openAppClient.focus();

            // Tell the React router to navigate without heavy reload
            if ('BroadcastChannel' in self) {
                const channel = new BroadcastChannel('fcm_data_messages');
                channel.postMessage({ type: 'NAVIGATE', payload: { url: urlToOpen } });
            }
            return openAppClient;
        } else {
            // App is completely closed: Launch fresh to URL
            return clients.openWindow(urlToOpen);
        }
    });

    event.waitUntil(promiseChain);
});

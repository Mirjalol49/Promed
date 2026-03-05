import { useEffect, useState, useCallback } from 'react';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from '../lib/firebase';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * iOS Safari PWA Push Notification Registration Hook.
 * 
 * This hook handles the FULL lifecycle of web push notifications:
 * 1. Checks if the browser supports push (iOS 16.4+ Safari required)
 * 2. Requests notification permission (MUST be triggered by user gesture on iOS)
 * 3. Registers the Firebase Messaging service worker
 * 4. Gets the FCM token and saves it to Firestore
 * 5. Listens for foreground messages
 * 
 * iOS REQUIREMENTS:
 * - App MUST be added to Home Screen (standalone mode)
 * - Safari 16.4+ required (iOS 16.4+)
 * - Permission MUST be requested from a user gesture (button click)
 * - Web App Manifest MUST have display: "standalone"
 * - Service worker MUST be registered at root scope
 */

// Your VAPID key from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
// Generate one at: https://console.firebase.google.com/project/graft-dashboard/settings/cloudmessaging
const VAPID_KEY = 'BDx38ssfDhZj2vgnTSuGNPg9rkYifrHw4gSABIVg0ztUEivhusbPKacJC5prsaW_4GuaitbpBq51yzK7V5w-wfs';

interface PushNotificationState {
    isSupported: boolean;
    permission: NotificationPermission | 'unsupported';
    token: string | null;
    isLoading: boolean;
    error: string | null;
}

export const usePushNotifications = (userId: string | null) => {
    const [state, setState] = useState<PushNotificationState>({
        isSupported: false,
        permission: 'unsupported',
        token: null,
        isLoading: false,
        error: null,
    });

    // Check support on mount
    useEffect(() => {
        const checkSupport = async () => {
            try {
                // Check if Firebase Messaging is supported in this browser
                const supported = await isSupported();

                // Check if we're in standalone mode (required for iOS)
                const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                    || (navigator as any).standalone === true;

                const hasNotificationAPI = 'Notification' in window;
                const hasServiceWorker = 'serviceWorker' in navigator;

                const canPush = supported && hasNotificationAPI && hasServiceWorker;

                console.log('🔔 Push Support Check:', {
                    firebaseSupported: supported,
                    isStandalone,
                    hasNotificationAPI,
                    hasServiceWorker,
                    canPush,
                    currentPermission: hasNotificationAPI ? Notification.permission : 'N/A',
                    userAgent: navigator.userAgent,
                });

                setState(prev => ({
                    ...prev,
                    isSupported: canPush,
                    permission: hasNotificationAPI ? Notification.permission : 'unsupported',
                }));

                // If already granted, auto-register token
                if (canPush && Notification.permission === 'granted' && userId) {
                    registerToken(userId);
                }
            } catch (err) {
                console.error('🔔 Push support check failed:', err);
                setState(prev => ({
                    ...prev,
                    isSupported: false,
                    error: 'Push notification check failed',
                }));
            }
        };

        checkSupport();
    }, [userId]);

    // Core: Register the service worker and get FCM token
    const registerToken = useCallback(async (uid: string) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // 1. Register the Firebase Messaging service worker
            const swRegistration = await navigator.serviceWorker.register(
                '/firebase-messaging-sw.js',
                { scope: '/' }
            );

            console.log('🔔 Service Worker registered:', swRegistration.scope);

            // Wait for the service worker to be ready
            await navigator.serviceWorker.ready;

            // 2. Get the messaging instance
            const messaging = getMessaging(app);

            // 3. Get FCM token using the service worker registration
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration,
            });

            if (token) {
                console.log('🔔 FCM Token obtained:', token.substring(0, 20) + '...');

                // 4. Save token to Firestore for backend to send pushes
                await setDoc(
                    doc(db, 'fcmTokens', uid),
                    {
                        token,
                        userId: uid,
                        platform: getDevicePlatform(),
                        updatedAt: new Date().toISOString(),
                        userAgent: navigator.userAgent,
                    },
                    { merge: true }
                );

                console.log('🔔 FCM Token saved to Firestore');

                setState(prev => ({
                    ...prev,
                    token,
                    permission: 'granted',
                    isLoading: false,
                }));

                // 5. Listen for foreground messages
                onMessage(messaging, (payload) => {
                    console.log('🔔 [Foreground] Message received:', payload);

                    // Show a local notification even when app is in foreground
                    if (payload.data) {
                        const title = payload.data.patientName || 'Graft';
                        const body = payload.data.text || 'Yangi xabar qabul qilindi';

                        // Use the Notification API directly for foreground
                        new Notification(title, {
                            body,
                            icon: '/apple-touch-icon.png',
                            badge: '/favicon-96x96.png',
                        });
                    }
                });
            } else {
                console.warn('🔔 No FCM token returned. Check VAPID key.');
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Could not get push token. Check VAPID key configuration.',
                }));
            }
        } catch (err: any) {
            console.error('🔔 Token registration failed:', err);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: err.message || 'Failed to register for push notifications',
            }));
        }
    }, []);

    // Public: Request permission (MUST be called from user gesture on iOS!)
    const requestPermission = useCallback(async () => {
        if (!state.isSupported || !userId) {
            console.warn('🔔 Cannot request permission:', {
                isSupported: state.isSupported,
                hasUserId: !!userId,
            });
            return false;
        }

        try {
            setState(prev => ({ ...prev, isLoading: true }));

            const permission = await Notification.requestPermission();

            console.log('🔔 Permission result:', permission);

            setState(prev => ({
                ...prev,
                permission,
                isLoading: permission === 'granted',
            }));

            if (permission === 'granted') {
                await registerToken(userId);
                return true;
            }

            setState(prev => ({ ...prev, isLoading: false }));
            return false;
        } catch (err: any) {
            console.error('🔔 Permission request failed:', err);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: err.message,
            }));
            return false;
        }
    }, [state.isSupported, userId, registerToken]);

    return {
        ...state,
        requestPermission,
    };
};

// Helper: Detect device platform
function getDevicePlatform(): string {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Mac/.test(ua)) return 'macos';
    if (/Windows/.test(ua)) return 'windows';
    return 'web';
}

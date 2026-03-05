import { useEffect, useRef, useCallback } from 'react';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Auto-Enable Push Notifications Hook.
 * 
 * Uses the EXISTING Vite PWA service worker (unified with Firebase messaging).
 * No separate SW registration — avoids the iOS Safari scope conflict.
 * 
 * Flow:
 * 1. If permission already granted → silently register token
 * 2. If "default" → auto-request on first user tap (iOS requires gesture)
 * 3. If "denied" → do nothing
 */

const VAPID_KEY = 'BDx38ssfDhZj2vgnTSuGNPg9rkYifrHw4gSABIVg0ztUEivhusbPKacJC5prsaW_4GuaitbpBq51yzK7V5w-wfs';

export const usePushNotifications = (userId: string | null) => {
    const registeredRef = useRef(false);
    const attemptedRef = useRef(false);

    const registerPushToken = useCallback(async () => {
        if (!userId || registeredRef.current) return;
        registeredRef.current = true;

        try {
            const supported = await isSupported();
            if (!supported) {
                console.log('🔔 Push not supported');
                return;
            }

            // Use the EXISTING service worker (unified Vite PWA + Firebase SW)
            // Don't register a new one — that causes iOS Safari scope conflicts
            const swRegistration = await navigator.serviceWorker.ready;
            console.log('🔔 Using existing SW:', swRegistration.scope);

            const messaging = getMessaging(app);

            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration,
            });

            if (token) {
                console.log('🔔 FCM Token:', token.substring(0, 20) + '...');

                await setDoc(
                    doc(db, 'fcmTokens', userId),
                    {
                        token,
                        userId,
                        platform: getPlatform(),
                        updatedAt: new Date().toISOString(),
                        userAgent: navigator.userAgent,
                    },
                    { merge: true }
                );
                console.log('🔔 Token saved');

                // Foreground message handler
                onMessage(messaging, (payload) => {
                    console.log('🔔 Foreground FCM message:', payload);
                    const data = payload.data || {};
                    const body = data.text || payload.notification?.body || 'Yangi xabar';

                    // Use ServiceWorker showNotification (required for iOS PWA)
                    if (Notification.permission === 'granted') {
                        swRegistration.showNotification('Graft', {
                            body,
                            icon: '/apple-touch-icon.png',
                            badge: '/favicon-96x96.png',
                            tag: `graft-fcm-${Date.now()}`,
                        });
                    }
                });
            } else {
                console.warn('🔔 No token — check VAPID key');
                registeredRef.current = false;
            }
        } catch (err) {
            console.error('🔔 Push registration error:', err);
            registeredRef.current = false;
        }
    }, [userId]);

    const requestAndRegister = useCallback(async () => {
        if (attemptedRef.current) return;
        attemptedRef.current = true;

        try {
            if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

            const permission = await Notification.requestPermission();
            console.log('🔔 Permission:', permission);

            if (permission === 'granted') {
                await registerPushToken();
            }
        } catch (err) {
            console.error('🔔 Permission error:', err);
        }
    }, [registerPushToken]);

    useEffect(() => {
        if (!userId) return;
        if (typeof window === 'undefined') return;
        if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

        // Already granted → register immediately
        if (Notification.permission === 'granted') {
            registerPushToken();
            return;
        }

        // Denied → skip
        if (Notification.permission === 'denied') {
            console.log('🔔 Blocked by user');
            return;
        }

        // "default" → auto-request on first tap (iOS requires user gesture)
        const handleFirstInteraction = () => {
            requestAndRegister();
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('touchstart', handleFirstInteraction);
        };

        document.addEventListener('click', handleFirstInteraction, { once: true });
        document.addEventListener('touchstart', handleFirstInteraction, { once: true });

        return () => {
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('touchstart', handleFirstInteraction);
        };
    }, [userId, registerPushToken, requestAndRegister]);
};

function getPlatform(): string {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Mac/.test(ua)) return 'macos';
    if (/Windows/.test(ua)) return 'windows';
    return 'web';
}

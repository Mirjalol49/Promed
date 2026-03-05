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

import { useState } from 'react';

export const usePushNotifications = (userId: string | null) => {
    const [isPushSupported, setIsPushSupported] = useState<boolean>(true);
    const [permission, setPermission] = useState<NotificationPermission | null>(
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : null
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

                // Foreground FCM message handler
                onMessage(messaging, (payload) => {
                    console.log('🔔 Foreground FCM message:', payload);
                    const data = payload.data || {};
                    const body = data.text || payload.notification?.body || 'Yangi xabar';

                    if (Notification.permission === 'granted') {
                        new Notification('Graft', {
                            body,
                            icon: '/apple-touch-icon.png',
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
        if (attemptedRef.current) return false;
        attemptedRef.current = true;
        setIsLoading(true);
        setError(null);

        try {
            if (!('Notification' in window) || !('serviceWorker' in navigator)) {
                setIsPushSupported(false);
                setIsLoading(false);
                return false;
            }

            const perm = await Notification.requestPermission();
            console.log('🔔 Permission:', perm);
            setPermission(perm);

            if (perm === 'granted') {
                await registerPushToken();
                setIsLoading(false);
                return true;
            }
            setIsLoading(false);
            return false;
        } catch (err) {
            console.error('🔔 Permission error:', err);
            setError((err as Error).message || 'Server xatosi');
            setIsLoading(false);
            return false;
        }
    }, [registerPushToken]);

    useEffect(() => {
        if (!userId) return;
        if (typeof window === 'undefined') return;
        if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
        isSupported().then(supported => {
            setIsPushSupported(supported);
        }).catch(() => setIsPushSupported(false));

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

    return {
        isSupported: isPushSupported,
        permission,
        isLoading,
        error,
        requestPermission: requestAndRegister
    };
};

function getPlatform(): string {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Mac/.test(ua)) return 'macos';
    if (/Windows/.test(ua)) return 'windows';
    return 'web';
}

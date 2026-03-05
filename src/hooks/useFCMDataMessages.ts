import { useEffect } from 'react';

/**
 * Hook to listen for updates sent by the Custom FCM Service Worker.
 * Allows the UI to react instantly (Zero-loading) without a backend refresh,
 * integrating directly via BroadcastChannel API.
 */
export const useFCMDataMessages = (
    onNewMessage?: (payload: any) => void,
    onNavigateRequest?: (url: string) => void
) => {
    useEffect(() => {
        // Safe check for Server-Side Rendering or unsupported browsers
        if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

        // Open the dedicated channel we defined in `firebase-messaging-sw.js`
        const channel = new BroadcastChannel('fcm_data_messages');

        channel.onmessage = (event) => {
            console.log("⚡ [Foreground] ServiceWorker Broadcast Received:", event.data);

            const { type, payload } = event.data || {};

            if (type === 'BACKGROUND_DATA_SYNC' && onNewMessage) {
                // Instantly inject new Lead/Message data to the UI State
                onNewMessage(payload);
            }

            if (type === 'NAVIGATE' && onNavigateRequest) {
                // Service worker telling us the doctor clicked the notification while app was open
                onNavigateRequest(payload.url);
            }
        };

        // Cleanup listener on component unmount
        return () => channel.close();

    }, [onNewMessage, onNavigateRequest]);
};

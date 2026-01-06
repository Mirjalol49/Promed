import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import {
    subscribeToSystemAlerts,
    subscribeToUserNotifications,
    SystemAlert,
    markUserNotificationsAsViewed,
    deleteExpiredUserNotifications
} from '../lib/notificationService';
import { useAccount } from './AccountContext';
import { useAppSounds } from '../hooks/useAppSounds';

interface SystemAlertContextType {
    activeAlert: SystemAlert | null;
    alerts: SystemAlert[];
    unreadCount: number;
    dismissAlert: () => void;
    markAllAsRead: () => void;
}

const SystemAlertContext = createContext<SystemAlertContextType | undefined>(undefined);

export const SystemAlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { userId, createdAt } = useAccount();
    const [globalAlerts, setGlobalAlerts] = useState<SystemAlert[]>([]);
    const [userAlerts, setUserAlerts] = useState<SystemAlert[]>([]);
    const [activeAlert, setActiveAlert] = useState<SystemAlert | null>(null);
    const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);
    const [hasReadNotifications, setHasReadNotifications] = useState(false);

    // Initial and periodic cleanup for this user
    useEffect(() => {
        if (!userId) return;

        // Initial cleanup
        deleteExpiredUserNotifications(userId);

        // Periodic cleanup every hour while session is active
        const interval = setInterval(() => {
            deleteExpiredUserNotifications(userId);
        }, 60 * 60 * 1000);

        return () => clearInterval(interval);
    }, [userId]);

    // Subscribe to Global Broadcasts
    useEffect(() => {
        const unsubscribe = subscribeToSystemAlerts((newAlerts) => {
            setGlobalAlerts(newAlerts);
        });
        return () => unsubscribe();
    }, []);

    // Subscribe to Targeted Notifications
    useEffect(() => {
        const unsubscribe = subscribeToUserNotifications(userId, (newAlerts) => {
            setUserAlerts(newAlerts);
        });
        return () => unsubscribe();
    }, [userId]);
    const { playNotification, stopNotification } = useAppSounds();

    // Sound cooldown/init state
    const [readyForSounds, setReadyForSounds] = useState(false);

    // Filter old alerts for new accounts
    const alerts = useMemo(() => {
        // Filter global alerts: Only show those created after the user joined
        const visibleGlobalAlerts = globalAlerts.filter(alert => {
            if (!createdAt) return true; // Fallback if no creation date yet
            return new Date(alert.created_at) >= new Date(createdAt);
        });

        return [...userAlerts, ...visibleGlobalAlerts].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }, [globalAlerts, userAlerts, createdAt]);

    // Enable sounds after a short delay (so we don't ding on initial fetch)
    useEffect(() => {
        const timer = setTimeout(() => {
            setReadyForSounds(true);
        }, 3000); // 3 seconds "soak" time
        return () => clearTimeout(timer);
    }, []);

    // Handle Active Alert Logic & Sounds
    useEffect(() => {
        // Find the most recent active alert
        const currentActive = alerts.find(a => a.is_active);

        if (currentActive && currentActive.id !== dismissedAlertId) {
            // Check if this is truly a NEW top alert
            const isNewAlert = !activeAlert || activeAlert.id !== currentActive.id;

            // Always update the active alert reference (for content updates)
            setActiveAlert(currentActive);

            if (isNewAlert) {
                setHasReadNotifications(false);

                // only play sound if we are ready AND the alert is reasonably fresh (< 10 mins old)
                // ensuring we don't play sounds for stale cached alerts that load late
                if (readyForSounds) {
                    const age = Date.now() - new Date(currentActive.created_at).getTime();
                    const isFresh = age < 10 * 60 * 1000; // 10 minutes

                    if (isFresh) {
                        console.log("🔔 Ding! Fresh Alert:", currentActive.title);
                        playNotification();
                    } else {
                        console.log("🔕 Silent (Old/Stale):", currentActive.title);
                    }
                }
            }

        } else if (!currentActive) {
            setActiveAlert(null);
        }
    }, [alerts, dismissedAlertId, playNotification, readyForSounds, activeAlert]);

    const dismissAlert = () => {
        if (activeAlert) {
            setDismissedAlertId(activeAlert.id);
            setActiveAlert(null);
        }
    };

    const markAllAsRead = async () => {
        // Stop any playing sound immediately
        stopNotification();

        setHasReadNotifications(true);

        // 1. Persist ALL current alert IDs as "seen" to stop the spotlight
        try {
            const existingSeenStr = localStorage.getItem('promed_seen_ids');
            const existingSeen = existingSeenStr ? JSON.parse(existingSeenStr) : [];
            const currentIds = alerts.map(a => a.id);
            // Keep only the last 100 IDs
            const updatedSeen = [...new Set([...currentIds, ...existingSeen])].slice(0, 100);
            localStorage.setItem('promed_seen_ids', JSON.stringify(updatedSeen));
            console.log("💾 Saved seen IDs:", updatedSeen.length);
        } catch (e) {
            console.error("Storage error:", e);
        }

        // 2. Sync targeted notifications with database
        if (userId) {
            try {
                await markUserNotificationsAsViewed(userId);
            } catch (err) {
                console.error("Failed to mark notifications as viewed:", err);
            }
        }
    };

    const unreadCount = useMemo(() => {
        if (hasReadNotifications) return 0;

        let seenIds: string[] = [];
        try {
            const stored = localStorage.getItem('promed_seen_ids');
            seenIds = stored ? JSON.parse(stored) : [];
        } catch (e) { }

        const unreadItems = alerts.filter(a => {
            if (!a.is_active || a.id === dismissedAlertId) return false;

            // If it's in our seen list, it's NOT unread
            if (seenIds.includes(a.id)) return false;

            // If it's clearly marked as read in DB
            if (a.is_read === true) return false;

            return true;
        });

        if (unreadItems.length > 0) {
            console.log(`🔔 Unread count: ${unreadItems.length}. IDs:`, unreadItems.map(i => i.id));
        }

        return unreadItems.length;
    }, [alerts, hasReadNotifications, dismissedAlertId]);

    return (
        <SystemAlertContext.Provider value={{
            activeAlert,
            alerts,
            unreadCount,
            dismissAlert,
            markAllAsRead
        }}>
            {children}
        </SystemAlertContext.Provider>
    );
};

export const useSystemAlert = () => {
    const context = useContext(SystemAlertContext);
    if (context === undefined) {
        throw new Error('useSystemAlert must be used within a SystemAlertProvider');
    }
    return context;
};

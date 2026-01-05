import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import {
    subscribeToSystemAlerts,
    subscribeToUserNotifications,
    SystemAlert,
    markUserNotificationsAsViewed,
    deleteExpiredUserNotifications
} from '../lib/notificationService';
import { useAccount } from './AccountContext';

interface SystemAlertContextType {
    activeAlert: SystemAlert | null;
    alerts: SystemAlert[];
    unreadCount: number;
    dismissAlert: () => void;
    markAllAsRead: () => void;
}

const SystemAlertContext = createContext<SystemAlertContextType | undefined>(undefined);

export const SystemAlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { userId } = useAccount();
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

    // Merge and Sort Alerts
    const alerts = useMemo(() => {
        return [...userAlerts, ...globalAlerts].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }, [globalAlerts, userAlerts]);

    // Handle Active Alert Logic
    useEffect(() => {
        // Find the most recent active alert
        const currentActive = alerts.find(a => a.is_active);

        if (currentActive && currentActive.id !== dismissedAlertId) {
            setActiveAlert(currentActive);
            setHasReadNotifications(false);
        } else if (!currentActive) {
            setActiveAlert(null);
        }
    }, [alerts, dismissedAlertId]);

    const dismissAlert = () => {
        if (activeAlert) {
            setDismissedAlertId(activeAlert.id);
            setActiveAlert(null);
        }
    };

    const markAllAsRead = async () => {
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

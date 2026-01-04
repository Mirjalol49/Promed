import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { subscribeToSystemAlerts, SystemAlert } from '../lib/notificationService';

interface SystemAlertContextType {
    activeAlert: SystemAlert | null;
    alerts: SystemAlert[];
    unreadCount: number;
    dismissAlert: () => void;
    markAllAsRead: () => void;
}

const SystemAlertContext = createContext<SystemAlertContextType | undefined>(undefined);

export const SystemAlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [alerts, setAlerts] = useState<SystemAlert[]>([]);
    const [activeAlert, setActiveAlert] = useState<SystemAlert | null>(null);
    const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);
    const [hasReadNotifications, setHasReadNotifications] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToSystemAlerts((newAlerts) => {
            setAlerts(newAlerts);

            // Find the most recent active alert
            const currentActive = newAlerts.find(a => a.is_active);

            if (currentActive && currentActive.id !== dismissedAlertId) {
                setActiveAlert(currentActive);
                setHasReadNotifications(false);
            } else if (!currentActive) {
                setActiveAlert(null);
            }
        });

        return () => unsubscribe();
    }, [dismissedAlertId]);

    const dismissAlert = () => {
        if (activeAlert) {
            setDismissedAlertId(activeAlert.id);
            setActiveAlert(null);
        }
    };

    const markAllAsRead = () => {
        setHasReadNotifications(true);
    };

    const unreadCount = (!hasReadNotifications && alerts.some(a => a.is_active && a.id !== dismissedAlertId)) ? 1 : 0;

    return (
        <SystemAlertContext.Provider value={{
            activeAlert,
            alerts,
            unreadCount: alerts.filter(a => a.is_active).length > 0 && !hasReadNotifications ? 1 : 0,
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

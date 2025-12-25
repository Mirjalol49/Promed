import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { subscribeToSystemAlerts, SystemAlert } from '../lib/notificationService';

interface SystemAlertContextType {
    activeAlert: SystemAlert | null;
    dismissAlert: () => void;
}

const SystemAlertContext = createContext<SystemAlertContextType | undefined>(undefined);

export const SystemAlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeAlert, setActiveAlert] = useState<SystemAlert | null>(null);
    const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToSystemAlerts((alert) => {
            // If we get a new alert that isn't the one we dismissed, show it
            if (alert && alert.id !== dismissedAlertId) {
                setActiveAlert(alert);
            } else if (!alert) {
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

    return (
        <SystemAlertContext.Provider value={{ activeAlert, dismissAlert }}>
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

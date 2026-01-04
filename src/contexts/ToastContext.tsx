import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface ToastData {
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
    mascot?: string;
}

interface ToastContextType {
    activeToast: ToastData | null;
    showToast: (title: string, message: string, type: ToastData['type'], mascot?: string) => void;
    hideToast: () => void;
    success: (title: string, message: string, mascot?: string) => void;
    error: (title: string, message: string, mascot?: string) => void;
    info: (title: string, message: string, mascot?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeToast, setActiveToast] = useState<ToastData | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const hideToast = useCallback(() => {
        setActiveToast(null);
        if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    const showToast = useCallback((title: string, message: string, type: ToastData['type'], mascot?: string) => {
        if (timerRef.current) clearTimeout(timerRef.current);

        setActiveToast({ title, message, type, mascot });

        timerRef.current = setTimeout(() => {
            setActiveToast(null);
        }, 4000);
    }, []);

    const success = useCallback((title: string, message: string, mascot?: string) => showToast(title, message, 'success', mascot), [showToast]);
    const error = useCallback((title: string, message: string, mascot?: string) => showToast(title, message, 'error', mascot), [showToast]);
    const info = useCallback((title: string, message: string, mascot?: string) => showToast(title, message, 'info', mascot), [showToast]);

    return (
        <ToastContext.Provider value={{ activeToast, showToast, hideToast, success, error, info }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

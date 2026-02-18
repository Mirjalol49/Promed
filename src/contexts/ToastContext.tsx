import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useAppSounds } from '../hooks/useAppSounds';

export interface ToastAction {
    label: string;
    onClick: () => void;
}

export interface ToastData {
    id: string; // Unique ID for keying and removal
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    mascot?: string;
    duration?: number; // Custom duration in ms
    action?: ToastAction;
    sound?: boolean; // Whether to play sound
}

interface ToastContextType {
    toasts: ToastData[];
    activeToast: ToastData | null; // Deprecated/Legacy support
    showToast: (title: string, message: string, type: ToastData['type'], options?: { mascot?: string, duration?: number, action?: ToastAction, sound?: boolean }) => void;
    hideToast: () => void; // Legacy: hides all or most recent
    dismissToast: (id: string) => void;
    success: (title: string, message: string, options?: { mascot?: string, duration?: number, action?: ToastAction, sound?: boolean } | string) => void;
    error: (title: string, message: string, options?: { mascot?: string, duration?: number, action?: ToastAction, sound?: boolean } | string) => void;
    info: (title: string, message: string, options?: { mascot?: string, duration?: number, action?: ToastAction, sound?: boolean } | string) => void;
    warning: (title: string, message: string, options?: { mascot?: string, duration?: number, action?: ToastAction, sound?: boolean } | string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    // Legacy support accessor
    const activeToast = toasts.length > 0 ? toasts[toasts.length - 1] : null;

    const { playToaster, playPop, playThud } = useAppSounds();

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const hideToast = useCallback(() => {
        setToasts([]); // Clear all
    }, []);

    const showToast = useCallback((title: string, message: string, type: ToastData['type'], options: { mascot?: string, duration?: number, action?: ToastAction, sound?: boolean } = {}) => {
        const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        const { mascot, duration, action, sound = true } = options;

        const newToast: ToastData = {
            id,
            title,
            message,
            type,
            mascot,
            duration: duration || (type === 'error' ? 8000 : (action ? 6000 : 4000)), // Longer defaults for errors/actions
            action,
            sound
        };

        // Sound Logic based on Type (Feedback Hierarchy)
        if (sound) {
            if (type === 'success') {
                // Routine success might be silent or subtle, Critical (action) gets pop
                if (action) playPop();
                // else playToaster(); // Maybe keep silent for routine saves as requested?
                // User said: "Routine Success (Save/Edit) -> No Sound". 
                // checking if it is routine... usually simple success is routine.
            } else if (type === 'error' || type === 'warning') {
                playThud(); // "Low Haptic Thud"
            } else {
                playToaster(); // Default
            }
        }

        setToasts(prev => {
            // Stacking Logic: Max 2. specific rule: "If a third appears, the oldest one should slide out immediately."
            const current = [...prev, newToast];
            if (current.length > 2) {
                return current.slice(current.length - 2);
            }
            return current;
        });
    }, [playToaster, playPop, playThud]);

    // Enhanced helpers
    const success = useCallback((title: string, message: string, options?: { mascot?: string, duration?: number, action?: ToastAction, sound?: boolean } | string) => {
        // Handle legacy call signature where 3rd arg might be mascot string
        const opts = typeof options === 'string' ? { mascot: options } : options;
        // User request: "Routine Success (Save/Edit) -> No Sound"
        // We default sound to false for simple successes unless specified
        showToast(title, message, 'success', { sound: false, ...opts });
    }, [showToast]);

    const error = useCallback((title: string, message: string, options?: { mascot?: string, duration?: number, action?: ToastAction, sound?: boolean } | string) => {
        const opts = typeof options === 'string' ? { mascot: options } : options;
        showToast(title, message, 'error', opts);
    }, [showToast]);

    const info = useCallback((title: string, message: string, options?: { mascot?: string, duration?: number, action?: ToastAction, sound?: boolean } | string) => {
        const opts = typeof options === 'string' ? { mascot: options } : options;
        showToast(title, message, 'info', opts);
    }, [showToast]);

    const warning = useCallback((title: string, message: string, options?: { mascot?: string, duration?: number, action?: ToastAction, sound?: boolean } | string) => {
        const opts = typeof options === 'string' ? { mascot: options } : options;
        showToast(title, message, 'warning', opts);
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ toasts, activeToast, showToast, hideToast, dismissToast, success, error, info, warning }}>
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

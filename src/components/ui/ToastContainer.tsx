import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import { AnimatePresence } from 'framer-motion';
import SyncToast from './SyncToast';

const ToastContainer: React.FC = () => {
    const { toasts, dismissToast } = useToast();

    return (
        <div className="fixed bottom-0 left-0 md:left-auto md:right-0 z-[1000] p-4 md:p-8 flex flex-col items-end justify-end pointer-events-none space-y-6 max-h-screen overflow-hidden">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <SyncToast
                        key={toast.id}
                        {...toast}
                        onClose={dismissToast}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ToastContainer;

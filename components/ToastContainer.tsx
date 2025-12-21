import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
};

interface ToastCardProps {
    toast: { id: number; type: 'success' | 'error' | 'info'; message: string };
    onClose: () => void;
}

const ToastCard = React.memo<ToastCardProps>(({ toast, onClose }) => {
    const [isPaused, setIsPaused] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [remainingTime, setRemainingTime] = useState(4000);

    useEffect(() => {
        if (isPaused || isExiting) return;

        const startTime = Date.now();
        const timer = setTimeout(() => {
            handleClose();
        }, remainingTime);

        return () => {
            clearTimeout(timer);
            // Update remaining time when component unmounts or pauses
            const elapsed = Date.now() - startTime;
            setRemainingTime((prev) => Math.max(0, prev - elapsed));
        };
    }, [isPaused, isExiting, remainingTime]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 300); // Wait for animation to complete
    };

    const getStyles = () => {
        switch (toast.type) {
            case 'success':
                return {
                    border: 'border-l-4 border-green-500',
                    icon: <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />,
                };
            case 'error':
                return {
                    border: 'border-l-4 border-red-500',
                    icon: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
                };
            case 'info':
                return {
                    border: 'border-l-4 border-blue-500',
                    icon: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
                };
        }
    };

    const { border, icon } = getStyles();

    return (
        <div
            className={`bg-white w-80 shadow-xl rounded-lg pointer-events-auto flex items-start p-4 transform transition-all duration-300 ${border} ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
                }`}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Icon */}
            <div className="mr-3 mt-0.5">{icon}</div>

            {/* Message */}
            <div className="flex-1 text-sm text-slate-700 font-medium leading-relaxed">
                {toast.message}
            </div>

            {/* Close Button */}
            <button
                onClick={handleClose}
                className="ml-2 text-slate-400 hover:text-slate-600 transition flex-shrink-0"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
});

export default ToastContainer;

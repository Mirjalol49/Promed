import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SyncToastProps {
    isVisible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
    onClose: () => void;
}

const SyncToast: React.FC<SyncToastProps> = ({ isVisible, title, message, type = 'success', onClose }) => {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (!isVisible) {
            setProgress(100);
            return;
        }

        const duration = 4000;
        const interval = 10;
        const step = (interval / duration) * 100;

        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - step;
            });
        }, interval);

        const closeTimer = setTimeout(() => {
            onClose();
        }, duration);

        return () => {
            clearInterval(timer);
            clearTimeout(closeTimer);
        };
    }, [isVisible, onClose]);

    const getTheme = () => {
        switch (type) {
            case 'error':
                return {
                    border: 'border-rose-500',
                    progress: 'bg-rose-500',
                    mascot: '/images/upset.png'
                };
            default:
                return {
                    border: 'border-emerald-500',
                    progress: 'bg-emerald-500',
                    mascot: '/images/happy.png'
                };
        }
    };

    const theme = getTheme();

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={`fixed bottom-8 right-8 z-[1000] w-96 p-6 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl border-l-4 ${theme.border} flex items-center gap-4 overflow-visible pointer-events-auto`}
                >
                    {/* Mascot Character */}
                    <div className="relative flex-shrink-0">
                        <motion.img
                            initial={{ scale: 0.5, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            src={theme.mascot}
                            alt="Mascot"
                            className="w-24 h-24 object-contain -mt-10 drop-shadow-lg"
                        />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col gap-0.5 pr-2">
                        <h4 className="text-[17px] font-black text-slate-800 leading-tight">
                            {title}
                        </h4>
                        <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                            {message}
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-50 rounded-b-2xl overflow-hidden">
                        <motion.div
                            className={`h-full ${theme.progress}`}
                            initial={{ width: "100%" }}
                            animate={{ width: `${progress}%` }}
                            transition={{ ease: "linear" }}
                        />
                    </div>

                    {/* Glow Effect */}
                    <div className={`absolute -inset-1 ${theme.progress} opacity-[0.03] blur-xl -z-10 rounded-3xl`} />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SyncToast;

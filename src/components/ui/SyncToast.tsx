import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import successAnimation from '../../assets/images/mascots/success.json';
import trashAnimation from '../../assets/images/mascots/trash.json';

import { ToastAction } from '../../contexts/ToastContext';

interface SyncToastProps {
    id: string;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning' | 'injection';
    mascot?: string;
    duration?: number;
    action?: ToastAction;
    onClose: (id: string) => void;
}

const SyncToast = React.forwardRef<HTMLDivElement, SyncToastProps>(({ id, title, message, type = 'success', mascot, duration = 5000, action, onClose }, ref) => {
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(100);
    const [showAnimation, setShowAnimation] = useState(false);

    useEffect(() => {
        // Delay Lottie rendering slightly to prevent layout calculation lag when the toast first appears
        const t = setTimeout(() => setShowAnimation(true), 50);
        return () => clearTimeout(t);
    }, []);

    // Smooth Progress Bar Logic with Pause Support
    useEffect(() => {
        if (isPaused) return;

        const startTime = Date.now();
        const initialProgress = progress;

        let animationFrameId: number;

        const update = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const newProgress = Math.max(0, initialProgress - (elapsed / duration) * 100);

            setProgress(newProgress);

            if (newProgress > 0) {
                animationFrameId = requestAnimationFrame(update);
            } else {
                onClose(id);
            }
        };

        animationFrameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPaused, duration, id, onClose]);

    // Configuration (Memoized for performance)
    const config = React.useMemo(() => {
        const titleLower = title.toLowerCase();
        const messageLower = message.toLowerCase();
        const isInjection = titleLower.includes('injection') || messageLower.includes('injection') || type === 'injection';
        const isDelete = titleLower.includes('delete') ||
            titleLower.includes('o\'chirish') ||
            titleLower.includes('o\'chirildi') ||
            titleLower.includes('o’chirildi') ||
            titleLower.includes('udaleno') ||
            titleLower.includes('удалено') ||
            titleLower.includes('udalen') ||
            titleLower.includes('удален') ||
            titleLower.includes('tashlandi') ||
            messageLower.includes('delete') ||
            messageLower.includes('o\'chirish') ||
            messageLower.includes('o\'chirildi') ||
            messageLower.includes('o’chirildi') ||
            messageLower.includes('udaleno') ||
            messageLower.includes('удалено') ||
            messageLower.includes('udalen') ||
            messageLower.includes('удален') ||
            messageLower.includes('removed') ||
            messageLower.includes('tashlandi');

        if (isDelete) {
            return {
                titleColor: 'text-emerald-600',
                progressColor: 'bg-emerald-500',
                id: 'delete',
                animation: trashAnimation
            };
        }

        if (isInjection) {
            return {
                titleColor: 'text-promed-primary',
                progressColor: 'bg-promed-primary',
                id: 'injection',
                animation: null
            };
        }

        switch (type) {
            case 'error':
            case 'warning':
                return {
                    titleColor: 'text-rose-600',
                    progressColor: 'bg-rose-500',
                    id: 'error',
                    animation: null
                };
            case 'success':
                return {
                    titleColor: 'text-emerald-600',
                    progressColor: 'bg-emerald-500',
                    id: 'success',
                    animation: successAnimation
                };
            default:
                return {
                    titleColor: 'text-amber-500',
                    progressColor: 'bg-amber-500',
                    id: 'info',
                    animation: null
                };
        }
    }, [title, message, type]);

    // Premium Shadow & Gloss Effects
    const glowColor = React.useMemo(() => ({
        success: 'shadow-emerald-500/25',
        error: 'shadow-rose-500/25',
        warning: 'shadow-amber-500/25',
        injection: 'shadow-promed-primary/25',
        info: 'shadow-slate-500/25'
    }[type] || 'shadow-slate-500/25'), [type]);

    const gradient = React.useMemo(() => ({
        success: 'from-emerald-400 to-emerald-600',
        error: 'from-rose-400 to-rose-600',
        warning: 'from-amber-400 to-amber-600',
        injection: 'from-promed-primary to-promed-dark',
        info: 'from-slate-400 to-slate-600'
    }[type] || 'from-slate-400 to-slate-600'), [type]);

    // Handle delete specifically for gradient - GREEN NOW
    const finalGradient = React.useMemo(() => {
        const t = title.toLowerCase();
        // @ts-ignore
        const isDeleteTitle = t.includes('delete') ||
            t.includes('o\'chir') ||
            t.includes('udaleno') ||
            t.includes('удалено') ||
            t.includes('udalen') ||
            t.includes('удален') ||
            t.includes('removed') ||
            t.includes('tashlandi');
        return isDeleteTitle ? 'from-emerald-400 to-emerald-600' : gradient;
    }, [title, gradient]);

    return (
        <motion.div
            ref={ref}
            layout
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 20
                }
            }}
            exit={{ opacity: 0, scale: 0.8, y: 10, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex w-full md:w-auto items-end justify-center md:justify-end mb-4 px-4 md:px-0`}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className="relative group">
                {/* MAIN BUBBLE */}
                <div className={`relative ${glowColor} shadow-[0_15px_40px_rgba(0,0,0,0.1)] rounded-[22px] overflow-visible`}>
                    <div className="bg-white/90 backdrop-blur-xl rounded-[22px] min-w-[280px] md:min-w-[340px] max-w-[90vw] relative z-10 overflow-hidden border border-white/80 shadow-inner ring-1 ring-black/5 transition-all duration-300">

                        <div className="flex">
                            {/* Visual Accent Strip */}
                            <div className={`w-1.5 ${config.progressColor} opacity-90`} />

                            <div className={`flex-1 p-5 md:p-6 flex flex-col md:flex-row items-center md:items-start justify-center md:justify-start gap-3 md:gap-4 pr-10 md:pr-10`}>
                                {config.animation && (
                                    <div className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0 flex items-center justify-center -mt-1 md:-mt-2 -mb-2 md:-mb-3 -ml-2">
                                        {showAnimation && (
                                            <Lottie
                                                animationData={config.animation}
                                                loop={true}
                                                autoplay={true}
                                                className="w-full h-full drop-shadow-sm"
                                            />
                                        )}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h3 className={`font-black text-[15px] md:text-base leading-tight tracking-tight mb-1 ${config.titleColor} text-center md:text-left`}>
                                        {title}
                                    </h3>
                                    <p className="text-xs md:text-sm font-bold text-slate-500 leading-snug text-center md:text-left">
                                        {message}
                                    </p>
                                </div>

                                {/* Undo Action Button */}
                                {action && (
                                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            action.onClick();
                                            onClose(id);
                                        }}
                                        className="px-3 py-1.5 text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95 whitespace-nowrap border border-slate-200"
                                    >
                                        {action.label}
                                    </motion.button>
                                )}

                                {/* Close X */}
                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                    onClick={() => onClose(id)}
                                    className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 transition-colors p-1"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </motion.button>
                            </div>
                        </div>

                        {/* PROGRESS BAR */}
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-100/30">
                            <div
                                className={`h-full bg-gradient-to-r ${finalGradient} transition-opacity duration-300 ${isPaused ? 'opacity-70' : 'opacity-100'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Glossy Overlay */}
                    <div className="absolute inset-0 rounded-[24px] ring-1 ring-inset ring-white/60 pointer-events-none z-20" />
                </div>
            </div>
        </motion.div>
    );
});

SyncToast.displayName = 'SyncToast';

export default SyncToast;

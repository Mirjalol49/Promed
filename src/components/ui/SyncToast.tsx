import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import happyMascot from '../mascot/happy_mascot.png';
import sadMascot from '../mascot/upset_mascot.png';
import injectionMascot from '../mascot/injection_mascot.png';
import thinkingMascot from '../mascot/thinking_mascot.png';

interface SyncToastProps {
    isVisible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning' | 'injection';
    mascot?: string;
    onClose: () => void;
}

const SyncToast: React.FC<SyncToastProps> = ({ isVisible, title, message, type = 'success', mascot, onClose }) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isVisible) {
            requestAnimationFrame(() => setShow(true));
        } else {
            setShow(false);
        }
    }, [isVisible]);

    useEffect(() => {
        if (!isVisible) return;
        const duration = 5000;
        const closeTimer = setTimeout(() => onClose(), duration);
        return () => clearTimeout(closeTimer);
    }, [isVisible, onClose]);

    // Configuration for "Josh W. Comeau" Style
    const getToastConfig = () => {
        const isInjection = title.toLowerCase().includes('injection') || message.toLowerCase().includes('injection') || type === 'injection';

        if (isInjection) {
            return {
                mascotImg: injectionMascot,
                mascotSide: 'left', // Doctor leans on the left
                titleColor: 'text-blue-600',
                progressColor: 'bg-blue-500',
                tailColor: 'bg-white'
            };
        }

        switch (type) {
            case 'error':
                return {
                    mascotImg: sadMascot,
                    mascotSide: 'right',
                    titleColor: 'text-rose-600',
                    progressColor: 'bg-rose-500',
                    tailColor: 'bg-white'
                };
            case 'success':
                return {
                    mascotImg: happyMascot,
                    mascotSide: 'right',
                    titleColor: 'text-emerald-600',
                    progressColor: 'bg-emerald-500',
                    tailColor: 'bg-white'
                };
            default:
                return {
                    mascotImg: thinkingMascot,
                    mascotSide: 'right',
                    titleColor: 'text-amber-500',
                    progressColor: 'bg-amber-500',
                    tailColor: 'bg-white'
                };
        }
    };

    const config = getToastConfig();
    const activeMascot = mascot || config.mascotImg;
    const isRight = config.mascotSide === 'right';

    return (
        <AnimatePresence>
            {(isVisible || show) && (
                <div className={`fixed bottom-10 z-[1000] pointer-events-none flex items-end ${isRight ? 'right-28' : 'right-10'}`}>

                    {/* Floating Container with Drop Shadow */}
                    <motion.div
                        initial={{ y: 50, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="relative filter drop-shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                    >
                        {/* THE SPEECH BUBBLE */}
                        <div className="bg-white rounded-3xl w-80 relative z-10 pointer-events-auto overflow-hidden">
                            <div className="p-6">
                                <h3 className={`font-extrabold text-lg leading-tight mb-1 ${config.titleColor}`}>
                                    {title}
                                </h3>
                                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                    {message}
                                </p>
                            </div>

                            {/* PROGRESS BAR */}
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 5, ease: "linear" }}
                                className={`h-1.5 ${config.progressColor || 'bg-blue-500'}`}
                            />
                        </div>

                        {/* THE TAIL (Rotated Square) */}
                        <div
                            className={`absolute w-6 h-6 bg-white rotate-45 z-10 top-1/2 -mt-3
                                ${isRight ? '-right-2' : '-left-2'}
                            `}
                        />

                        {/* MASCOT (Positioned Absolutely Outside) */}
                        {activeMascot && (
                            <motion.img
                                initial={{ opacity: 0, x: isRight ? -20 : 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1, type: "spring" }}
                                src={activeMascot}
                                alt="Mascot"
                                className={`
                                    absolute w-40 h-40 object-contain z-20 pointer-events-none bottom-[-16px]
                                    ${isRight ? '-right-[8.5rem]' : '-left-[8.5rem]'}
                                `}
                            />
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SyncToast;

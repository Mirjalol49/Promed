import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import happyMascot from '../../components/mascot/happy_mascot.png';
import sadMascot from '../../components/mascot/upset_mascot.png';
import injectionMascot from '../../components/mascot/injection_mascot.png';
import thinkingMascot from '../../components/mascot/thinking_mascot.png';

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
        if (isVisible) {
            requestAnimationFrame(() => setShow(true));
        } else {
            setShow(false);
        }
    }, [isVisible]);

    // Removed independent setTimeout to ensure perfect sync with progress bar
    // The progress bar's onAnimationComplete now triggers onClose

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

    // Premium Shadow & Gloss Effects
    const glowColor = {
        success: 'shadow-emerald-500/20',
        error: 'shadow-rose-500/20',
        warning: 'shadow-amber-500/20',
        injection: 'shadow-blue-500/20',
        info: 'shadow-slate-500/20'
    }[type] || 'shadow-slate-500/20';

    const gradient = {
        success: 'from-emerald-400 to-emerald-600',
        error: 'from-rose-400 to-rose-600',
        warning: 'from-amber-400 to-amber-600',
        injection: 'from-blue-400 to-blue-600',
        info: 'from-slate-400 to-slate-600'
    }[type] || 'from-slate-400 to-slate-600';

    return (
        <AnimatePresence>
            {(isVisible || show) && (
                <div className={`fixed z-[1000] pointer-events-none w-full md:w-auto flex items-end justify-center
                    bottom-32 md:bottom-12
                    left-0 md:left-auto
                    ${isRight ? 'md:right-8' : 'md:left-8'}
                `}>
                    <motion.div
                        initial={{ y: 50, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={`inline-flex items-end ${isRight ? 'flex-row' : 'flex-row-reverse'} -space-x-1 md:-space-x-0`}
                    >
                        {/* MAIN BUBBLE */}
                        <div className={`relative group ${glowColor} shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[24px]`}>
                            <div className="bg-white/95 backdrop-blur-xl rounded-[24px] min-w-[260px] max-w-[80vw] md:max-w-md relative z-10 pointer-events-auto overflow-hidden border border-white/50 shadow-sm ring-1 ring-black/5">

                                {/* Content */}
                                <div className="px-6 py-5 flex items-center justify-center min-h-[64px] relative z-10">
                                    <h3 className={`font-black text-lg md:text-2xl leading-tight text-center tracking-tight ${config.titleColor}`}>
                                        {title}
                                    </h3>
                                </div>

                                {/* PROGRESS BAR */}
                                <div className="absolute bottom-0 left-0 right-0 h-1.5 md:h-2 bg-slate-100">
                                    <motion.div
                                        initial={{ width: "100%" }}
                                        animate={{ width: "0%" }}
                                        transition={{ duration: 5, ease: "linear" }}
                                        onAnimationComplete={() => onClose()}
                                        className={`h-full bg-gradient-to-r ${gradient} shadow-[0_0_10px_rgba(0,0,0,0.1)]`}
                                    />
                                </div>
                            </div>

                            {/* SMOOTH SVG TAIL */}
                            <svg
                                className={`absolute w-8 h-8 z-20 text-white/95 drop-shadow-sm
                                    top-1/2 -translate-y-1/2
                                    ${isRight ? '-right-[19px] rotate-0' : '-left-[19px] scale-x-[-1]'}
                                `}
                                viewBox="0 0 32 32"
                                fill="currentColor"
                                style={{ filter: 'drop-shadow(1px 0 1px rgba(0,0,0,0.05))' }}
                            >
                                <path d="M0,16 Q5,16 32,0 Q12,32 0,16 Z" />
                            </svg>
                        </div>

                        {/* MASCOT (Relative in Flex) */}
                        {activeMascot && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, x: isRight ? -20 : 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                transition={{ delay: 0.1, type: "spring" }}
                                className="relative z-20 pointer-events-none shrink-0"
                            >
                                <img
                                    src={activeMascot}
                                    alt="Mascot"
                                    className="w-24 h-24 md:w-40 md:h-40 object-contain drop-shadow-2xl filter brightness-105 contrast-110 mb-[-6px] md:mb-[-8px]"
                                />
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SyncToast;

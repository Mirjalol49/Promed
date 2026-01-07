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
                // CONTAINER: Responsive Positioning
                // - Mobile: bottom-32, Centered (left-1/2 -translate-x-1/2) with tighter mascot
                // - Desktop: bottom-10, Right aligned
                <div className={`fixed z-[1000] pointer-events-none flex items-end
                    bottom-32 md:bottom-10
                    left-1/2 -translate-x-1/2
                    md:left-auto md:translate-x-0
                    ${isRight ? 'md:right-36' : 'md:left-36'}
                `}>

                    {/* Floating Container with Drop Shadow */}
                    <motion.div
                        initial={{ y: 50, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="relative filter drop-shadow-2xl"
                    >
                        {/* THE SPEECH BUBBLE */}
                        <div className="bg-white rounded-[2rem] min-w-[200px] max-w-[80vw] md:max-w-xs relative z-10 pointer-events-auto overflow-hidden border border-slate-100/50">
                            <div className="p-4 md:p-5 flex items-center justify-center min-h-[56px]">
                                <h3 className={`font-extrabold text-lg md:text-xl leading-tight text-center ${config.titleColor}`}>
                                    {title}
                                </h3>
                            </div>

                            {/* PROGRESS BAR */}
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 5, ease: "linear" }}
                                className={`h-1.5 ${config.progressColor || 'bg-blue-500'}`}
                            />
                        </div>

                        {/* THE TAIL (Rotated Square) - Hidden on Mobile Center for cleaner look? Or kept? check visuals. Let's keep distinct tail. */}
                        <div
                            className={`absolute w-5 h-5 bg-white rotate-45 z-10 top-1/2 -mt-2.5
                                ${isRight ? '-right-2 md:-right-2' : '-left-2 md:-left-2'}
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
                                    absolute object-contain z-20 pointer-events-none
                                    w-20 h-20 md:w-32 md:h-32
                                    bottom-[-6px] md:bottom-[-8px]
                                    ${isRight ? '-right-[4.2rem] md:-right-[7.5rem]' : '-left-[4.2rem] md:-left-[7.5rem]'}
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

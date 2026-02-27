import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
    content: ReactNode;
    children: ReactNode;
    position?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ left: 0, top: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    const updateCoords = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                left: rect.left + rect.width / 2,
                top: position === 'top' ? rect.top : rect.bottom
            });
        }
    };

    const handleMouseEnter = () => {
        updateCoords();
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    useEffect(() => {
        if (isVisible) {
            window.addEventListener('resize', updateCoords);
            window.addEventListener('scroll', updateCoords, true);
        }
        return () => {
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }, [isVisible]);

    return (
        <div
            ref={triggerRef}
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {createPortal(
                <AnimatePresence>
                    {isVisible && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: position === 'top' ? 10 : -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            style={{
                                position: 'fixed',
                                left: coords.left,
                                top: coords.top,
                                transform: 'translate3d(-50%, 0, 0)', // Centering
                                pointerEvents: 'none', // Don't block mouse
                                zIndex: 9999,
                            }}
                            className={`px-3 py-1.5 bg-white/95 text-slate-800 text-xs font-bold rounded-lg shadow-xl whitespace-nowrap backdrop-blur-sm border border-slate-200/60 ${position === 'top' ? '-mt-2 -translate-y-full' : 'mt-2'
                                }`}
                        >
                            {content}
                            {/* Arrow Pointer */}
                            <div
                                className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 transform border-r border-b border-slate-200/60 ${position === 'top'
                                    ? '-bottom-1 border-t-0 border-l-0 border-slate-700/0' // Bottom arrow for top tooltip
                                    : '-top-1 border-r-0 border-b-0 border-slate-700/0' // Top arrow for bottom tooltip
                                    }`}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

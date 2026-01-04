import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import happyMascot from '../mascot/happy_mascot.png';

export const DashboardLoader: React.FC = () => {
    // SSR Check
    if (typeof window === 'undefined') return null;

    return createPortal(
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm"
        >
            <div className="flex flex-col items-center">
                <div className="relative">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "backOut" }}
                        className="relative z-10"
                    >
                        <img src={happyMascot} alt="Loading..." className="w-32 h-32 object-contain" />
                    </motion.div>
                </div>

                <div className="mt-6 flex flex-col items-center gap-4">
                    <p className="text-promed-primary font-bold text-lg tracking-wide">
                        Barchasi nazorat ostida...
                    </p>

                    {/* Tiny Dots Spinner */}
                    <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-1.5 h-1.5 bg-promed-primary rounded-full"
                                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                    ease: "easeInOut"
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>,
        document.body
    );
};

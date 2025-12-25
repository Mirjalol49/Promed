import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { MascotImage } from './MascotImage';

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
                    {/* Bouncing background glow */}
                    <motion.div
                        className="absolute inset-0 bg-promed-primary/10 blur-3xl rounded-full"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {/* Heartbeat Mascot */}
                    <MascotImage
                        src="/images/mascot/happy.png"
                        alt="Happy Mascot"
                        className="w-32 h-32 object-contain drop-shadow-2xl relative z-10"
                        width={128}
                        height={128}
                        loading="eager" // Hero/Critical image
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>

                <div className="mt-6 flex flex-col items-center gap-4">
                    <p className="text-emerald-800 font-medium text-lg tracking-wide">
                        Barchasi nazorat ostida...
                    </p>

                    {/* Tiny Dots Spinner */}
                    <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-1.5 h-1.5 bg-emerald-500 rounded-full"
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

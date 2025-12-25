import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import Mascot from '../mascot/Mascot';

interface ImageUploadingOverlayProps {
    language: 'uz' | 'en' | 'ru';
}

const copy = {
    uz: "Vau! Sifati a'lo darajada! 📸",
    en: "Wow! Great quality! 📸",
    ru: "Вау! Отличное качество! 📸"
};

export const ImageUploadingOverlay: React.FC<ImageUploadingOverlayProps> = ({ language }) => {
    if (typeof window === 'undefined') return null;

    const title = copy[language] || copy['en'];

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white/95 backdrop-blur-md pointer-events-none"
        >
            <div className="flex flex-col items-center">
                <div className="relative mb-6">
                    {/* Subtle pulsing background glow */}
                    <motion.div
                        className="absolute inset-0 bg-promed-primary/10 blur-3xl rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {/* Heartbeat Mascot */}
                    <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="relative z-10"
                    >
                        <Mascot mood="happy" size={160} floating={false} />
                    </motion.div>
                </div>

                <div className="text-center">
                    <h3 className="text-emerald-900 font-black text-2xl tracking-tight">
                        {title}
                    </h3>

                    {/* Minimal Dots Spinner */}
                    <div className="flex gap-2 mt-6 justify-center">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-1.5 h-1.5 bg-emerald-500 rounded-full"
                                animate={{ opacity: [0.3, 1, 0.3] }}
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

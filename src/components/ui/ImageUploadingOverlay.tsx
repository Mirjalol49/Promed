import React from 'react';
import { motion } from 'framer-motion';

interface ImageUploadingOverlayProps {
    language: 'uz' | 'en' | 'ru';
}

const copy = {
    uz: "Vau! Sifati a'lo darajada! 📸",
    en: "Wow! Great quality! 📸",
    ru: "Вау! Отличное качество! 📸"
};

export const ImageUploadingOverlay: React.FC<ImageUploadingOverlayProps> = ({ language }) => {
    const title = copy[language] || copy['en'];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-inherit"
        >
            <div className="flex flex-col items-center scale-75 md:scale-90">
                <div className="relative mb-2">
                    {/* Subtle pulsing background glow */}
                    <motion.div
                        className="absolute inset-0 bg-promed-primary/10 blur-2xl rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {/* Heartbeat Mascot */}
                    <motion.div
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="relative z-10"
                    >
                    </motion.div>
                </div>

                <div className="text-center px-2">
                    <h3 className="text-emerald-900 font-bold text-sm tracking-tight leading-tight">
                        {title}
                    </h3>

                    {/* Minimal Dots Spinner */}
                    <div className="flex gap-1.5 mt-2 justify-center">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-1 h-1 bg-emerald-500 rounded-full"
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
        </motion.div>
    );
};

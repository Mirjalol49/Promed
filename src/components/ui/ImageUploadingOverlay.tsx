import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ImageUploadingOverlayProps {
    language: 'uz' | 'en' | 'ru';
}

const copy = {
    uz: "Saqlanmoqda...",
    en: "Saving...",
    ru: "Сохранение..."
};

export const ImageUploadingOverlay: React.FC<ImageUploadingOverlayProps> = ({ language }) => {
    const title = copy[language] || copy['en'];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-inherit transition-colors duration-300"
        >
            <div className="flex flex-col items-center text-white">
                <Loader2 className="w-8 h-8 animate-spin mb-2" strokeWidth={2.5} />
                <h3 className="font-bold text-sm tracking-wide uppercase drop-shadow-md">
                    {title}
                </h3>
            </div>
        </motion.div>
    );
};

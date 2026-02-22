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

export const ImageUploadingOverlay: React.FC<ImageUploadingOverlayProps & { showText?: boolean; progress?: number }> = ({ language, showText = true, progress }) => {
    const title = copy[language] || copy['en'];
    const hasProgress = typeof progress === 'number' && progress >= 0;

    // Circular Progress Params
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = hasProgress ? circumference - ((progress || 0) / 100) * circumference : 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md rounded-inherit transition-all duration-300"
        >
            <div className="flex flex-col items-center text-white relative">
                {hasProgress ? (
                    <div className={`relative flex items-center justify-center ${showText ? 'mb-2' : ''}`}>
                        {/* Background Circle */}
                        <svg className="transform -rotate-90 w-12 h-12">
                            <circle
                                cx="24"
                                cy="24"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="transparent"
                                className="text-white/20"
                            />
                            {/* Progress Circle */}
                            <circle
                                cx="24"
                                cy="24"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="text-white transition-all duration-300 ease-out"
                            />
                        </svg>
                        {/* Percentage Text */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-bold">{Math.round(progress || 0)}%</span>
                        </div>
                    </div>
                ) : (
                    <div className={`${showText ? 'w-16 h-16' : 'w-20 h-20'} flex items-center justify-center`}>
                        <Loader2 className="w-10 h-10 animate-spin text-white opacity-80" />
                    </div>
                )}

                {showText && (
                    <h3 className="font-bold text-sm tracking-wide uppercase drop-shadow-md text-center px-1">
                        {title}
                    </h3>
                )}
            </div>
        </motion.div>
    );
};

import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import loadingAnimation from '../../assets/images/mascots/loading.json';
import { useLanguage } from '../../contexts/LanguageContext';

export const DashboardLoader: React.FC = () => {
    // SSR Check
    if (typeof window === 'undefined') return null;

    const { t } = useLanguage();

    return createPortal(
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white/95 backdrop-blur-md"
        >
            <div className="flex flex-col items-center">
                <div className="relative">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "backOut" }}
                        className="relative z-10 w-40 h-40 md:w-56 md:h-56"
                    >
                        <Lottie
                            animationData={loadingAnimation}
                            loop={true}
                            autoplay={true}
                        />
                    </motion.div>
                </div>

                <div className="mt-4 flex flex-col items-center gap-4">
                    <p className="text-slate-500 font-bold text-lg tracking-tight animate-pulse">
                        {t('loading_pleasewait') || 'Iltimos kuting...'}
                    </p>
                </div>
            </div>
        </motion.div>,
        document.body
    );
};

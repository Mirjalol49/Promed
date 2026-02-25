
import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import emptyMascot from '../../assets/images/mascots/empty.png';
import { useLanguage } from '../../contexts/LanguageContext';

interface EmptyStateJourneyProps {
    onAdd?: () => void;
}

export const EmptyStateJourney: React.FC<EmptyStateJourneyProps> = () => {
    const { t } = useLanguage();

    return (
        <div className="w-full flex flex-col items-center justify-center relative overflow-hidden py-10">
            {/* Indigo Blob Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-indigo-50/80 rounded-full blur-3xl -z-10" />

            {/* Mascot Container */}
            <div className="relative mb-4">


                {/* Mascot with entrance → then smooth float */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, duration: 0.5 }}
                >
                    <motion.img
                        src={emptyMascot}
                        alt="Empty"
                        initial={{ y: 0 }}
                        animate={{ y: -8 }}
                        transition={{
                            duration: 2.8,
                            repeat: Infinity,
                            repeatType: 'mirror',
                            ease: [0.45, 0, 0.55, 1],
                            delay: 0.4,
                        }}
                        className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-xl relative z-10"
                    />
                </motion.div>
            </div>

            {/* Text Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-6 relative z-10"
            >
                <h3 className="text-xl font-black text-slate-800 mb-0 tracking-tight">{t('empty_state_peace') || "Hozircha Bo'sh"}</h3>
            </motion.div>

        </div>
    );
};

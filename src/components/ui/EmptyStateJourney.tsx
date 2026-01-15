
import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import thinkingMascot from "../../components/mascot/thinking_mascot.png";

interface EmptyStateJourneyProps {
    onAdd: () => void;
}

export const EmptyStateJourney: React.FC<EmptyStateJourneyProps> = ({ onAdd }) => {
    return (
        <div className="w-full flex flex-col items-center justify-center relative overflow-hidden py-10">
            {/* Indigo Blob Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-indigo-50/80 rounded-full blur-3xl -z-10" />

            {/* Mascot Container */}
            <div className="relative mb-4">


                {/* Mascot */}
                <motion.img
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: "spring", stiffness: 260, damping: 20 }}
                    src={thinkingMascot}
                    alt="Thinking Koala"
                    className="w-40 h-40 object-contain drop-shadow-xl relative z-10"
                />
            </div>

            {/* Text Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-6 relative z-10"
            >
                <h3 className="text-xl font-black text-slate-800 mb-0 tracking-tight">Hozircha Bo'sh</h3>
            </motion.div>

            {/* Action Button */}
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    opacity: { delay: 0.4, duration: 0.5 },
                    y: { delay: 0.4, duration: 0.5 },
                    default: { type: "spring", stiffness: 400, damping: 10 }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onAdd}
                className="btn-premium-blue !px-6 !py-3 !text-base shadow-lg shadow-blue-500/30"
            >
                <Plus size={20} className="relative z-10" />
                <span>Inyeksiya Qo'shish</span>
            </motion.button>
        </div>
    );
};

import React from 'react';
import { motion } from 'framer-motion';
import emptyMascot from '../../assets/images/mascots/empty.png';

interface EmptyStateProps {
    message: string;
    description?: string;
    action?: React.ReactNode;
    fullHeight?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    message,
    description,
    action,
    fullHeight = true
}) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex flex-col items-center justify-center text-center p-8 ${fullHeight ? 'h-full min-h-[400px]' : ''}`}
        >
            <div className="relative mb-6 group">
                {/* Decorative Glow */}
                <div className="absolute inset-0 bg-blue-400/5 blur-[50px] rounded-full" />

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
                    }}
                    className="w-24 h-24 md:w-32 md:h-32 object-contain relative z-10 drop-shadow-md"
                />
            </div>

            <div className="max-w-md relative z-10">
                <h3 className="text-lg md:text-xl font-bold text-slate-500 tracking-wide leading-tight mt-4">
                    {message}
                </h3>
            </div>

            {action && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-8"
                >
                    {action}
                </motion.div>
            )}
        </motion.div>
    );
};

import React from 'react';
import Lottie from 'lottie-react';
import { motion } from 'framer-motion';
import emptyAnimation from '../../assets/images/mascots/empty.json';

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

                <motion.div
                    animate={{
                        y: [0, -6, 0]
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="w-32 h-32 md:w-40 md:h-40 relative z-10"
                >
                    <Lottie
                        animationData={emptyAnimation}
                        loop={true}
                        autoplay={true}
                    />
                </motion.div>
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

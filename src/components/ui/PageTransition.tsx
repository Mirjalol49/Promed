import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
    children: React.ReactNode;
    className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className = '' }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99, filter: 'blur(5px)' }}
            transition={{
                duration: 0.4,
                ease: [0.2, 0.8, 0.2, 1] // Apple-style cubic-bezier
            }}
            className={`w-full ${className}`}
        >
            {children}
        </motion.div>
    );
};

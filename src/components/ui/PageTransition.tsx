import React, { forwardRef } from 'react';
import { motion, Variants } from 'framer-motion';

interface PageTransitionProps {
    children: React.ReactNode;
    className?: string;
}

const variants: Variants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.3,
            ease: [0.22, 1, 0.36, 1] as const // Modern Quintic Ease-Out
        }
    },
    exit: {
        opacity: 0,
        scale: 0.98,
        transition: {
            duration: 0.2,
            ease: [0.32, 0, 0.67, 0] as const // Quintic Ease-In
        }
    },
};

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(({ children, className = '' }, ref) => {
    return (
        <motion.div
            ref={ref}
            className={`w-full ${className}`}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            {children}
        </motion.div>
    );
});

PageTransition.displayName = 'PageTransition';

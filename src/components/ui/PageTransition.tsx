import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
    children: React.ReactNode;
    className?: string;
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(({ children, className = '' }, ref) => {
    return (
        <div ref={ref} className={`w-full ${className}`}>
            {children}
        </div>
    );
});

PageTransition.displayName = 'PageTransition';

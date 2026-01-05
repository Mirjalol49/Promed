import React from 'react';
import { motion } from 'framer-motion';

interface AnimateIconProps {
    children: React.ReactNode;
    animateOnHover?: boolean;
    className?: string;
}

export const AnimateIcon: React.FC<AnimateIconProps> = ({ children, animateOnHover = true, className = '' }) => {
    const iconVariants = {
        idle: { scale: 1, rotate: 0 },
        hover: {
            scale: 1.2,
            rotate: [0, -5, 5, 0],
            transition: {
                type: "spring" as const,
                stiffness: 300,
                damping: 10,
                duration: 0.4
            }
        }
    };

    if (!animateOnHover) return <div className={className}>{children}</div>;

    return (
        <motion.div
            className={className}
            variants={iconVariants}
            initial="idle"
        >
            {children}
        </motion.div>
    );
};

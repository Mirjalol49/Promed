import React from 'react';
import { motion } from 'framer-motion';

interface AnimateIconProps {
    children: React.ReactNode;
    animateOnHover?: boolean;
    className?: string;
}

export const AnimateIcon: React.FC<AnimateIconProps> = ({ children, animateOnHover = true, className = '' }) => {
    if (!animateOnHover) return <div className={className}>{children}</div>;

    return (
        <motion.div
            className={className}
            whileHover={{
                rotate: [0, -10, 10, -10, 10, 0],
                scale: 1.1,
                transition: { duration: 0.5 }
            }}
        // Also trigger when parent group is hovered if using CSS group-hover logic? 
        // Framer motion 'whileHover' handles direct hover. 
        // To handle parent hover, we usually need variants propagated from parent, 
        // but here we might just rely on direct hover of the button which contains this.
        >
            {children}
        </motion.div>
    );
};

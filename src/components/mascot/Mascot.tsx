import React from 'react';
import { motion, Variants } from 'framer-motion';
import { MascotImage } from '../ui/MascotImage';

export type MascotMood = 'happy' | 'thinking' | 'upset' | 'operation' | 'injection';

interface MascotProps {
    mood: MascotMood;
    size?: number;
    className?: string;
    floating?: boolean;
}

const mascotVariants: Variants = {
    idle: (floating: boolean) => ({
        y: floating ? [0, -8, 0] : 0,
        transition: {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
        }
    }),
    hover: {
        scale: 1.15,
        rotate: [0, -5, 5, 0],
        y: -10,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 10
        }
    }
};

const Mascot: React.FC<MascotProps> = ({ mood, size = 120, className = "", floating = true }) => {
    const getMascotSrc = (m: MascotMood) => {
        // Use absolute paths for stability on sub-pages and preloading support
        return `/images/mascot/${m}.png`;
    };

    return (
        <motion.div
            className={`relative inline-block ${className}`}
            variants={mascotVariants}
            initial="idle"
            animate="idle"
            custom={floating}
            whileHover="hover"
        >
            <MascotImage
                src={getMascotSrc(mood)}
                alt={`Mascot ${mood}`}
                width={size}
                height={size} // Explicit dimensions for layout stability
                className="object-contain"
            />
        </motion.div>
    );
};

export default Mascot;

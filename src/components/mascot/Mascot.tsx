import React from 'react';
import { motion, Variants } from 'framer-motion';

// Import images directly to ensure Vite bundles them correctly
import happyImg from '../../assets/images/happy.png';
import thinkingImg from '../../assets/images/thinking.png';
import upsetImg from '../../assets/images/upset.png';
import operationImg from '../../assets/images/operation.png';
import injectionImg from '../../assets/images/injection.png';

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
        switch (m) {
            case 'happy': return happyImg;
            case 'thinking': return thinkingImg;
            case 'upset': return upsetImg;
            case 'operation': return operationImg;
            case 'injection': return injectionImg;
            default: return happyImg;
        }
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
            <img
                src={getMascotSrc(mood)}
                alt={`Mascot ${mood}`}
                style={{ width: size, height: 'auto' }}
                className=""
            />
        </motion.div>
    );
};

export default Mascot;

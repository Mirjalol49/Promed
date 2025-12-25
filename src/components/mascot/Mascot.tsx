import { motion, Variants } from 'framer-motion';

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
            case 'happy': return '/images/happy.png';
            case 'thinking': return '/images/thinking.png';
            case 'upset': return '/images/upset.png';
            case 'operation': return '/images/operation.png';
            case 'injection': return '/images/injection.png';
            default: return '/images/happy.png';
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
                className="drop-shadow-2xl"
            />
        </motion.div>
    );
};

export default Mascot;

import React, { useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface MascotImageProps extends HTMLMotionProps<"img"> {
    src: string;
    alt: string;
}

export const MascotImage: React.FC<MascotImageProps> = ({ src, alt, className, ...props }) => {
    const [error, setError] = useState(false);

    if (error) {
        // Return a tiny transparent placeholder to prevent layout shift 
        return <div className={className} style={{ visibility: 'hidden' }} />;
    }

    return (
        <motion.img
            src={src}
            alt={alt}
            className={className}
            onError={() => {
                console.error(`Mascot failed to load: ${src}`);
                setError(true);
            }}
            {...props}
        />
    );
};

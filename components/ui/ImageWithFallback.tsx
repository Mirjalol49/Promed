import React, { useState } from 'react';
import { User, Image as ImageIcon } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackSrc?: string;
    fallbackType?: 'user' | 'image'; // Determines the default icon if no fallbackSrc
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
    src,
    alt,
    className,
    fallbackSrc,
    fallbackType = 'image',
    ...props
}) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    const handleLoad = () => {
        setLoaded(true);
    };

    const handleError = () => {
        setError(true);
    };

    // If no source, or error occurred
    if (!src || error || src === '') {
        return (
            <div className={`flex items-center justify-center bg-slate-100 text-slate-300 ${className}`}>
                {fallbackType === 'user' ? <User size={24} /> : <ImageIcon size={24} />}
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Skeleton / Loading State */}
            {!loaded && (
                <div className="absolute inset-0 bg-slate-200 animate-pulse" />
            )}

            {/* Actual Image */}
            <img
                src={src}
                alt={alt}
                className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={handleLoad}
                onError={handleError}
                {...props}
            />
        </div>
    );
};

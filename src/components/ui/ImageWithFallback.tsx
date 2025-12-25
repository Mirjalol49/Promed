import React, { useState, useEffect, useRef } from 'react';
import { User, Image as ImageIcon } from 'lucide-react';
import { getOptimisticImage } from '../../lib/imageService';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackSrc?: string;
    fallbackType?: 'user' | 'image'; // Determines the default icon if no fallbackSrc
    optimisticId?: string; // Key to check in global optimistic cache
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
    src,
    alt,
    className,
    fallbackSrc,
    fallbackType = 'image',
    optimisticId,
    ...props
}) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [showOptimistic, setShowOptimistic] = useState(false);
    const optimisticUrl = optimisticId ? getOptimisticImage(optimisticId) : null;
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // If we have an optimistic URL, show it immediately
    useEffect(() => {
        if (optimisticUrl) {
            setShowOptimistic(true);
        }
    }, [optimisticUrl]);

    // 🔥 DEEP FIX: Reset states when src changes to bridge the sync gap
    useEffect(() => {
        if (src) {
            setLoaded(false);
            setError(false); // 🔥 CRITICAL: Reset error state so new src can attempt to load!
            if (optimisticUrl) {
                setShowOptimistic(true);
            }
        }
    }, [src, optimisticUrl]);

    const handleLoad = () => {
        setLoaded(true);
        // Add a small buffer before hiding optimistic overlay for perfect transition
        timerRef.current = setTimeout(() => {
            setShowOptimistic(false);
        }, 300);
    };

    const handleError = () => {
        setError(true);
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    // If no source, or error occurred
    if ((!src || error || src === '') && !optimisticUrl) {
        if (error) console.warn(`ImageWithFallback: Failed to load ${src || 'empty src'}`);
        return (
            <div className={`flex items-center justify-center bg-slate-100 text-slate-300 ${className}`}>
                {fallbackType === 'user' ? <User size={24} /> : <ImageIcon size={24} />}
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Skeleton / Loading State (only if no optimistic image) */}
            {!loaded && !showOptimistic && (
                <div className="absolute inset-0 bg-slate-200 animate-pulse" />
            )}

            {/* Optimistic Overlay (Local Blob) */}
            {showOptimistic && optimisticUrl && (
                <img
                    src={optimisticUrl}
                    alt="Optimistic Preview"
                    className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300"
                />
            )}

            {/* Actual Image (Remote URL) */}
            <img
                src={src || optimisticUrl || ''}
                alt={alt}
                className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={handleLoad}
                onError={handleError}
                {...props}
            />
        </div>
    );
};

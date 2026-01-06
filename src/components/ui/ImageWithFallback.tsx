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
    const imgRef = useRef<HTMLImageElement>(null);

    // If we have an optimistic URL, show it immediately
    useEffect(() => {
        if (optimisticUrl) {
            setShowOptimistic(true);
        }
    }, [optimisticUrl]);

    // Reset states when src changes
    useEffect(() => {
        if (src) {
            // Check if image is already loaded (cached)
            if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0 && imgRef.current.src === src) {
                setLoaded(true);
            } else {
                setLoaded(false);
            }

            setError(false);
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
        setLoaded(true); // Ensure we don't stay in loading state
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    // Check complete state on mount (for cached images)
    useEffect(() => {
        if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
            setLoaded(true);
        }
    }, []);

    // If no source, or logic says empty (but we need to be careful not to hide existing if valid)
    const isInvalid = !src || src === '';

    if ((isInvalid || error) && !optimisticUrl) {
        if (error) console.error(`Image fail: ${src}`);
        return (
            <div className={`flex flex-col items-center justify-center bg-slate-50 text-slate-400 border border-slate-100 ${className}`}>
                {fallbackType === 'user' ? <User size={40} strokeWidth={1.5} className="opacity-50" /> : <ImageIcon size={40} strokeWidth={1.5} className="opacity-50" />}
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
                ref={imgRef}
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

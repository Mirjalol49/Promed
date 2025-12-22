import React, { useState, useEffect, useRef } from 'react';
import { User } from 'lucide-react';
import { getOptimisticImage } from '../lib/imageService';

interface ProfileAvatarProps {
    src: string | null | undefined;
    alt: string;
    size?: number; // size in px, default 40
    className?: string; // extra classes
    fallbackType?: 'user' | 'clinic';
    optimisticId?: string;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
    src,
    alt,
    size = 40,
    className = "",
    fallbackType = 'user',
    optimisticId
}) => {
    const [imgSrc, setImgSrc] = useState<string | null>(src || null);
    const [hasError, setHasError] = useState(false);
    const [showOptimistic, setShowOptimistic] = useState(false);
    const optimisticUrl = optimisticId ? getOptimisticImage(optimisticId) : null;
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Sync prop changes to state
    useEffect(() => {
        setImgSrc(src || null);
        setHasError(false);
    }, [src]);

    // If we have an optimistic URL, show it immediately
    useEffect(() => {
        if (optimisticUrl) {
            setShowOptimistic(true);
        }
    }, [optimisticUrl]);

    // 🔥 DEEP FIX: Reset states when src changes
    useEffect(() => {
        if (src) {
            setHasError(false);
            if (optimisticUrl) {
                setShowOptimistic(true);
            }
        }
    }, [src, optimisticUrl]);

    const handleLoad = () => {
        // Add a small buffer before hiding optimistic overlay for perfect transition
        timerRef.current = setTimeout(() => {
            setShowOptimistic(false);
        }, 300);
    };

    const handleError = () => {
        setHasError(true);
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    // UI Avatar Fallback
    const getFallbackUrl = () => {
        const bg = fallbackType === 'user' ? '0D8ABC' : '10B981';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(alt || 'User')}&background=${bg}&color=fff&size=${size * 2}`;
    };

    const isShowingFallback = (!imgSrc || hasError) && !optimisticUrl;

    if (isShowingFallback) {
        return (
            <div
                className={`relative overflow-hidden rounded-full bg-slate-200 flex items-center justify-center ${className}`}
                style={{ width: size, height: size }}
            >
                <img
                    src={getFallbackUrl()}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />
                <div className="absolute inset-0 flex items-center justify-center z-[-1]">
                    <User size={size * 0.5} className="text-slate-400" />
                </div>
            </div>
        );
    }

    return (
        <div
            className={`relative overflow-hidden rounded-full border border-white/10 shadow-sm ${className}`}
            style={{ width: size, height: size }}
        >
            {/* Optimistic Overlay (Local Blob) */}
            {showOptimistic && optimisticUrl && (
                <img
                    src={optimisticUrl}
                    alt="Optimistic Preview"
                    className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300"
                />
            )}

            <img
                src={imgSrc || optimisticUrl || ''}
                alt={alt}
                className="w-full h-full object-cover"
                onLoad={handleLoad}
                onError={handleError}
            />
        </div>
    );
};

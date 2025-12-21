import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface ProfileAvatarProps {
    src: string | null | undefined;
    alt: string;
    size?: number; // size in px, default 40
    className?: string; // extra classes
    fallbackType?: 'user' | 'clinic';
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
    src,
    alt,
    size = 40,
    className = "",
    fallbackType = 'user'
}) => {
    const [imgSrc, setImgSrc] = useState<string | null>(src || null);
    const [hasError, setHasError] = useState(false);

    // Sync prop changes to state
    useEffect(() => {
        setImgSrc(src || null);
        setHasError(false);
    }, [src]);

    const handleError = () => {
        setHasError(true);
    };

    // UI Avatar Fallback
    const getFallbackUrl = () => {
        const bg = fallbackType === 'user' ? '0D8ABC' : '10B981';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(alt || 'User')}&background=${bg}&color=fff&size=${size * 2}`;
    };

    if (!imgSrc || hasError) {
        return (
            <div
                className={`relative overflow-hidden rounded-full bg-slate-200 flex items-center justify-center ${className}`}
                style={{ width: size, height: size }}
            >
                {/* Try UI Avatars first, if that fails (network), show Icon */}
                <img
                    src={getFallbackUrl()}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // If even UI avatar fails, hide generic img and show icon
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
            <img
                src={imgSrc}
                alt={alt}
                className="w-full h-full object-cover"
                onError={handleError}
            />
        </div>
    );
};

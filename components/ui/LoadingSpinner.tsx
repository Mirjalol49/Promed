import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    message?: string;
    fullScreen?: boolean;
}

/**
 * Delightful loading spinner matching ProMed design aesthetic
 * Medical-grade teal color with smooth animations
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    message,
    fullScreen = false
}) => {
    const sizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };

    const spinner = (
        <div className="flex flex-col items-center justify-center gap-3">
            {/* Animated spinner */}
            <div className="relative">
                <Loader2
                    className={`${sizeClasses[size]} text-promed.primary animate-spin`}
                    strokeWidth={2.5}
                />
                {/* Pulsing background glow */}
                <div className={`absolute inset-0 ${sizeClasses[size]} bg-promed.primary/20 rounded-full blur-xl animate-pulse`} />
            </div>

            {/* Optional message */}
            {message && (
                <p className="text-sm font-medium text-slate-600 animate-pulse">
                    {message}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                {spinner}
            </div>
        );
    }

    return spinner;
};

/**
 * Inline loading state for buttons
 */
export const ButtonLoader: React.FC = () => (
    <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} />
);

/**
 * Skeleton loader for cards
 */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`}>
        <div className="p-6 space-y-4">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
    </div>
);

/**
 * Progress bar loader
 */
export const ProgressLoader: React.FC<{ progress?: number; message?: string }> = ({
    progress = 0,
    message
}) => (
    <div className="w-full space-y-2">
        <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">{message || 'Processing...'}</span>
            <span className="text-sm font-bold text-promed.primary">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
                className="h-full bg-gradient-to-r from-promed.primary to-teal-400 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress}%` }}
            />
        </div>
    </div>
);

export default LoadingSpinner;

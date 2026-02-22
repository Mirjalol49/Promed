import { Loader2 } from 'lucide-react';
import Lottie from 'lottie-react';
import { useLanguage } from '../../contexts/LanguageContext';
import loadingAnimation from '../../assets/images/mascots/loading.json';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
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
    const { t } = useLanguage();

    const sizeClasses = {
        sm: 'w-12 h-12',
        md: 'w-24 h-24',
        lg: 'w-32 h-32',
        xl: 'w-40 h-40',
        xxl: 'w-48 h-48'
    };

    const containerSize = sizeClasses[size] || sizeClasses.md;

    const spinner = (
        <div className="flex flex-col items-center justify-center text-center">
            {/* Animated Mascot Spinner */}
            <div className={`flex items-center justify-center ${containerSize}`}>
                <Lottie
                    animationData={loadingAnimation}
                    loop={true}
                    autoplay={true}
                    className="w-full h-full"
                />
            </div>

            {/* Optional message */}
            <p className="text-sm md:text-base font-bold text-slate-500 tracking-tight mt-2 animate-pulse">
                {message || t('loading_pleasewait') || 'Iltimos kuting...'}
            </p>
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
    <div className="w-5 h-5 flex items-center justify-center text-white">
        <Loader2 className="w-4 h-4 animate-spin [animation-duration:800ms]" />
    </div>
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

import React from 'react';
import Lottie from 'lottie-react';
import proAnimation from '../../assets/images/pro.json';

interface ProBadgeProps {
    className?: string; // Additional classes for positioning/styling
    size?: number;     // Size of the badge in pixels
}

export const ProBadge: React.FC<ProBadgeProps> = ({ className = '', size = 50 }) => {
    // Debug log to confirm render
    // console.log('ProBadge rendering with size:', size); 
    return (
        <div className={`flex items-center justify-center ${className}`}>
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <Lottie
                    animationData={proAnimation}
                    loop={true}
                    autoplay={true}
                    style={{ width: '100%', height: '100%' }}
                    rendererSettings={{
                        preserveAspectRatio: 'xMidYMid meet'
                    }}
                />
            </div>
        </div>
    );
};

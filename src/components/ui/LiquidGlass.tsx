import React from 'react';

interface LiquidGlassWrapperProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'card' | 'widget' | 'panel' | 'button';
}

/**
 * LiquidGlass wrapper component - macOS style liquid glass effect
 * Uses SVG distortion filter and multi-layer structure for authentic glass look
 */
export const LiquidGlass: React.FC<LiquidGlassWrapperProps> = ({
    children,
    className = '',
    variant = 'card'
}) => {
    const variantClass = `liquidGlass-${variant}`;

    return (
        <div className={`${variantClass} ${className}`}>
            {/* Glass Effect Layer - SVG Distortion + Backdrop Blur */}
            <div className="liquidGlass-effect" />

            {/* Glass Tint Layer - Semi-transparent white overlay */}
            <div className="liquidGlass-tint" />

            {/* Glass Shine Layer - Inset highlights for depth */}
            <div className="liquidGlass-shine" />

            {/* Content Layer - Actual content sits above glass layers */}
            <div className="liquidGlass-content">
                {children}
            </div>
        </div>
    );
};

export default LiquidGlass;

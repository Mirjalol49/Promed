import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
// @ts-ignore
import confettiSoundUrl from '../../assets/sounds/confetti.mp3';

interface CelebrationOverlayProps {
    isVisible?: boolean; // Optional now, since presence is controlled by parent render
    onComplete: () => void;
}

interface CelebrationOverlayProps {
    isVisible?: boolean;
    onComplete: () => void;
    origin?: { x: number, y: number }; // Optional origin coordinates
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
    onComplete,
    origin
}) => {
    useEffect(() => {
        // Fire immediately on mount. 
        // The parent component controls "when" to mount this component using a unique 'key'.

        // Debug
        console.log("CelebrationOverlay MOUNTED - Firing Confetti!");

        // 1. Play Sound
        try {
            const audio = new Audio(confettiSoundUrl);
            audio.volume = 0.6;
            audio.play().catch(e => console.error("Audio playback failure:", e));
        } catch (e) {
            console.error("Audio setup failure:", e);
        }

        // 2. Setup Confetti - Fireworks style
        // Apple-style color palette 
        const colors = ['#007AFF', '#FF3B30', '#FF9500', '#34C759', '#AF52DE'];
        const particleCount = 100; // Reduced count for "smaller" feel

        // Use provided origin or default to bottom center
        // Note: canvas-confetti expects 0-1 range. If exact pixel coords are passed, we might need to normalize,
        // but typically for "button match" we might just want to guide it generally or use the canvas confetti 'origin' option carefully.
        // If x/y are passed as 0-1 ratios:
        const confettiOrigin = origin ? { x: origin.x, y: origin.y } : { y: 1, x: 0.5 };

        console.log("Firing confetti from:", confettiOrigin);

        const defaults = {
            origin: confettiOrigin,
            zIndex: 99999,
            colors: colors,
            disableForReducedMotion: false,
            gravity: 1.2, // Higher gravity for faster fall
            ticks: 200,
            scalar: 0.8, // Smaller particles
            shapes: ['circle'] as confetti.Shape[],
        };

        function fire(particleRatio: number, opts: confetti.Options) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(particleCount * particleRatio)
            });
        }

        // 3. Fire Sequence - More "burst" like from the button
        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60, startVelocity: 45 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });

        // 4. Cleanup/Dismiss
        const timer = setTimeout(() => {
            onComplete();
        }, 2000);

        return () => {
            clearTimeout(timer);
        };
    }, []); // Empty dependency array = run once on mount

    return null;
};

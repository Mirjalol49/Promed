import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
// @ts-ignore
import confettiSoundUrl from '../../assets/sounds/confetti.mp3';

interface CelebrationOverlayProps {
    isVisible?: boolean; // Optional now, since presence is controlled by parent render
    onComplete: () => void;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
    onComplete,
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

        // 2. Setup Confetti - Fireworks style from bottom center
        // Apple-style color palette 
        const colors = ['#007AFF', '#FF3B30', '#FF9500', '#34C759', '#AF52DE'];
        const count = 200;
        const defaults = {
            origin: { y: 1, x: 0.5 }, // Bottom center
            zIndex: 99999,
            colors: colors,
            disableForReducedMotion: false,
            gravity: 0.8,
            ticks: 300
        };

        function fire(particleRatio: number, opts: confetti.Options) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio)
            });
        }

        // 3. Fire Sequence - Fireworks shooting upward
        fire(0.3, { spread: 40, startVelocity: 80, angle: 90 });
        fire(0.25, { spread: 50, startVelocity: 90, angle: 90, decay: 0.9 });
        fire(0.2, { spread: 70, startVelocity: 100, angle: 90, scalar: 1.2 });
        fire(0.15, { spread: 90, startVelocity: 85, angle: 90, decay: 0.88 });
        fire(0.1, { spread: 110, startVelocity: 75, angle: 90, scalar: 0.8 });

        // 4. Cleanup/Dismiss
        const timer = setTimeout(() => {
            onComplete();
        }, 3000);

        return () => {
            clearTimeout(timer);
        };
    }, []); // Empty dependency array = run once on mount

    return null;
};

import useSound from 'use-sound';
import { useSettings } from '../contexts/SettingsContext';

// Import sound files
// @ts-ignore
import confettiSound from '../assets/sounds/confetti.mp3';
// @ts-ignore
import notificationSound from '../assets/sounds/notification.mp3';
// @ts-ignore
import unlockSound from '../assets/sounds/unlock.mp3';
// @ts-ignore
import lockSound from '../assets/sounds/lock.mp3';

// @ts-ignore
import toasterSound from '../assets/sounds/toaster.mp3';
// @ts-ignore
import wrongSound from '../assets/sounds/wrong.mp3';

export const useAppSounds = () => {
    const { soundEnabled } = useSettings();
    const [playConfetti] = useSound(confettiSound, { volume: 0.5 });
    const [playNotification, { stop: stopNotification }] = useSound(notificationSound, { volume: 0.5 });
    const [playToaster] = useSound(toasterSound, { volume: 0.5 });
    const [playUnlock] = useSound(unlockSound, { volume: 0.5 });
    const [playLock] = useSound(lockSound, { volume: 0.5 });
    const [playError] = useSound(wrongSound, { volume: 0.5 });

    const playIfEnabled = (playFn: () => void) => {
        if (soundEnabled) playFn();
    };

    return {
        playConfetti: () => playIfEnabled(playConfetti),
        playNotification: () => playIfEnabled(playNotification),
        playToaster: () => playIfEnabled(playToaster),
        stopNotification,
        playUnlock: () => playIfEnabled(playUnlock),
        playLock: () => playIfEnabled(playLock),
        playError: () => playIfEnabled(playError),
        playPop: () => playIfEnabled(playUnlock), // Alias for pop
        playThud: () => playIfEnabled(playLock), // Alias for thud
    };
};

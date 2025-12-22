import { useEffect } from 'react';

/**
 * Hook to lock the body scroll when a component is mounted or a condition is met.
 * @param isLocked - Boolean to determine if scroll should be locked.
 */
export const useScrollLock = (isLocked: boolean) => {
    useEffect(() => {
        if (!isLocked) return;

        // Save original overflow style
        const originalStyle = window.getComputedStyle(document.body).overflow;

        // Lock scroll
        document.body.style.overflow = 'hidden';

        // Unlock on cleanup
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, [isLocked]);
};

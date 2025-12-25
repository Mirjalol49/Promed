import { useEffect } from 'react';

const preloadImage = (src: string) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = resolve;
        img.onerror = reject;
    });
};

export const useImagePreloader = (imageUrls: string[]) => {
    useEffect(() => {
        if (!imageUrls || imageUrls.length === 0) return;

        // Use Set to avoid duplicates
        const uniqueUrls = [...new Set(imageUrls)].filter(url => url && url.length > 0);

        // Preload images in background
        uniqueUrls.forEach(url => {
            // Intentionally not awaiting. We want fire-and-forget preloading.
            preloadImage(url).catch(err => {
                // Silent failure is fine for preloading
                // console.warn('Failed to preload image', url); 
            });
        });
    }, [imageUrls]); // Re-run if list changes significantly (React handles array diffing)
};

import imageCompression from 'browser-image-compression';

/**
 * Compress image files before upload to reduce bandwidth and storage costs.
 * 
 * Compresses images to ~200-500KB while maintaining good visual quality.
 * Uses Web Workers to keep UI responsive during compression.
 * 
 * @param file - The original image file
 * @returns Compressed image file
 * 
 * @example
 * const compressedFile = await compressImage(originalFile);
 * // Upload compressedFile instead of originalFile
 */
export async function compressImage(file: File): Promise<File> {
    const options = {
        maxSizeMB: 1,                 // 1MB allows good quality
        maxWidthOrHeight: 1280,       // Safe resolution to prevent browser crashes on big files
        useWebWorker: true,
        initialQuality: 0.8,
        maxIteration: 10,
    };

    try {
        const originalSizeMB = file.size / 1024 / 1024;
        console.log(`📸 Compressing ${file.name} (${originalSizeMB.toFixed(2)}MB)...`);

        // Extra check: if file is already small, don't compress
        if (originalSizeMB < 0.2) {
            console.log('⚡ File already small (<200KB), skipping compression.');
            return file;
        }

        // Race condition: If compression takes > 3s or fails, use original
        const compressionPromise = imageCompression(file, options);
        const timeoutPromise = new Promise<File>((_, reject) => {
            setTimeout(() => reject(new Error('TIMEOUT')), 3000);
        });

        const compressedFile = await Promise.race([compressionPromise, timeoutPromise]);

        const compressedSizeMB = compressedFile.size / 1024 / 1024;
        const savingsPercent = ((1 - compressedSizeMB / originalSizeMB) * 100).toFixed(0);

        console.log(
            `✓ Image compressed: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB (${savingsPercent}% reduction)`
        );

        return compressedFile;
    } catch (error: any) {
        if (error.message === 'TIMEOUT') {
            console.warn('⚠️ Compression timed out (3s). Uploading original to ensure speed.');
        } else {
            console.error('❌ Image compression failed:', error);
        }
        return file;
    }
}

/**
 * Check if a file is an image
 */
export function isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

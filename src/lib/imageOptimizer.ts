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


export function isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
}

export function isVideoFile(file: File): boolean {
    if (file.type.startsWith('video/')) return true;
    const name = file.name.toLowerCase();
    return name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.webm') || name.endsWith('.avi');
}

export function isVideoUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    // Check for common video extensions or data URI
    const lower = url.toLowerCase();

    // ignore query parameters to match base URL
    const withoutQuery = lower.split('?')[0].split('#')[0];

    return withoutQuery.endsWith('.mp4') ||
        withoutQuery.endsWith('.webm') ||
        withoutQuery.endsWith('.mov') ||
        withoutQuery.endsWith('.ogg') ||
        lower.includes('video/'); // Data URIs
}

/**
 * Compress video files.
 * Note: Real in-browser video compression requires heavy libraries (ffmpeg.wasm).
 * For now, we perform basic checks and return the file.
 * In a production environment, this should ideally be handled by a backend service.
 */
export async function compressVideo(file: File): Promise<File> {
    console.log(`🎥 Processing video: ${file.name} (${formatFileSize(file.size)})`);

    // Basic size check - warn if too large (e.g., > 100MB)
    if (file.size > 100 * 1024 * 1024) {
        console.warn('⚠️ Video is larger than 100MB. Upload might be slow.');
        // We could throw an error here if we want to enforce limits
    }

    // Return original until we have ffmpeg.wasm or a backend
    return file;
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


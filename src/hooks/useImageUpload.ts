
import { useState, useCallback, ChangeEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { compressImage } from '../lib/imageOptimizer';
import { useToast } from '../contexts/ToastContext';

interface UseImageUploadOptions {
    bucketName?: string;
    pathPrefix?: string;
    onUploadComplete?: (url: string) => void;
    onUploadError?: (error: any) => void;
}

interface UseImageUploadResult {
    previewUrl: string | null;
    uploading: boolean;
    progress: number;
    handleImageSelect: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
    uploadedUrl: string | null;
    reset: () => void;
}

export const useImageUpload = (options: UseImageUploadOptions = {}): UseImageUploadResult => {
    const {
        bucketName = 'promed-images',
        pathPrefix = 'public',
        onUploadComplete,
        onUploadError
    } = options;

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const { error: showError } = useToast();

    const handleImageSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Step A: Instant Preview (The "Magic")
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        // 2. Set loading state locally (visual feedback)
        setUploading(true);
        setProgress(0);

        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return 90;
                return prev + 10;
            });
        }, 100);

        // 3. THE FIX: Wrap the heavy lifting in a setTimeout
        // This forces the browser to "paint" the previewUrl to the screen 
        // BEFORE it starts the heavy CPU work of compression.
        // 50ms is the "sweet spot" for UI responsiveness
        setTimeout(async () => {
            try {
                // Step B: The "Secret" Compression
                const compressedFile = await compressImage(file);

                // Step C: Background Upload
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${pathPrefix}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from(bucketName)
                    .upload(filePath, compressedFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from(bucketName)
                    .getPublicUrl(filePath);

                const publicUrl = data.publicUrl;

                // Complete
                clearInterval(progressInterval);
                setProgress(100);
                setUploadedUrl(publicUrl);
                onUploadComplete?.(publicUrl);

            } catch (err: any) {
                clearInterval(progressInterval);
                console.error('Upload failed:', err);
                showError('Upload Failed', 'Could not upload image. Please try again.');
                onUploadError?.(err);
            } finally {
                setUploading(false);
            }
        }, 10); // 10ms delay is enough to let React render the preview
    }, [bucketName, pathPrefix, onUploadComplete, onUploadError, showError]);

    const reset = useCallback(() => {
        setPreviewUrl(null);
        setUploadedUrl(null);
        setUploading(false);
        setProgress(0);
    }, []);

    return {
        previewUrl,
        uploading,
        progress,
        handleImageSelect,
        uploadedUrl,
        reset
    };
};


import { useState, useCallback, ChangeEvent } from 'react';
import { storage } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../lib/imageOptimizer';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import upsetIcon from '../components/mascot/upseet_mascot.png';

interface UseImageUploadOptions {
    bucketName?: string; // Kept for compatibility but implicitly used via ref paths
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
        bucketName = 'promed-images', // Used as base folder if needed
        pathPrefix = 'public',
        onUploadComplete,
        onUploadError
    } = options;

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const { error: showError } = useToast();
    const { t } = useLanguage();

    const handleImageSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Step A: Instant Preview (The "Magic")
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        // 2. Set loading state locally (visual feedback)
        setUploading(true);
        setProgress(0);

        // 3. THE FIX: Wrap the heavy lifting in a setTimeout
        // This forces the browser to "paint" the previewUrl to the screen 
        // BEFORE it starts the heavy CPU work of compression.
        // 50ms is the "sweet spot" for UI responsiveness
        setTimeout(async () => {
            try {
                // Step B: The "Secret" Compression
                const compressedFile = await compressImage(file);

                // Step C: Firebase Hub Upload
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                // Construct path: bucketName/pathPrefix/filename or just pathPrefix/filename
                // Firebase Storage uses a single bucket structure usually.
                // We'll treat bucketName as a root folder if it's meant to simulate "buckets" in one physical bucket.
                const filePath = `${pathPrefix}/${fileName}`;

                const storageRef = ref(storage, filePath);
                const uploadTask = uploadBytesResumable(storageRef, compressedFile, {
                    cacheControl: 'public,max-age=3600',
                    contentType: compressedFile.type
                });

                uploadTask.on('state_changed',
                    (snapshot) => {
                        const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setProgress(Math.round(prog));
                    },
                    (errorSnapshot) => {
                        console.error('Upload failed:', errorSnapshot);
                        setUploading(false);
                        showError(t('toast_error_title'), `${t('toast_upload_failed')}: ${errorSnapshot.code}`, upsetIcon);
                        onUploadError?.(errorSnapshot);
                    },
                    async () => {
                        // Complete
                        const publicUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        setProgress(100);
                        setUploadedUrl(publicUrl);
                        setUploading(false);
                        onUploadComplete?.(publicUrl);
                    }
                );

            } catch (err: any) {
                console.error('Compression/Init failed:', err);
                setUploading(false);
                showError(t('toast_error_title'), t('toast_upload_failed'), upsetIcon);
                onUploadError?.(err);
            }
        }, 10); // 10ms delay is enough to let React render the preview
    }, [bucketName, pathPrefix, onUploadComplete, onUploadError, showError, t]);

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

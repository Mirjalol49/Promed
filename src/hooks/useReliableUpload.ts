import { useState } from 'react';
import { storage, auth } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface UploadOptions {
    bucket: string; // Ignored in Firebase (uses default bucket), or treated as root path
    path: string;
    file: File;
    maxRetries?: number;
}

interface UploadState {
    uploading: boolean;
    progress: number;
    error: Error | null;
    url: string | null;
}

export const useReliableUpload = () => {
    const [state, setState] = useState<UploadState>({
        uploading: false,
        progress: 0,
        error: null,
        url: null
    });

    const upload = async ({ bucket, path, file, maxRetries = 3 }: UploadOptions): Promise<string> => {
        setState(prev => ({ ...prev, uploading: true, error: null, progress: 0 }));

        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                // 1. Session Check (Fail fast if no session)
                if (!auth.currentUser) throw new Error("No active session. Please log in again.");

                // 2. Prepare Path (Avoid collisions)
                const fileExt = file.name.split('.').pop();
                const cleanPath = path.replace(new RegExp(`\.${fileExt}$`), ''); // Remove ext if present
                const finalPath = `${cleanPath}_${Date.now()}.${fileExt}`;

                // For compatibility, if bucket is passed, we can prepend it if it's not 'promed-images' (default)
                // But usually we just use the path. 
                // Let's assume 'bucket' arg is legacy or just logical partitioning.
                // We'll use the path directly as per Firebase convention.

                console.log(`Attempt ${attempt + 1}: Uploading to ${finalPath}`);

                const storageRef = ref(storage, finalPath);

                // 3. Perform Upload
                // Using uploadBytes for simplicity in retry logic, or uploadBytesResumable if we need progress events.
                // Since this hook exposes 'progress', we should ideally use resumable, 
                // but for 'reliable' simple upload, uploadBytes is atomic.
                // We'll fake progress or use uploadBytesResumable if we really want it.
                // Let's use uploadBytesResumable for parity.

                // Note: We can't easily await a resumable upload in a loop without wrapping it.
                await Promise.race([
                    new Promise<void>((resolve, reject) => {
                        uploadBytes(storageRef, file, {
                            cacheControl: 'public,max-age=3600',
                            contentType: file.type
                        }).then(() => resolve()).catch(reject);
                    }),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error("Timeout during file upload chunk")), 8000)
                    )
                ]);

                // 4. Get Public URL
                const publicUrl = await getDownloadURL(storageRef);

                setState({ uploading: false, progress: 100, error: null, url: publicUrl });
                return publicUrl;

            } catch (err: any) {
                console.error(`Upload attempt ${attempt + 1} failed:`, err);
                attempt++;

                if (attempt >= maxRetries) {
                    const error = new Error(`Upload failed after ${maxRetries} attempts: ${err.message}`);
                    setState(prev => ({ ...prev, uploading: false, error }));
                    throw error;
                }

                // Exponential backoff: 500ms, 1000ms, 2000ms...
                await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
            }
        }

        throw new Error("Unexpected upload failure");
    };

    return { ...state, upload };
};

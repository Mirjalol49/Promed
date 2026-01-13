import { useState, useRef, useCallback } from 'react';
import { transcribeAudioWithAI } from '../services/aiTranscriptionService';

export interface UseAIDictationReturn {
    isRecording: boolean;
    isProcessing: boolean;
    transcript: string;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    error: string | null;
    resetTranscript: () => void;
}

export const useAIDictation = (): UseAIDictationReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Should verify MIME type support
            let options: MediaRecorderOptions = {};
            if (MediaRecorder.isTypeSupported('audio/webm')) {
                options = { mimeType: 'audio/webm' };
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                options = { mimeType: 'audio/mp4' };
            }

            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);

        } catch (err: any) {
            console.error("Microphone Access Error:", err);
            setError("Microphone access denied or not supported.");
        }
    }, []);

    const stopRecording = useCallback(async () => {
        return new Promise<void>((resolve) => {
            const recorder = mediaRecorderRef.current;
            if (!recorder || recorder.state === 'inactive') {
                resolve();
                return;
            }

            setIsRecording(false);
            setIsProcessing(true); // Start processing UI

            recorder.onstop = async () => {
                try {
                    // 1. Create Blob
                    const blob = new Blob(chunksRef.current, { type: recorder.mimeType });

                    // 2. Convert to Base64
                    const base64 = await blobToBase64(blob);

                    // 3. Call Isolated Service
                    const text = await transcribeAudioWithAI(base64);

                    if (text) {
                        setTranscript(prev => prev + ' ' + text);
                    }

                } catch (err: any) {
                    console.error("Transcription Failed:", err);
                    setError("AI Transcription failed. Please try again.");
                } finally {
                    setIsProcessing(false);

                    // Stop all tracks to release mic
                    if (recorder.stream) {
                        recorder.stream.getTracks().forEach(track => track.stop());
                    }
                    resolve();
                }
            };

            recorder.stop();
        });
    }, []);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setError(null);
    }, []);

    return {
        isRecording,
        isProcessing,
        transcript,
        startRecording,
        stopRecording,
        error,
        resetTranscript
    };
};

// Helper: Blob to Base64 (cleaned for sending)
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove "data:audio/webm;base64," prefix
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

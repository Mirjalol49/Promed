import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSpeechRecognitionProReturn {
    isListening: boolean;
    transcript: string;
    startRecording: (lang?: string) => void;
    stopRecording: () => void;
    resetTranscript: () => void;
    error: string | null;
    isSupported: boolean;
}

export const useSpeechRecognitionPro = (): UseSpeechRecognitionProReturn => {
    // UI State
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);

    // Internal Refs to manage the singleton instance and data stream
    const recognitionRef = useRef<any>(null);
    const finalTranscriptRef = useRef(''); // Stores fully finalized sentences
    const processedIndicesRef = useRef<Set<number>>(new Set()); // Tracks result indices we have already processed to prevent dupes
    const isIntentionalStopRef = useRef(false); // Tracks if the USER stopped it (vs browser auto-stop)

    // Initialize support check
    useEffect(() => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            setIsSupported(true);
        }
    }, []);

    const stopRecording = useCallback(() => {
        isIntentionalStopRef.current = true; // Mark as user-initiated
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // Ignore if already stopped
            }
        }
        setIsListening(false);
    }, []);

    const startRecording = useCallback((lang: string = 'uz-UZ') => {
        if (!isSupported) {
            setError('Browser not supported');
            return;
        }

        isIntentionalStopRef.current = false; // Reset intent

        // Cleanup any existing instance
        if (recognitionRef.current) {
            // We manually stop, but don't want to trigger the "end" restart logic
            // So we can temporary set intent to true? No, startRecording implies a fresh start.
            try {
                recognitionRef.current.onend = null; // Remove handler to prevent double-restart logic
                recognitionRef.current.stop();
            } catch (e) { }
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;

        // Note: We DO NOT reset transcript here if maintaining session
        // But for the hook's contract, startRecording usually means "New Session" or "Resume"?
        // In AddNoteModal, we handle resumption by keeping "previousContent".
        // So safe to clear internal hook buffers.
        finalTranscriptRef.current = '';
        processedIndicesRef.current = new Set();
        setTranscript('');
        setError(null);

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onend = () => {
            // Check if user stopped it explicitly
            if (isIntentionalStopRef.current) {
                setIsListening(false);
            } else {
                // Browser stopped it (silence, timeout, error) -> Restart
                // console.log("Auto-restarting speech recognition...");
                try {
                    recognition.start();
                } catch (e) {
                    // console.error("Failed to restart:", e);
                    setIsListening(false);
                    setError('Connection lost. Please try again.');
                }
            }
        };

        recognition.onerror = (event: any) => {
            // console.error('Speech API Error:', event.error);
            if (event.error === 'no-speech') {
                // Stay listening, let onend restart it
                return;
            }
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                isIntentionalStopRef.current = true; // Force stop
                setError('Microphone access denied.');
                setIsListening(false);
            }
            if (event.error === 'network') {
                // Maybe retry?
                // Let onend handle restart if possible, or show error
            }
        };

        recognition.onresult = (event: any) => {
            let interimContent = '';
            let newFinalContent = '';

            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                const transcriptSegment = result[0].transcript;

                if (result.isFinal) {
                    if (!processedIndicesRef.current.has(i)) {
                        newFinalContent += transcriptSegment;
                        // Smart spacing
                        if (!transcriptSegment.endsWith(' ')) {
                            newFinalContent += ' ';
                        }
                        processedIndicesRef.current.add(i);
                        finalTranscriptRef.current += transcriptSegment + ' ';
                    }
                } else {
                    interimContent += transcriptSegment;
                }
            }

            const cleanFinal = finalTranscriptRef.current.replace(/\s+/g, ' ').trim();
            const cleanInterim = interimContent.replace(/\s+/g, ' ').trim();

            // Only add space if needed
            const spacer = (cleanFinal && cleanInterim && !cleanFinal.endsWith(' ')) ? ' ' : '';
            const display = cleanFinal + (cleanInterim ? spacer + cleanInterim : '');

            setTranscript(display);
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.error(e);
        }

    }, [isSupported, stopRecording]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        finalTranscriptRef.current = '';
        processedIndicesRef.current.clear();
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isIntentionalStopRef.current = true;
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) { }
            }
        };
    }, []);

    return {
        isListening,
        transcript,
        startRecording,
        stopRecording,
        resetTranscript,
        error,
        isSupported
    };
};

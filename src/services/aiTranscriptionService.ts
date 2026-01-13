import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';

export const transcribeAudioWithAI = async (audioBase64: string, language?: string): Promise<string> => {
    try {
        const functions = getFunctions(app);
        const transcribe = httpsCallable(functions, 'transcribeAudio');

        const result: any = await transcribe({
            audioBase64,
            language // Optional, backend handles auto-detect if undefined
        });

        if (result.data && result.data.text) {
            return result.data.text;
        }
        throw new Error("No text returned from AI");
    } catch (error) {
        console.error("AI Transcription Service Error:", error);
        throw error;
    }
};

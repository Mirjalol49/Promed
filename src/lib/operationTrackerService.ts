import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface TrackerStep {
    id: string;
    title: string;
    doctor: string;
    durationMinutes: number;
}

export interface OperationTrackerState {
    steps: TrackerStep[];
    status: 'setup' | 'running' | 'completed';
    currentStepIndex: number;
    stepStartTime: number | null;
}

export const subscribeToTracker = (
    patientId: string,
    onData: (data: OperationTrackerState | null) => void,
    onError?: (error: any) => void
) => {
    try {
        const trackerRef = doc(db, 'operationTrackers', patientId);

        return onSnapshot(
            trackerRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    onData(docSnap.data() as OperationTrackerState);
                } else {
                    onData(null);
                }
            },
            (error) => {
                console.error("Error substituting to tracker:", error);
                if (onError) onError(error);
            }
        );
    } catch (e) {
        if (onError) onError(e);
        return () => { };
    }
};

export const updateTracker = async (patientId: string, state: OperationTrackerState) => {
    try {
        const trackerRef = doc(db, 'operationTrackers', patientId);
        await setDoc(trackerRef, state);
    } catch (error) {
        console.error("Error updating tracker in Firebase:", error);
        throw error;
    }
};

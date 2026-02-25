import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface TrackerStep {
    id: string;
    title: string;
    doctor: string;
    durationMinutes: number;
}

export interface OperationSession {
    id: string;
    name: string;
    steps: TrackerStep[];
    status: 'setup' | 'running' | 'completed';
    currentStepIndex: number;
    stepStartTime: number | null;
}

export interface OperationTrackerData {
    activeSessionId: string;
    sessions: OperationSession[];
}

export const subscribeToTracker = (
    patientId: string,
    onData: (data: OperationTrackerData | null) => void,
    onError?: (error: any) => void
) => {
    try {
        const trackerRef = doc(db, 'operationTrackers', patientId);

        return onSnapshot(
            trackerRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.sessions) {
                        onData(data as OperationTrackerData);
                    } else {
                        // Migrate old flat format to new session format
                        onData({
                            activeSessionId: 'session_1',
                            sessions: [{
                                id: 'session_1',
                                name: 'Seans 1',
                                steps: data.steps || [],
                                status: data.status || 'setup',
                                currentStepIndex: data.currentStepIndex || 0,
                                stepStartTime: data.stepStartTime || null
                            }]
                        });
                    }
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

export const updateTracker = async (patientId: string, state: OperationTrackerData) => {
    try {
        const trackerRef = doc(db, 'operationTrackers', patientId);
        await setDoc(trackerRef, state);
    } catch (error) {
        console.error("Error updating tracker in Firebase:", error);
        throw error;
    }
};

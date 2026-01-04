import { db } from './firebase';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    getDocs,
    writeBatch
} from 'firebase/firestore';

export interface SystemAlert {
    id: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'danger' | 'success';
    is_active: boolean;
    created_at: string;
}

/**
 * Subscribe to the most recent system alerts
 */
export const subscribeToSystemAlerts = (
    onUpdate: (alerts: SystemAlert[]) => void,
    onError?: (error: any) => void
) => {
    const q = query(
        collection(db, "system_alerts"),
        orderBy("created_at", "desc"),
        limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const alerts: SystemAlert[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                content: data.content,
                type: data.type,
                is_active: data.is_active,
                created_at: data.created_at
            };
        });
        onUpdate(alerts);
    }, (error) => {
        console.error("System alerts subscription error:", error);
        if (onError) onError(error);
    });

    return () => {
        unsubscribe();
    };
};

/**
 * Admin: Broadcast a new message
 */
export const broadcastAlert = async (alert: {
    title: string;
    content: string;
    type: 'info' | 'warning' | 'danger' | 'success';
}): Promise<void> => {
    // First, deactivate all previous alerts
    const q = query(collection(db, "system_alerts"), where("is_active", "==", true));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    snapshot.forEach(doc => {
        batch.update(doc.ref, { is_active: false });
    });

    // Commit deactivations
    await batch.commit();

    // Add new alert
    await addDoc(collection(db, "system_alerts"), {
        ...alert,
        is_active: true,
        created_at: new Date().toISOString()
    });
};

/**
 * Admin: Clear current alert
 */
export const clearAlerts = async (): Promise<void> => {
    const q = query(collection(db, "system_alerts"), where("is_active", "==", true));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    snapshot.forEach(doc => {
        batch.update(doc.ref, { is_active: false });
    });

    await batch.commit();
};

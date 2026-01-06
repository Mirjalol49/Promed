import { db, auth } from './firebase';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    getDocs,
    writeBatch,
    doc
} from 'firebase/firestore';

export interface SystemAlert {
    id: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'danger' | 'success';
    category?: 'billing' | 'congratulations' | 'message';
    is_active: boolean;
    created_at: string;
    viewed_at?: string;
    is_read?: boolean;
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
        limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const alerts: SystemAlert[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                content: data.content,
                type: data.type,
                category: data.category,
                is_active: data.is_active,
                created_at: data.created_at,
                viewed_at: data.viewed_at,
                is_read: data.is_read
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
    category?: 'billing' | 'congratulations' | 'message';
}): Promise<void> => {
    console.log("📣 broadcastAlert: current user:", auth.currentUser?.uid);
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


/**
 * Admin: Send targeted notifications to specific users
 */
export const sendTargetedNotifications = async (userIds: string[], alert: {
    title: string;
    content: string;
    type: 'info' | 'warning' | 'danger' | 'success';
    category: 'billing' | 'congratulations' | 'message';
}): Promise<void> => {
    console.log("📣 sendTargetedNotifications: current user:", auth.currentUser?.uid);
    const batch = writeBatch(db);
    const createdAt = new Date().toISOString();

    userIds.forEach(userId => {
        const docRef = doc(collection(db, "notifications"));
        batch.set(docRef, {
            ...alert,
            userId,
            is_active: true,
            is_read: false,
            created_at: createdAt,
            viewed_at: null
        });
    });

    await batch.commit();
};

/**
 * Subscribe to user-specific notifications
 */
export const subscribeToUserNotifications = (
    userId: string,
    onUpdate: (alerts: SystemAlert[]) => void,
    onError?: (error: any) => void
) => {
    if (!userId) return () => { };

    const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId)
        // Removed complex filters/sorts to avoid needing a custom index immediately
        // where("is_active", "==", true),
        // orderBy("created_at", "desc"),
        // limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const alerts: SystemAlert[] = snapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    content: data.content,
                    type: data.type,
                    is_active: data.is_active,
                    created_at: data.created_at,
                    viewed_at: data.viewed_at,
                    is_read: data.is_read,
                    // @ts-ignore
                    category: data.category
                };
            })
            // Client-side filtering and sorting
            .filter(a => a.is_active === true)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 20);

        onUpdate(alerts);
    }, (error) => {
        console.error("User notifications subscription error:", error);
        if (onError) onError(error);
    });

    return () => {
        unsubscribe();
    };
};

/**
 * Mark a notification as invisible/inactive for the user
 */
export const dismissNotification = async (notificationId: string): Promise<void> => {
    const docRef = doc(db, "notifications", notificationId);
    await writeBatch(db).update(docRef, { is_active: false }).commit();
};

/**
 * Mark all unread/unviewed notifications for a user as viewed
 * This is triggered when the notification bell is opened
 */
export const markUserNotificationsAsViewed = async (userId: string): Promise<void> => {
    if (!userId) return;

    const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("is_active", "==", true),
        where("viewed_at", "==", null)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    const viewedAt = new Date().toISOString();

    snapshot.forEach(doc => {
        batch.update(doc.ref, {
            viewed_at: viewedAt,
            is_read: true
        });
    });

    await batch.commit();
};

/**
 * Permanently delete notifications that were viewed more than 24 hours ago
 */
export const deleteExpiredUserNotifications = async (userId: string): Promise<void> => {
    if (!userId) return;

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("viewed_at", "<=", twentyFourHoursAgo)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`🧹 Deleted ${snapshot.size} expired notifications for user ${userId}`);
};

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Note } from '../types';

const NOTES_COLLECTION = 'notes';

export const noteService = {
    // Subscribe to user's notes
    subscribeToNotes: (userId: string, callback: (notes: Note[]) => void, onError?: (error: any) => void) => {
        if (!userId) {
            console.warn("Skipping note subscription: No UseID");
            callback([]);
            return () => { };
        }

        const q = query(
            collection(db, NOTES_COLLECTION),
            where('userId', '==', userId)
        );

        return onSnapshot(
            q,
            (snapshot) => {
                const notes = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Handle mixed timestamp types safely
                    let created = data.createdAt;

                    // Convert Date to Timestamp-like if needed for consistency or vice-versa
                    // But for now, we just want to NOT crash
                    return {
                        id: doc.id,
                        ...data
                    };
                }) as Note[];

                notes.sort((a, b) => {
                    const getTime = (t: any): number => {
                        if (!t) return 0;
                        if (typeof t.toMillis === 'function') return t.toMillis();
                        if (typeof t.getTime === 'function') return t.getTime();
                        if (t.seconds) return t.seconds * 1000;
                        return 0;
                    };
                    return getTime(b.createdAt) - getTime(a.createdAt);
                });

                callback(notes);
            },
            (error) => {
                console.error("Error subscribing to notes:", error);
                if (onError) onError(error);
            }
        );
    },

    // Add a new note
    addNote: async (content: string, userId: string, title?: string, color?: string, fileData?: { fileUrl: string, fileName: string, fileType: string }) => {
        try {
            // Robust User ID check: Use passed userId or fallback to current auth user
            const effectiveUserId = userId || auth.currentUser?.uid;
            if (!effectiveUserId) throw new Error("User ID is missing and no user is logged in");

            // Construct data carefully
            const noteData: any = {
                content: content || '',
                title: title || '',
                color: color || 'blue',
                userId: effectiveUserId,
                createdAt: Timestamp.now(), // Use Firestore Timestamp
                isCompleted: false // Default for tasks
            };

            // Only add file fields if fileData exists and has valid values
            if (fileData && typeof fileData === 'object') {
                if (fileData.fileUrl) noteData.fileUrl = fileData.fileUrl;
                if (fileData.fileName) noteData.fileName = fileData.fileName;
                if (fileData.fileType) noteData.fileType = fileData.fileType;
            }

            console.log("Adding Note:", noteData); // Debug log
            await addDoc(collection(db, NOTES_COLLECTION), noteData);
        } catch (error) {
            console.error("Error adding note:", error);
            throw error;
        }
    },

    // Update a note
    updateNote: async (id: string, data: Partial<Note>) => {
        try {
            const noteRef = doc(db, NOTES_COLLECTION, id);
            await updateDoc(noteRef, {
                ...data,
                // Don't update createdAt
            });
        } catch (error) {
            console.error("Error updating note:", error);
            throw error;
        }
    },

    // Delete a note
    deleteNote: async (id: string) => {
        try {
            const noteRef = doc(db, NOTES_COLLECTION, id);
            await deleteDoc(noteRef);
        } catch (error) {
            console.error("Error deleting note:", error);
            throw error;
        }
    }
};

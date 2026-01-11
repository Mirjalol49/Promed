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
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Note } from '../types';

const NOTES_COLLECTION = 'notes';

export const noteService = {
    // Subscribe to user's notes
    subscribeToNotes: (userId: string, callback: (notes: Note[]) => void, onError?: (error: any) => void) => {
        const q = query(
            collection(db, NOTES_COLLECTION),
            where('userId', '==', userId)
        );

        return onSnapshot(
            q,
            (snapshot) => {
                const notes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Note[];

                // Sort by createdAt desc in memory to avoid needing a composite index
                notes.sort((a, b) => {
                    const timeA = a.createdAt?.toMillis?.() || 0;
                    const timeB = b.createdAt?.toMillis?.() || 0;
                    return timeB - timeA;
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
    addNote: async (content: string, userId: string, title?: string, color?: string) => {
        try {
            await addDoc(collection(db, NOTES_COLLECTION), {
                content,
                title: title || '',
                color: color || 'blue', // Default color theme
                userId,
                createdAt: serverTimestamp()
            });
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

import { db } from './firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    onSnapshot,
    orderBy
} from 'firebase/firestore';
import { Staff } from '../types';
import { deleteStorageFiles, extractPathFromUrl } from './imageService';

const COLLECTION_NAME = 'staff';

export const subscribeToStaff = (
    accountId: string,
    onUpdate: (staff: Staff[]) => void,
    onError?: (error: any) => void
) => {
    if (!accountId) return () => { };

    const q = query(
        collection(db, COLLECTION_NAME),
        where("accountId", "==", accountId)
        // orderBy("fullName") // Requires index, avoiding for now to prevent errors
    );

    return onSnapshot(q, (snapshot) => {
        const staff = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Staff[];

        // Client-side sort
        staff.sort((a, b) => a.fullName.localeCompare(b.fullName));

        onUpdate(staff);
    }, onError);
};

export const addStaff = async (staffData: Omit<Staff, 'id'>) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...staffData,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding staff:", error);
        throw error;
    }
};

export const updateStaff = async (id: string, updates: Partial<Staff>) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating staff:", error);
        throw error;
    }
};

export const deleteStaff = async (id: string, imageUrl?: string) => {
    try {
        // 1. Delete image if exists
        if (imageUrl) {
            const path = extractPathFromUrl(imageUrl);
            if (path) {
                await deleteStorageFiles('', [path]).catch(err => console.warn('Staff image cleanup failed:', err));
            }
        }

        // 2. Delete Doc
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        console.error("Error deleting staff:", error);
        throw error;
    }
};

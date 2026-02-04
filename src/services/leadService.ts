
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    query,
    orderBy,
    serverTimestamp,
    deleteDoc,
    onSnapshot,
    Unsubscribe,
    where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lead, LeadStatus, TimelineEvent } from '../types';

const LEADS_COLLECTION = 'leads';

export const leadService = {
    // Subscribe to leads (Real-time)
    subscribeToLeads(userId: string, callback: (leads: Lead[]) => void, onError?: (error: any) => void): Unsubscribe {
        if (!userId) return () => { };

        // REMOVED orderBy to prevent "Missing Index" hang for new accounts
        const q = query(
            collection(db, LEADS_COLLECTION),
            where('userId', '==', userId)
        );

        return onSnapshot(q, (snapshot) => {
            const leads = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Lead));

            // Client-side Sort
            leads.sort((a, b) => {
                const timeA = a.created_at?.seconds || 0;
                const timeB = b.created_at?.seconds || 0;
                return timeB - timeA;
            });

            callback(leads);
        }, (error) => {
            // Forward error to component
            if (onError) onError(error);
            else console.error("Lead subscription error:", error);
        });
    },

    // Fetch all leads (One-time)
    async getAllLeads(userId: string): Promise<Lead[]> {
        if (!userId) return [];
        try {
            const q = query(
                collection(db, LEADS_COLLECTION),
                where('userId', '==', userId)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Lead));
        } catch (error) {
            console.error("Error fetching leads:", error);
            return [];
        }
    },

    // Create a new lead
    async createLead(leadData: Partial<Lead>, userId: string): Promise<string> {
        if (!userId) throw new Error("User ID is required");
        try {
            const newLead = {
                ...leadData,
                userId: userId, // Bind to user
                status: 'NEW' as LeadStatus, // Default status
                currency: 'USD',
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
                last_contact_date: serverTimestamp()
            };
            const docRef = await addDoc(collection(db, LEADS_COLLECTION), newLead);
            return docRef.id;
        } catch (error) {
            console.error("Error creating lead:", error);
            throw error;
        }
    },

    // Update lead status (Drag & Drop action)
    async updateLeadStatus(id: string, newStatus: LeadStatus): Promise<void> {
        try {
            const leadRef = doc(db, LEADS_COLLECTION, id);
            await updateDoc(leadRef, {
                status: newStatus,
                updated_at: serverTimestamp(),
                last_contact_date: serverTimestamp() // Assuming moving status implies contact/action
            });
        } catch (error) {
            console.error("Error updating lead status:", error);
            throw error;
        }
    },

    // Generic update
    async updateLead(id: string, data: Partial<Lead>): Promise<void> {
        try {
            const leadRef = doc(db, LEADS_COLLECTION, id);
            await updateDoc(leadRef, {
                ...data,
                updated_at: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating lead:", error);
            throw error;
        }
    },

    // Delete lead (Optional, but good for cleanup)
    async deleteLead(id: string): Promise<void> {
        try {
            await deleteDoc(doc(db, LEADS_COLLECTION, id));
        } catch (error) {
            console.error("Error deleting lead:", error);
            throw error;
        }
    },

    // Check for Stale Leads (Logic: Status 'PRICE_GIVEN' + updated > 3 days ago)
    checkStale(lead: Lead): boolean {
        if (lead.status !== 'PRICE_GIVEN') return false;
        if (!lead.updated_at) return false;

        // Firestore Timestamp to Date conversion
        const lastUpdate = lead.updated_at.seconds ? new Date(lead.updated_at.seconds * 1000) : new Date();
        const now = new Date();

        // Difference in hours
        const diffHours = Math.abs(now.getTime() - lastUpdate.getTime()) / 36e5;

        return diffHours > 72; // 72 hours = 3 days
    },

    // Add Timeline Event (Comment/Note)
    async addTimelineEvent(leadId: string, event: Omit<TimelineEvent, 'id' | 'created_at'>): Promise<void> {
        try {
            const leadRef = doc(db, LEADS_COLLECTION, leadId);
            // We store timeline as an array of objects in the main doc for simplicity
            // In high scale, this should be a subcollection. For now, array is fine (limit 1MB doc).
            // Using arrayUnion to append
            const newEvent = {
                id: Date.now().toString(),
                ...event,
                created_at: new Date().toISOString() // Store as ISO string for simpler client handling inside array
            };

            // We need to use updateDoc with arrayUnion, but Firestore arrayUnion doesn't like custom objects efficiently if we want strict ordering.
            // Actually, let's just fetch, append, and update for now to ensure explicit order, or use a subcollection.
            // Let's use a subcollection 'timeline' for scalability as planned.

            const timelineRef = collection(db, LEADS_COLLECTION, leadId, 'timeline');
            await addDoc(timelineRef, {
                ...event,
                created_at: serverTimestamp()
            });

            // Also update main doc updated_at
            await updateDoc(leadRef, {
                updated_at: serverTimestamp()
            });

        } catch (error) {
            console.error("Error adding timeline event:", error);
            throw error;
        }
    },

    subscribeToTimeline(leadId: string, callback: (events: TimelineEvent[]) => void): Unsubscribe {
        const q = query(
            collection(db, LEADS_COLLECTION, leadId, 'timeline'),
            orderBy('created_at', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const events = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as TimelineEvent));
            callback(events);
        });
    },

    // Update Timeline Event
    // Update Timeline Event
    async updateTimelineEvent(leadId: string, eventId: string, data: Partial<TimelineEvent> | string): Promise<void> {
        try {
            const eventRef = doc(db, LEADS_COLLECTION, leadId, 'timeline', eventId);
            const updatePayload = typeof data === 'string' ? { content: data } : data;

            await updateDoc(eventRef, {
                ...updatePayload,
                updated_at: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating timeline event:", error);
            throw error;
        }
    },

    // Delete Timeline Event
    async deleteTimelineEvent(leadId: string, eventId: string): Promise<void> {
        try {
            const eventRef = doc(db, LEADS_COLLECTION, leadId, 'timeline', eventId);
            await deleteDoc(eventRef);
        } catch (error) {
            console.error("Error deleting timeline event:", error);
            throw error;
        }
    }
};

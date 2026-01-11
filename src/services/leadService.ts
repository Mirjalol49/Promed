
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
    Unsubscribe
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lead, LeadStatus } from '../types';

const LEADS_COLLECTION = 'leads';

export const leadService = {
    // Subscribe to leads (Real-time)
    subscribeToLeads(callback: (leads: Lead[]) => void): Unsubscribe {
        const q = query(collection(db, LEADS_COLLECTION), orderBy('created_at', 'desc'));
        return onSnapshot(q, (snapshot) => {
            const leads = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Lead));
            callback(leads);
        });
    },

    // Fetch all leads (One-time)
    async getAllLeads(): Promise<Lead[]> {
        try {
            const q = query(collection(db, LEADS_COLLECTION), orderBy('created_at', 'desc'));
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
    async createLead(leadData: Partial<Lead>): Promise<string> {
        try {
            const newLead = {
                ...leadData,
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
    }
};

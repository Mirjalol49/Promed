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
    orderBy,
    limit
} from 'firebase/firestore';
import { Transaction, FinanceStats } from '../types';

const COLLECTION_NAME = 'transactions';

export const subscribeToTransactions = (
    accountId: string,
    onUpdate: (transactions: Transaction[]) => void,
    onError?: (error: any) => void,
    limitCount: number = 100
) => {
    if (!accountId) return () => { };

    const q = query(
        collection(db, COLLECTION_NAME),
        where("accountId", "==", accountId)
        // orderBy("date", "desc"), 
        // limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Transaction[];
        onUpdate(transactions);
    }, onError);
};

export const addTransaction = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            createdAt: new Date().toISOString() // Use server timestamp ideally, but ISO string fine for MVP
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding transaction:", error);
        throw error;
    }
};

// Return a transaction (instead of deleting)
export const returnTransaction = async (id: string, note?: string) => {
    try {
        await updateDoc(doc(db, COLLECTION_NAME, id), {
            returned: true,
            returnedAt: new Date().toISOString(),
            returnNote: note || 'Transaction returned'
        });
    } catch (error) {
        console.error("Error returning transaction:", error);
        throw error;
    }
};

export const deleteTransaction = async (id: string) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        console.error("Error deleting transaction:", error);
        throw error;
    }
};

// Helper to calculate stats client-side (for MVP)
// In a real app at scale, this should be a Cloud Function or aggregated doc
export const calculateStats = (transactions: Transaction[]): FinanceStats => {
    const stats: FinanceStats = {
        totalIncome: 0,
        totalExpense: 0,
        netProfit: 0,
        salaryExpense: 0
    };

    // Filter out returned transactions from stats
    const activeTransactions = transactions.filter(t => !t.returned);

    activeTransactions.forEach(t => {
        const amount = Number(t.amount) || 0;
        if (t.type === 'income') {
            stats.totalIncome += amount;
        } else {
            stats.totalExpense += amount;
            if (t.category === 'salary') {
                stats.salaryExpense += amount;
            }
        }
    });

    stats.netProfit = stats.totalIncome - stats.totalExpense;
    return stats;
};

// Helper to create a description for automatic salary payment
export const generateSalaryDescription = (staffName: string, month: string) => {
    return `Salary payment to ${staffName} for ${month}`;
};

// Get payment history for a specific staff member
export const getStaffPaymentHistory = (
    staffId: string,
    onUpdate: (payments: Transaction[]) => void,
    onError?: (error: any) => void
) => {
    if (!staffId) return () => { };

    // Simplified query - ONLY filter by staffId (no orderBy, no other where clauses)
    // This requires NO composite index - just the automatic single-field index on staffId
    const q = query(
        collection(db, COLLECTION_NAME),
        where("staffId", "==", staffId)
    );

    console.log('[getStaffPaymentHistory] Querying for staffId:', staffId);

    return onSnapshot(q, (snapshot) => {
        // Filter for salary payments and sort client-side
        const payments = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }) as Transaction)
            .filter(payment =>
                payment.type === 'expense' &&
                payment.category === 'salary'
            )
            .sort((a, b) => {
                // Sort by date descending (newest first)
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            });

        console.log(`[getStaffPaymentHistory] Found ${payments.length} payments for staffId:`, staffId);
        if (payments.length > 0) {
            console.log('[getStaffPaymentHistory] First payment:', payments[0]);
        }
        onUpdate(payments);
    }, onError);
};

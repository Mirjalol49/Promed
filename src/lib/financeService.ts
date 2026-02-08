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

    transactions.forEach(t => {
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

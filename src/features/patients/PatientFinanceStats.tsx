import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Patient, Transaction } from '../../types';
import { subscribeToTransactions, addTransaction } from '../../lib/financeService';
import { useToast } from '../../contexts/ToastContext';
import {
    DollarSign,
    TrendingUp,
    CreditCard,
    Calendar,
    Plus,
    Wallet,
    CheckCircle2,
    Clock,
    AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface PatientFinanceStatsProps {
    patient: Patient;
    accountId: string;
}

export const PatientFinanceStats: React.FC<PatientFinanceStatsProps> = ({ patient, accountId }) => {
    const { t } = useLanguage();
    const { success, error: toastError } = useToast();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingPayment, setIsAddingPayment] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentNote, setPaymentNote] = useState('');

    useEffect(() => {
        if (!accountId) return;

        // Subscribe to ALL transactions for this account, then filter client-side
        // Ideally we would query by patientId, but financeService might not have that index ready
        // Let's assume financeService returns all and we filter, 
        // OR we can add a specific query in financeService if needed.
        // For now, let's use the existing subscribeToTransactions and filter.
        const unsub = subscribeToTransactions(accountId, (allTransactions) => {
            const patientTransactions = allTransactions.filter(t => t.patientId === patient.id);
            // Sort by date desc
            patientTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(patientTransactions);
            setLoading(false);
        });

        return () => unsub();
    }, [accountId, patient.id]);

    const stats = useMemo(() => {
        const totalPaid = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalCost = patient.totalAmount || 0;
        const remaining = totalCost - totalPaid;
        const percentPaid = totalCost > 0 ? Math.round((totalPaid / totalCost) * 100) : 0;

        return { totalPaid, totalCost, remaining, percentPaid };
    }, [transactions, patient.totalAmount]);

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addTransaction({
                accountId,
                patientId: patient.id,
                amount: parseFloat(paymentAmount),
                currency: patient.currency || 'USD',
                type: 'income',
                category: 'consultation', // Default to 'surgery' or 'consultation'. 
                // Maybe add a selector? For now simplified.
                // Actually user said for surgery mostly.
                // Let's call it 'surgery' or 'consultation' based on description
                description: paymentNote || `Payment from ${patient.fullName}`,
                date: paymentDate
            });
            success(t('payment_added'), `${paymentAmount} ${patient.currency || 'USD'} received`);
            setIsAddingPayment(false);
            setPaymentAmount('');
            setPaymentNote('');
        } catch (err: any) {
            toastError("Error", err.message);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Cost */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3 mb-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <DollarSign size={16} className="text-slate-700" />
                        </div>
                        {t('total_agreed') || "Total Cost"}
                    </div>
                    <div className="text-3xl font-black text-slate-800">
                        {stats.totalCost.toLocaleString()} <span className="text-sm text-slate-400 font-bold">{patient.currency || 'USD'}</span>
                    </div>
                </div>

                {/* Paid */}
                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-3 mb-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <CheckCircle2 size={16} className="text-emerald-500" />
                        </div>
                        {t('paid_so_far') || "Paid So Far"}
                    </div>
                    <div className="text-3xl font-black text-emerald-700">
                        {stats.totalPaid.toLocaleString()} <span className="text-sm text-emerald-400 font-bold">{patient.currency || 'USD'}</span>
                    </div>
                    <div className="mt-2 w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(stats.percentPaid, 100)}%` }}></div>
                    </div>
                </div>

                {/* Remaining */}
                <div className={`p-5 rounded-2xl border transition-colors ${stats.remaining > 0 ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`flex items-center gap-3 mb-2 font-bold text-xs uppercase tracking-wider ${stats.remaining > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            {stats.remaining > 0 ? <AlertCircle size={16} className="text-amber-500" /> : <CheckCircle2 size={16} className="text-slate-400" />}
                        </div>
                        {t('remaining_balance') || "Remaining"}
                    </div>
                    <div className={`text-3xl font-black ${stats.remaining > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                        {Math.max(0, stats.remaining).toLocaleString()} <span className={`text-sm font-bold ${stats.remaining > 0 ? 'text-amber-500' : 'text-slate-300'}`}>{patient.currency || 'USD'}</span>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-premium overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Wallet className="text-promed-primary" />
                        {t('payment_history') || "Payment History"}
                    </h3>

                    <button
                        onClick={() => setIsAddingPayment(!isAddingPayment)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-sm ${isAddingPayment ? 'bg-slate-100 text-slate-600' : 'bg-emerald-600 text-white shadow-emerald-500/20 shadow-lg hover:shadow-emerald-500/30'}`}
                    >
                        {isAddingPayment ? t('cancel') : (
                            <>
                                <Plus size={16} strokeWidth={3} />
                                {t('add_payment') || "Add Payment"}
                            </>
                        )}
                    </button>
                </div>

                {/* Add Payment Form */}
                {isAddingPayment && (
                    <form onSubmit={handleAddPayment} className="p-6 bg-slate-50 border-b border-slate-100 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">{t('amount')}</label>
                                <input
                                    type="number"
                                    required
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800"
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">{t('date')}</label>
                                <input
                                    type="date"
                                    required
                                    value={paymentDate}
                                    onChange={e => setPaymentDate(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-medium text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">{t('note')}</label>
                                <input
                                    type="text"
                                    value={paymentNote}
                                    onChange={e => setPaymentNote(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-medium text-slate-800"
                                    placeholder="Consultation fee..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95"
                            >
                                {t('save_payment') || "Save Payment"}
                            </button>
                        </div>
                    </form>
                )}

                {/* List */}
                <div className="max-h-[400px] overflow-y-auto">
                    {transactions.length > 0 ? (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 tracking-wider">{t('date')}</th>
                                    <th className="px-6 py-3 tracking-wider">{t('description')}</th>
                                    <th className="px-6 py-3 tracking-wider text-right">{t('amount')}</th>
                                    <th className="px-6 py-3 tracking-wider text-right">{t('status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.map(tx => (
                                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-600">
                                            {format(new Date(tx.date), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{tx.description || tx.category}</div>
                                            <div className="text-xs text-slate-400 capitalize">{tx.category}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-emerald-600 text-lg">
                                                +{Number(tx.amount).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-slate-400 text-right">{tx.currency}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                                <CheckCircle2 size={12} />
                                                {t('completed') || "Completed"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <CreditCard size={24} className="opacity-50" />
                            </div>
                            <h4 className="font-bold text-slate-600">{t('no_payments_yet') || "No payments recorded"}</h4>
                            <p className="text-sm mt-1 max-w-xs mx-auto">{t('no_payments_desc') || "Add a payment to see history here."}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

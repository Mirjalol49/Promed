import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Patient, Transaction, TransactionCategory } from '../../types';
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
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { AddPaymentModal } from './AddPaymentModal';
import { formatWithSpaces } from '../../lib/formatters';

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
    const [filterCategory, setFilterCategory] = useState<'all' | 'surgery' | 'injection'>('all');

    useEffect(() => {
        if (!accountId) return;

        const unsub = subscribeToTransactions(accountId, (allTransactions) => {
            const patientTransactions = allTransactions.filter(t => t.patientId === patient.id);
            // Sort by date and time desc
            patientTransactions.sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
                const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
                return dateB.getTime() - dateA.getTime();
            });
            setTransactions(patientTransactions);
            setLoading(false);
        });

        return () => unsub();
    }, [accountId, patient.id]);

    const filteredTransactions = useMemo(() => {
        if (filterCategory === 'all') return transactions;
        return transactions.filter(t => t.category === filterCategory);
    }, [transactions, filterCategory]);

    const stats = useMemo(() => {
        const totalPaid = filteredTransactions
            .filter(t => t.type === 'income' && !t.returned)
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalCost = patient.totalAmount || 0;
        const remaining = Math.max(0, totalCost - totalPaid);
        const percentPaid = totalCost > 0 ? Math.round((totalPaid / totalCost) * 100) : 0;

        return { totalPaid, totalCost, remaining, percentPaid };
    }, [filteredTransactions, patient.totalAmount]);


    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Simplified Summary Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-6">
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('paid_so_far')}</div>
                        <div className="text-2xl font-black text-emerald-600">
                            {formatWithSpaces(stats.totalPaid)} <span className="text-xs text-slate-400">UZS</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsAddingPayment(!isAddingPayment)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${isAddingPayment ? 'bg-slate-100 text-slate-600' : 'btn-premium-emerald hover:scale-105 active:scale-95'}`}
                    >
                        {isAddingPayment ? t('cancel') : (
                            <>
                                <Plus size={18} strokeWidth={3} />
                                {t('add_payment')}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Add Payment Modal */}
            <AddPaymentModal
                isOpen={isAddingPayment}
                onClose={() => setIsAddingPayment(false)}
                patient={patient}
                accountId={accountId}
            />

            {/* Transactions List */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-premium overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-promed-light rounded-xl">
                            <Wallet className="text-promed-primary w-5 h-5" />
                        </div>
                        {t('transaction_history')}
                    </h3>

                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                        <button
                            onClick={() => setFilterCategory('all')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterCategory === 'all' ? 'bg-white text-promed-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {t('filter_all')}
                        </button>
                        <button
                            onClick={() => setFilterCategory('surgery')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterCategory === 'surgery' ? 'bg-white text-promed-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {t('surgery')}
                        </button>
                        <button
                            onClick={() => setFilterCategory('injection')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterCategory === 'injection' ? 'bg-white text-promed-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {t('injection')}
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="max-h-[600px] overflow-y-auto">
                    {filteredTransactions.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                            {filteredTransactions.map(tx => (
                                <div key={tx.id} className="p-6 md:px-8 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                                    <div className="flex items-center gap-6">
                                        <div className="hidden md:flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-slate-100 shadow-sm min-w-[70px]">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">{format(new Date(tx.date), 'MMM')}</span>
                                            <span className="text-xl font-black text-slate-800 leading-none">{format(new Date(tx.date), 'dd')}</span>
                                            <span className="text-[9px] font-bold text-promed-primary mt-1">{tx.time || '--:--'}</span>
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-800 text-lg mb-1">
                                                {tx.description && tx.description !== t(tx.category)
                                                    ? tx.description.replace(` - ${patient.fullName}`, '')
                                                    : t(tx.category)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${tx.category === 'surgery' ? 'bg-purple-50 text-purple-600' : tx.category === 'injection' ? 'bg-promed-light text-promed-primary' : 'bg-slate-100 text-slate-500'}`}>
                                                    {t(tx.category)}
                                                </span>
                                                <span className="md:hidden text-[10px] font-bold text-slate-400">
                                                    {format(new Date(tx.date), 'MMM dd')} • {tx.time || '--:--'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right flex items-center gap-8">
                                        <div className="text-right">
                                            <div className="text-xl font-black text-emerald-600">
                                                +{formatWithSpaces(tx.amount)}
                                            </div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UZS</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                <CheckCircle2 size={12} strokeWidth={3} />
                                                {t('completed')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-24 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                                <CreditCard size={32} className="text-slate-300" />
                            </div>
                            <h4 className="font-black text-slate-800 text-xl mb-2">{t('no_payments_yet')}</h4>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">{t('no_payments_desc')}</p>
                            {filterCategory !== 'all' && (
                                <button
                                    onClick={() => setFilterCategory('all')}
                                    className="mt-6 text-promed-primary font-black text-sm hover:underline"
                                >
                                    {t('clear_filters')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

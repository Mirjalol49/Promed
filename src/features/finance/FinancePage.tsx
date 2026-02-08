import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccount } from '../../contexts/AccountContext';
import { Transaction, TransactionType, TransactionCategory, Staff, Patient } from '../../types';
import { subscribeToTransactions, addTransaction, deleteTransaction, calculateStats } from '../../lib/financeService';
import { subscribeToStaff } from '../../lib/staffService';
import { subscribeToPatients } from '../../lib/patientService';
import { useToast } from '../../contexts/ToastContext';
import {
    TrendingUp, TrendingDown, DollarSign, Plus, Calendar,
    Wallet, PieChart, ArrowUpRight, ArrowDownRight, Trash2, User, Users, Filter, X,
    LayoutGrid, List, Clock, BarChart3, ChevronRight, Search, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, startOfMonth, startOfWeek, isAfter, isBefore, startOfDay, endOfDay, addDays } from 'date-fns';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { CustomDatePicker } from '../../components/ui/CustomDatePicker';

// --- Types ---
type DateFilter = 'all' | 'month' | 'week';

// --- Utility: Format Currency ---
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// --- Constants ---
const incomeCategories: TransactionCategory[] = ['surgery', 'consultation', 'injection'];
const expenseCategories: TransactionCategory[] = ['salary', 'rent', 'equipment', 'marketing', 'food', 'utility', 'tax'];

// --- Add Transaction Modal (Redesigned) ---
const TransactionModal = ({
    isOpen,
    onClose,
    onSave,
    staffList,
    patientList,
    initialPatientId
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    staffList: Staff[];
    patientList: Patient[];
    initialPatientId?: string;
}) => {
    const { t } = useLanguage();
    const [type, setType] = useState<TransactionType>('income');
    const [formData, setFormData] = useState<Partial<Transaction>>({
        amount: 0,
        currency: 'UZS',
        category: 'consultation',
        date: new Date().toISOString().split('T')[0],
        description: '',
        patientId: '',
        staffId: ''
    });
    const [customCategory, setCustomCategory] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setType('income');
            setFormData({
                amount: 0,
                currency: 'UZS',
                category: 'consultation',
                date: new Date().toISOString().split('T')[0],
                description: '',
                patientId: initialPatientId || '',
                staffId: ''
            });
            setCustomCategory('');
        }
    }, [isOpen, initialPatientId]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const finalCategory = formData.category === 'other' ? customCategory : formData.category;
            await onSave({ ...formData, category: finalCategory, type });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative flex flex-col md:flex-row max-h-[90vh]">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors z-20 md:hidden"
                >
                    <X size={20} />
                </button>

                {/* LEFT SIDE: Type & Amount */}
                <div className={`w-full md:w-5/12 p-8 flex flex-col items-center justify-between relative overflow-hidden transition-colors duration-500 ${type === 'income' ? 'bg-blue-600' : 'bg-[#e11d48]'}`}>
                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                    <div className="w-full relative z-10 text-white">
                        <h3 className="font-black text-2xl mb-1 text-center">
                            {t('add_transaction') || "Tranzaksiya Qo'shish"}
                        </h3>
                        <p className="text-white/70 font-medium text-sm text-center mb-8">Fill in the details below</p>
                    </div>

                    {/* Amount Input */}
                    <div className="flex-1 flex flex-col justify-center items-center w-full z-10 text-white">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-widest mb-4">{t('amount') || 'AMOUNT'}</label>

                        <div className="flex items-center justify-center gap-1 mb-8 w-full px-4">
                            {formData.currency === 'USD' && (
                                <span className={`font-bold text-white/50 select-none transition-all duration-300 ${(formData.amount ? new Intl.NumberFormat('en-US').format(formData.amount).length : 0) > 10 ? 'text-3xl' :
                                    (formData.amount ? new Intl.NumberFormat('en-US').format(formData.amount).length : 0) > 7 ? 'text-4xl' : 'text-5xl'
                                    }`}>$</span>
                            )}
                            <input
                                type="text"
                                inputMode="numeric"
                                required
                                autoFocus
                                className={`w-auto min-w-[50px] text-center font-black bg-transparent focus:outline-none placeholder-white/30 text-white p-0 transition-all duration-300 ${(formData.amount ? new Intl.NumberFormat('en-US').format(formData.amount).length : 0) > 12 ? 'text-3xl' :
                                    (formData.amount ? new Intl.NumberFormat('en-US').format(formData.amount).length : 0) > 9 ? 'text-4xl' :
                                        (formData.amount ? new Intl.NumberFormat('en-US').format(formData.amount).length : 0) > 6 ? 'text-5xl' : 'text-6xl'
                                    }`}
                                value={formData.amount ? new Intl.NumberFormat('en-US').format(formData.amount) : ''}
                                onChange={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setFormData({ ...formData, amount: val ? Number(val) : 0 });
                                }}
                                placeholder="0"
                            />
                            {formData.currency === 'UZS' && (
                                <span className={`font-bold text-white/50 select-none transition-all duration-300 ${(formData.amount ? new Intl.NumberFormat('en-US').format(formData.amount).length : 0) > 10 ? 'text-xl' : 'text-2xl'
                                    }`}>so'm</span>
                            )}
                        </div>
                    </div>

                    {/* Type Toggle */}
                    <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-1.5 flex w-full">
                        <button
                            type="button"
                            onClick={() => { setType('income'); setFormData({ ...formData, category: 'consultation' }); }}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'income'
                                ? 'bg-white text-blue-600 shadow-lg'
                                : 'text-white hover:bg-white/10'
                                }`}
                        >
                            <TrendingUp size={16} />
                            {t('income') || 'Income'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setType('expense'); setFormData({ ...formData, category: 'salary' }); }}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'expense'
                                ? 'bg-white text-[#e11d48] shadow-lg'
                                : 'text-white hover:bg-white/10'
                                }`}
                        >
                            <TrendingDown size={16} />
                            {t('expense') || 'Expense'}
                        </button>
                    </div>
                </div>

                {/* RIGHT SIDE: Details Form */}
                <form onSubmit={handleSubmit} className="w-full md:w-7/12 p-8 md:p-10 bg-white flex flex-col h-full overflow-hidden">
                    <div className="flex justify-between items-center mb-8 hidden md:flex">
                        <h3 className="text-xl font-bold text-slate-800">Transaction Details</h3>
                        <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <CustomDatePicker
                                label={t('date') || 'Date'}
                                value={new Date(formData.date)}
                                onChange={(date) => setFormData({ ...formData, date: date.toISOString().split('T')[0] })}
                            />

                            <CustomSelect
                                label={t('category') || 'Category'}
                                options={[
                                    ...(type === 'income' ? incomeCategories : expenseCategories).map(c => ({ value: c, label: c })),
                                    { value: 'other', label: 'Other...' }
                                ]}
                                value={formData.category}
                                onChange={(val) => setFormData({ ...formData, category: val as TransactionCategory })}
                            />
                        </div>

                        <AnimatePresence>
                            {formData.category === 'other' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                                        Custom Category Name
                                    </label>
                                    <input
                                        type="text"
                                        value={customCategory}
                                        onChange={(e) => setCustomCategory(e.target.value)}
                                        placeholder="Enter custom category..."
                                        className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-3.5 px-4 text-slate-700 font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-slate-400 transition-all outline-none"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence mode="wait">
                            {type === 'income' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2 overflow-hidden"
                                >
                                    <CustomSelect
                                        label={`${t('patient') || 'Patient'} (Optional)`}
                                        options={patientList.map(p => ({ value: p.id, label: p.fullName }))}
                                        value={formData.patientId || ''}
                                        onChange={(val) => setFormData({ ...formData, patientId: val })}
                                        placeholder="Select Patient"
                                        searchable
                                        renderOption={(option) => {
                                            const patient = patientList.find(p => p.id === option.value);
                                            return (
                                                <div className="flex items-center gap-3">
                                                    {patient?.profileImage && (
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
                                                            <ImageWithFallback src={patient.profileImage} alt={patient.fullName} className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <span>{option.label}</span>
                                                </div>
                                            );
                                        }}
                                    />
                                </motion.div>
                            )}
                            {type === 'expense' && formData.category === 'salary' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2 overflow-hidden"
                                >
                                    <CustomSelect
                                        label={t('staff_member') || 'Staff Member'}
                                        options={staffList.map(s => ({ value: s.id, label: `${s.fullName} (${s.role})` }))}
                                        value={formData.staffId || ''}
                                        onChange={(val) => setFormData({ ...formData, staffId: val })}
                                        placeholder="Select Staff"
                                        searchable
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">{t('description') || 'Note'}</label>
                            <textarea
                                className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl font-medium text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-slate-400 transition-all resize-none placeholder-slate-400 min-h-[100px]"
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Add a note details..."
                            />
                        </div>
                    </div>

                    <div className="pt-6 mt-auto">
                        <button
                            type="submit"
                            disabled={loading || !formData.amount}
                            className={`w-full py-4 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all hover:shadow-2xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${type === 'income'
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500'
                                : 'bg-[#e11d48]'
                                }`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                            ) : (
                                <>
                                    {type === 'income' ? 'Confirm Income' : 'Confirm Expense'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export const FinancePage = ({ onPatientClick }: { onPatientClick?: (id: string) => void }) => {
    const { t } = useLanguage();
    const { accountId } = useAccount();
    const { success, error: toastError } = useToast();

    // Tab State: 'overview' vs 'patients' vs 'transactions'
    const [view, setView] = useState<'overview' | 'patients' | 'transactions'>('overview');

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [patientList, setPatientList] = useState<Patient[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState<DateFilter>('month');
    const [layout, setLayout] = useState<'grid' | 'list'>('grid');
    const [initialPatientId, setInitialPatientId] = useState<string | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');

    // Transactions View Filters
    const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [txCategoryFilter, setTxCategoryFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
    const [endDate, setEndDate] = useState<Date>(new Date());

    useEffect(() => {
        if (!accountId) return;

        const unsubTrans = subscribeToTransactions(accountId, (data) => {
            setTransactions(data);
            setLoading(false);
        });

        const unsubStaff = subscribeToStaff(accountId, (data) => setStaffList(data));
        const unsubPatients = subscribeToPatients(accountId, (data) => setPatientList(data));

        return () => {
            unsubTrans();
            unsubStaff();
            unsubPatients();
        };
    }, [accountId]);

    // Filter Transactions
    const filteredTransactions = useMemo(() => {
        if (dateFilter === 'all') return transactions;

        const now = new Date();
        let startDate = new Date(0); // Epoch

        if (dateFilter === 'month') {
            startDate = startOfMonth(now);
        } else if (dateFilter === 'week') {
            startDate = startOfWeek(now);
        }

        return transactions
            .filter(t => isAfter(new Date(t.date), startDate))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, dateFilter]);

    // Filter Transactions for Transactions View
    const filteredTransactionsList = useMemo(() => {
        let result = transactions;

        // 1. Type Filter
        if (txTypeFilter !== 'all') {
            result = result.filter(t => t.type === txTypeFilter);
        }

        // 2. Date Range Filter
        if (startDate) {
            result = result.filter(t => isAfter(new Date(t.date), subDays(startOfDay(startDate), 1))); // Inclusive start
        }
        if (endDate) {
            result = result.filter(t => isBefore(new Date(t.date), addDays(endOfDay(endDate), 0))); // Inclusive end
        }

        // 4. Category Filter
        if (txCategoryFilter !== 'all') {
            result = result.filter(t => t.category === txCategoryFilter);
        }

        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, txTypeFilter, startDate, endDate, txCategoryFilter]);

    // Filter Patients
    const filteredPatients = useMemo(() => {
        if (!searchTerm) return patientList;
        const lowerTerm = searchTerm.toLowerCase();
        return patientList.filter(p =>
            p.fullName.toLowerCase().includes(lowerTerm) ||
            p.phone?.includes(lowerTerm)
        );
    }, [patientList, searchTerm]);

    // Calculate Stats
    const stats = useMemo(() => calculateStats(transactions), [transactions]); // Use all transactions for global stats for now

    // Prepare Chart Data (Group by Day)
    const chartData = useMemo(() => {
        const dataMap = new Map<string, { date: string, income: number, expense: number }>();

        // Sort by date ascending for chart
        const sortedForChart = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        sortedForChart.forEach(t => {
            const dateKey = t.date; // YYYY-MM-DD
            if (!dataMap.has(dateKey)) {
                dataMap.set(dateKey, { date: dateKey, income: 0, expense: 0 });
            }
            const entry = dataMap.get(dateKey)!;
            if (t.type === 'income') entry.income += t.amount;
            else entry.expense += t.amount;
        });

        // Convert to array
        const data = Array.from(dataMap.values());

        // Format date for display
        return data.map(d => ({
            ...d,
            displayDate: format(new Date(d.date), 'MMM dd')
        }));
    }, [filteredTransactions]);

    const handleSave = async (data: any) => {
        try {
            await addTransaction({ ...data, accountId });
            success(t('added') || 'Added', `${data.type === 'income' ? 'Income' : 'Expense'} recorded successfully`);
            setIsModalOpen(false);
        } catch (err: any) {
            toastError(t('error'), err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            try {
                await deleteTransaction(id);
                success('Deleted', 'Transaction removed');
            } catch (err: any) {
                toastError('Error', err.message);
            }
        }
    };

    return (
        <div className="h-full flex flex-col p-6 max-w-7xl mx-auto space-y-6 relative overflow-hidden">

            {/* --- Background Decor --- */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-400/10 blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-400/10 blur-[120px]" />
            </div>

            {/* --- HEADER + TAB SWITCHER --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight">
                        {t('finance') || 'Moliya'}
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 text-lg">
                        {t('finance_overview') || 'Financial constraints and analytics'}
                    </p>
                </div >

                {/* PREMIUM TAB SWITCHER */}
                < div className="bg-white/80 p-1.5 rounded-2xl flex items-center relative gap-1 border border-white/20 shadow-xl shadow-slate-200/40 backdrop-blur-xl self-start md:self-center" >
                    {(['overview', 'patients', 'transactions'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setView(tab)}
                            className={`
                                relative px-8 py-3 rounded-xl text-sm font-bold transition-colors duration-300 z-10 flex items-center gap-2.5
                                ${view === tab ? 'text-white' : 'text-slate-500 hover:text-slate-700'}
                            `}
                        >
                            {view === tab && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl shadow-lg shadow-blue-500/30"
                                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                {tab === 'overview' ? <PieChart className="w-4 h-4" /> : tab === 'patients' ? <Users className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                {tab === 'overview' ? (t('overview') || 'Umumiy') : tab === 'patients' ? (t('patients') || 'Bemorlar') : (t('transactions') || 'Tranzaksiyalar')}
                            </span>
                        </button>
                    ))}
                </div >

                <div className="flex items-center gap-3 self-end md:self-auto">
                    <button
                        onClick={() => { setInitialPatientId(undefined); setIsModalOpen(true); }}
                        className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-200/60 rounded-2xl px-6 py-3 font-bold transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5 stroke-[2.5]" />
                        {t('add_transaction') || 'Tranzaksiya'}
                    </button>
                </div>
            </div >

            {/* --- CONTENT AREA --- */}
            < AnimatePresence mode="wait" >
                {view === 'overview' ? (
                    <motion.div
                        key="overview"
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
                            exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
                        }}
                        className="space-y-6 relative z-10"
                    >
                        {/* 1. KEY STATS CARDS */}
                        {!loading && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Income */}
                                <motion.div
                                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                                    whileHover={{ y: -5 }}
                                    className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden group hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500"
                                >
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 scale-150 transform translate-x-1/4 -translate-y-1/4">
                                        <TrendingUp className="w-48 h-48 text-emerald-600" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 backdrop-blur-sm shadow-sm ring-1 ring-emerald-500/20">
                                                <ArrowUpRight className="w-7 h-7 stroke-[2.5]" />
                                            </div>
                                            <span className="text-slate-400 font-bold text-xs tracking-[0.2em] uppercase">{t('income') || 'Kirim'}</span>
                                        </div>
                                        <div className="text-5xl font-black bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight">
                                            +{formatCurrency(stats.totalIncome)}
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Expense */}
                                <motion.div
                                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                                    whileHover={{ y: -5 }}
                                    className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden group hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500"
                                >
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 scale-150 transform translate-x-1/4 -translate-y-1/4">
                                        <TrendingDown className="w-48 h-48 text-rose-600" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 backdrop-blur-sm shadow-sm ring-1 ring-rose-500/20">
                                                <ArrowDownRight className="w-7 h-7 stroke-[2.5]" />
                                            </div>
                                            <span className="text-slate-400 font-bold text-xs tracking-[0.2em] uppercase">{t('expense') || 'Xarajat'}</span>
                                        </div>
                                        <div className="text-5xl font-black bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight">
                                            -{formatCurrency(stats.totalExpense)}
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Profit */}
                                <motion.div
                                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                                    whileHover={{ y: -5 }}
                                    className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden group hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500"
                                >
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 scale-150 transform translate-x-1/4 -translate-y-1/4">
                                        <Wallet className="w-48 h-48 text-blue-600" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 backdrop-blur-sm shadow-sm ring-1 ring-blue-500/20">
                                                <Wallet className="w-7 h-7 stroke-[2.5]" />
                                            </div>
                                            <span className="text-slate-400 font-bold text-xs tracking-[0.2em] uppercase">{t('net_profit') || 'Sof Foyda'}</span>
                                        </div>
                                        <div className={`text-5xl font-black bg-clip-text text-transparent tracking-tight ${stats.netProfit >= 0
                                            ? 'bg-gradient-to-br from-blue-600 to-blue-400'
                                            : 'bg-gradient-to-br from-rose-600 to-rose-400'
                                            }`}>
                                            {formatCurrency(stats.netProfit)}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* 2. ANALYTICS CHART (2/3 Width) */}
                            <motion.div
                                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                                className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col justify-between"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 border border-slate-100">
                                            <BarChart3 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800">Review Analytics</h3>
                                            <p className="text-sm text-slate-400 font-medium mt-0.5">Income and expense statistics</p>
                                        </div>
                                    </div>
                                    <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
                                        {(['week', 'month', 'all'] as const).map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => setDateFilter(f)}
                                                className={`
                                                    px-5 py-2 rounded-xl text-xs font-bold transition-all capitalize duration-300
                                                    ${dateFilter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}
                                                `}
                                            >
                                                {f === 'all' ? 'All Time' : f}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="h-96 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="displayDate"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                                dy={15}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                                tickFormatter={(value) => `$${value}`}
                                                dx={-15}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: '20px',
                                                    border: '1px solid rgba(255, 255, 255, 0.8)',
                                                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
                                                    padding: '16px',
                                                    background: 'rgba(255, 255, 255, 0.8)',
                                                    backdropFilter: 'blur(12px)'
                                                }}
                                                cursor={{ stroke: '#cbd5e1', strokeWidth: 1.5, strokeDasharray: '6 6' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="income"
                                                stroke="#10b981"
                                                strokeWidth={4}
                                                fillOpacity={1}
                                                fill="url(#colorIncome)"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="expense"
                                                stroke="#f43f5e"
                                                strokeWidth={4}
                                                fillOpacity={1}
                                                fill="url(#colorExpense)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>

                            {/* 3. RECENT TRANSACTIONS (1/3 Width) */}
                            <motion.div
                                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                                className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col h-[540px]"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        Recent
                                    </h3>
                                    <button className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                                        View All
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {filteredTransactions.length > 0 ? filteredTransactions.slice(0, 20).map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-4 rounded-2xl transition-all duration-300 border border-transparent hover:border-slate-100">
                                            <div className="flex items-center gap-4 overflow-hidden">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-emerald-100/50 text-emerald-600' : 'bg-rose-100/50 text-rose-600'
                                                    }`}>
                                                    {tx.type === 'income' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 text-sm truncate capitalize">{tx.description || t(tx.category) || 'General'}</p>
                                                    <p className="text-xs text-slate-400 font-bold mt-1">
                                                        {new Date(tx.date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-2">
                                                <p className={`font-black text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                </p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-20 flex flex-col items-center">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
                                                <Clock className="w-10 h-10" />
                                            </div>
                                            <p className="text-slate-400 font-bold text-sm">No transactions yet</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                ) : view === 'patients' ? (
                    <motion.div
                        key="patients"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden relative z-10"
                    >
                        {/* Patients Toolbar */}
                        <div className="p-8 border-b border-slate-100/50 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="relative w-full max-w-md group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <Search className="text-slate-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('search_patients') || "Search patients..."}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-50/50 border border-slate-200/50 rounded-2xl py-4 pl-14 pr-6 text-slate-800 font-bold placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
                                <button
                                    onClick={() => setLayout('grid')}
                                    className={`p-3 rounded-xl transition-all duration-300 ${layout === 'grid' ? 'bg-white shadow-md text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                                >
                                    <LayoutGrid className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setLayout('list')}
                                    className={`p-3 rounded-xl transition-all duration-300 ${layout === 'list' ? 'bg-white shadow-md text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                                >
                                    <List className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Patients List Content */}
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar">
                            {layout === 'grid' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredPatients.map(patient => {
                                        // Specific calc for this patient
                                        const pTransactions = transactions.filter(t => t.patientId === patient.id && t.type === 'income');
                                        const totalPaid = pTransactions.reduce((sum, t) => sum + t.amount, 0);
                                        const totalCost = patient.totalAmount || 0;
                                        const remaining = Math.max(0, totalCost - totalPaid);

                                        return (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.3 }}
                                                key={patient.id}
                                                className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-sm border border-white/60 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] transition-all duration-300 group cursor-pointer flex flex-col items-center text-center relative overflow-hidden"
                                                onClick={() => {
                                                    setInitialPatientId(patient.id);
                                                    setIsModalOpen(true);
                                                }}
                                            >
                                                {/* Status Badge */}
                                                <div className="absolute top-4 right-4">
                                                    <span className={`w-3 h-3 rounded-full block ${patient.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`} />
                                                </div>

                                                {/* Avatar */}
                                                <div className="relative mb-4 mt-2">
                                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-white p-1 shadow-lg shadow-slate-200/50 ring-1 ring-slate-100">
                                                        <ImageWithFallback src={patient.profileImage} alt={patient.fullName} className="w-full h-full object-cover rounded-full" />
                                                    </div>
                                                </div>

                                                {/* Info */}
                                                <div className="mb-6">
                                                    <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-xl mb-1">{patient.fullName}</h3>
                                                    <p className="text-sm text-slate-400 font-bold bg-slate-50/80 px-3 py-1 rounded-full inline-block border border-slate-100">
                                                        {patient.phone}
                                                    </p>
                                                </div>

                                                {/* Divider */}
                                                <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-6" />

                                                {/* Paid Amount */}
                                                <div className="mt-auto">
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mb-2">Total Paid</p>
                                                    <div className="text-4xl font-black text-emerald-500 tracking-tight drop-shadow-sm">
                                                        +{formatCurrency(totalPaid)}
                                                    </div>
                                                </div>

                                                {/* Hover Action Hint */}
                                                <div className="absolute inset-x-0 bottom-0 py-2 bg-blue-50/80 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center gap-2 text-blue-600 font-bold text-sm">
                                                    <Plus className="w-4 h-4" />
                                                    Add Transaction
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase tracking-wider backdrop-blur-sm">
                                            <tr>
                                                <th className="px-8 py-5">Patient</th>
                                                <th className="px-8 py-5">Status</th>
                                                <th className="px-8 py-5 text-right">Paid</th>
                                                <th className="px-8 py-5 text-right">Total</th>
                                                <th className="px-8 py-5 text-right">Remaining</th>
                                                <th className="px-8 py-5 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm">
                                            {filteredPatients.map((patient) => {
                                                const pTransactions = transactions.filter(t => t.patientId === patient.id && t.type === 'income');
                                                const totalPaid = pTransactions.reduce((sum, t) => sum + t.amount, 0);
                                                const totalCost = patient.totalAmount || 0;
                                                const remaining = Math.max(0, totalCost - totalPaid);

                                                return (
                                                    <tr key={patient.id} className="hover:bg-blue-50/30 transition-colors group">
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden shrink-0 shadow-sm border border-slate-100">
                                                                    <ImageWithFallback src={patient.profileImage} alt={patient.fullName} className="w-full h-full object-cover" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors cursor-pointer" onClick={() => onPatientClick?.(patient.id)}>{patient.fullName}</p>
                                                                    <p className="text-xs text-slate-400 font-medium mt-0.5">{patient.phone}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${patient.status === 'Active'
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                                : 'bg-slate-50 text-slate-600 border-slate-100'
                                                                }`}>
                                                                {patient.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-5 text-right font-black text-emerald-600">+{formatCurrency(totalPaid)}</td>
                                                        <td className="px-8 py-5 text-right font-bold text-slate-500">{formatCurrency(totalCost)}</td>
                                                        <td className="px-8 py-5 text-right font-bold text-rose-500">{formatCurrency(remaining)}</td>
                                                        <td className="px-8 py-5 text-center">
                                                            <button
                                                                onClick={() => {
                                                                    setInitialPatientId(patient.id);
                                                                    setIsModalOpen(true);
                                                                }}
                                                                className="text-slate-300 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-xl"
                                                            >
                                                                <Plus className="w-5 h-5 stroke-[3]" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="transactions"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden relative z-10"
                    >
                        {/* --- FILTER TOOLBAR --- */}
                        <div className="p-6 border-b border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                {/* Search - Spans 4 columns */}
                                {/* Category Filter - Spans 3 columns (reduced from 4) */}
                                <div className="md:col-span-3 h-[52px]">
                                    <CustomSelect
                                        value={txCategoryFilter}
                                        onChange={(val) => setTxCategoryFilter(val)}
                                        options={[
                                            { value: 'all', label: t('all_categories') || 'All Categories' },
                                            ...incomeCategories.map(c => ({ value: c, label: t(c) || c.charAt(0).toUpperCase() + c.slice(1) })),
                                            ...expenseCategories.map(c => ({ value: c, label: t(c) || c.charAt(0).toUpperCase() + c.slice(1) })),
                                            { value: 'other', label: t('other') || 'Other' }
                                        ]}
                                        placeholder={t('filter_by_category') || "Filter by Category"}
                                        searchable // Enable search inside the dropdown for convenience
                                    />
                                </div>

                                {/* Date Range - Spans 6 columns (increased from 5) */}
                                <div className="md:col-span-6 flex items-center gap-0 bg-slate-50 border border-slate-300 rounded-2xl p-1 h-[52px] hover:border-slate-400 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <CustomDatePicker
                                            value={startDate}
                                            onChange={setStartDate}
                                            minimal // Add a minimal prop to remove default styling if needed, or we just rely on the component
                                        />
                                    </div>
                                    <div className="w-px h-6 bg-slate-300 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <CustomDatePicker
                                            value={endDate}
                                            onChange={setEndDate}
                                            minimal
                                        />
                                    </div>
                                </div>

                                {/* Type Filter - Spans 3 columns */}
                                <div className="md:col-span-3 h-[52px]">
                                    <CustomSelect
                                        value={txTypeFilter}
                                        onChange={(val) => setTxTypeFilter(val as any)}
                                        options={[
                                            { value: 'all', label: t('all_types') || 'All Types' },
                                            { value: 'income', label: t('income_only') || 'Income Only' },
                                            { value: 'expense', label: t('expense_only') || 'Expense Only' }
                                        ]}
                                        placeholder={t('all_types') || "Type"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* --- VISUAL SUMMARY --- */}
                        <div className="grid grid-cols-2 gap-px bg-slate-200 border-b border-slate-200">
                            {[
                                {
                                    label: 'Total Income',
                                    value: filteredTransactionsList.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
                                    color: 'text-emerald-600',
                                    bg: 'bg-emerald-50/50'
                                },
                                {
                                    label: 'Total Expense',
                                    value: filteredTransactionsList.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
                                    color: 'text-rose-600',
                                    bg: 'bg-rose-50/50'
                                }
                            ].map((stat, i) => (
                                <div key={i} className={`p-4 flex items-center justify-center gap-3 ${stat.bg}`}>
                                    <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">{stat.label}</span>
                                    <span className={`text-lg font-black ${stat.color}`}>{formatCurrency(stat.value)}</span>
                                </div>
                            ))}
                        </div>

                        {/* --- TRANSACTIONS LIST --- */}
                        <div className="flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar p-0">
                            {filteredTransactionsList.length > 0 ? (
                                <div className="divide-y divide-slate-200">
                                    {filteredTransactionsList.map((tx) => (
                                        <motion.div
                                            key={tx.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="group flex items-center justify-between p-4 hover:bg-white hover:shadow-sm transition-all duration-200"
                                        >
                                            {/* Icon & Details */}
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${tx.type === 'income' ? 'bg-emerald-100/50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-rose-100/50 text-rose-600 group-hover:bg-rose-100'
                                                    }`}>
                                                    {tx.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                                </div>

                                                <div className="min-w-0 flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800 text-sm capitalize">{tx.category}</span>
                                                        <span className="text-slate-300 text-xs">•</span>
                                                        <span className="text-slate-400 text-xs font-semibold">{format(new Date(tx.date), 'MMM dd, yyyy')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {tx.description && <span className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{tx.description}</span>}

                                                        {tx.patientId && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                                                                <User className="w-3 h-3" />
                                                                {patientList.find(p => p.id === tx.patientId)?.fullName || 'Unknown Patient'}
                                                            </span>
                                                        )}
                                                        {tx.staffId && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 text-[10px] font-bold uppercase tracking-wider">
                                                                <User className="w-3 h-3" />
                                                                {staffList.find(s => s.id === tx.staffId)?.fullName || 'Unknown Staff'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Amount & Actions */}
                                            <div className="flex items-center gap-6 pl-4">
                                                <div className={`text-right font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(tx.id)}
                                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                                                    title="Delete Transaction"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
                                        <Search className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-slate-800 font-bold text-lg">No transactions found</h3>
                                    <p className="text-slate-400 text-sm max-w-xs mt-1">Try adjusting your filters or search terms to find what you're looking for.</p>
                                    <button
                                        onClick={() => {
                                            setTxTypeFilter('all');
                                            setStartDate(startOfMonth(new Date())); // Reset to default
                                            setEndDate(new Date());
                                            setTxSearchTerm('');
                                        }}
                                        className="mt-6 text-blue-600 font-bold text-sm hover:underline"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence >

            {/* Modal */}
            < TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                staffList={staffList}
                patientList={patientList}
                initialPatientId={initialPatientId}
            />
        </div >
    );
};

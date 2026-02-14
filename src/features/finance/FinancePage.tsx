import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccount } from '../../contexts/AccountContext';
import { Transaction, TransactionType, TransactionCategory, Staff, Patient } from '../../types';
import { subscribeToTransactions, addTransaction, deleteTransaction, returnTransaction, restoreTransaction, calculateStats } from '../../lib/financeService';
import { subscribeToStaff } from '../../lib/staffService';
import { subscribeToPatients } from '../../lib/patientService';
import { useToast } from '../../contexts/ToastContext';
import {
    TrendingUp, TrendingDown, DollarSign, Plus,
    Wallet, ArrowUpRight, ArrowDownRight, RotateCcw, Trash2, User, Users, Filter, X,
    LayoutGrid, List, Clock, BarChart3, ChevronRight, Search, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, startOfMonth, startOfWeek, isAfter, isBefore, startOfDay, endOfDay, addDays } from 'date-fns';
import { uz, ru, enUS } from 'date-fns/locale';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { CustomDatePicker } from '../../components/ui/CustomDatePicker';
import { TimePicker } from '../../components/ui/TimePicker';
import DeleteModal from '../../components/ui/DeleteModal';
import { Tooltip } from '../../components/ui/Tooltip';
import { formatCompactNumber, formatCurrency } from '../../lib/formatters';
import { EmptyState } from '../../components/ui/EmptyState';


import { TransactionModal } from './TransactionModal';

// --- Types ---
type DateFilter = 'all' | 'month' | 'week';

// --- Utility: Format Currency Removed (Imported) ---

// --- Constants ---
const incomeCategories: TransactionCategory[] = ['surgery', 'consultation', 'injection'];
const expenseCategories: TransactionCategory[] = ['salary', 'tax'];



export const FinancePage = ({ onPatientClick }: { onPatientClick?: (id: string) => void }) => {
    const { t, language } = useLanguage();
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

    const [transactionsPage, setTransactionsPage] = useState(1);
    const [patientsPage, setPatientsPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Delete Modal State
    const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [returnTransactionId, setReturnTransactionId] = useState<string | null>(null);

    // Transactions View Filters
    const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [txCategoryFilter, setTxCategoryFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<Date | null>(startOfMonth(new Date()));
    const [endDate, setEndDate] = useState<Date | null>(new Date());



    // Reset pagination when filters change
    useEffect(() => {
        setTransactionsPage(1);
    }, [txTypeFilter, txCategoryFilter, startDate, endDate]);

    useEffect(() => {
        setPatientsPage(1);
    }, [searchTerm]);

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

    const handleDateFilterChange = (filter: DateFilter) => {
        setDateFilter(filter);
        const now = new Date();
        if (filter === 'month') {
            setStartDate(startOfMonth(now));
            setEndDate(new Date());
        } else if (filter === 'week') {
            setStartDate(startOfWeek(now));
            setEndDate(new Date());
        } else if (filter === 'all') {
            if (transactions.length > 0) {
                const dates = transactions.map(t => new Date(t.date).getTime());
                setStartDate(new Date(Math.min(...dates)));
                setEndDate(new Date());
            } else {
                setStartDate(null);
                setEndDate(null);
            }
        }
    };

    // Filter Transactions for Chart and Stats
    const filteredTransactions = useMemo(() => {
        let result = transactions;

        if (startDate) {
            const startStr = format(startDate, 'yyyy-MM-dd');
            result = result.filter(t => t.date >= startStr);
        }
        if (endDate) {
            const endStr = format(endDate, 'yyyy-MM-dd');
            result = result.filter(t => t.date <= endStr);
        }

        return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [transactions, startDate, endDate]);

    // Filter Transactions for Transactions View
    const filteredTransactionsList = useMemo(() => {
        let result = transactions;

        // 1. Type Filter
        if (txTypeFilter !== 'all') {
            result = result.filter(t => t.type === txTypeFilter);
        }

        // 2. Date Range Filter
        if (startDate) {
            const startStr = format(startDate, 'yyyy-MM-dd');
            result = result.filter(t => t.date >= startStr);
        }
        if (endDate) {
            const endStr = format(endDate, 'yyyy-MM-dd');
            result = result.filter(t => t.date <= endStr);
        }

        // 4. Category Filter
        if (txCategoryFilter !== 'all') {
            result = result.filter(t => t.category === txCategoryFilter);
        }

        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, txTypeFilter, startDate, endDate, txCategoryFilter]);

    // Paginate Transactions
    const paginatedTransactions = useMemo(() => {
        const startIndex = (transactionsPage - 1) * ITEMS_PER_PAGE;
        return filteredTransactionsList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredTransactionsList, transactionsPage]);

    const totalTransactionPages = Math.ceil(filteredTransactionsList.length / ITEMS_PER_PAGE);

    // Filter Patients
    const filteredPatients = useMemo(() => {
        if (!searchTerm) return patientList;
        const lowerTerm = searchTerm.toLowerCase();
        return patientList.filter(p =>
            p.fullName.toLowerCase().includes(lowerTerm) ||
            p.phone?.includes(lowerTerm)
        );
    }, [patientList, searchTerm]);

    // Paginate Patients
    const paginatedPatients = useMemo(() => {
        const startIndex = (patientsPage - 1) * ITEMS_PER_PAGE;
        return filteredPatients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredPatients, patientsPage]);

    const totalPatientPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);

    // Calculate Stats (Synced with chart and filters)
    const stats = useMemo(() => calculateStats(filteredTransactions), [filteredTransactions]);

    // Prepare Chart Data (Group by Day)
    const chartData = useMemo(() => {
        const currentLocale = language === 'uz' ? uz : language === 'ru' ? ru : enUS;

        const dataMap = new Map<string, { date: string, income: number, expense: number }>();

        // Already sorted in filteredTransactions
        const sortedForChart = filteredTransactions;

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
            displayDate: format(new Date(d.date), 'MMMM d', { locale: currentLocale })
        }));
    }, [filteredTransactions, language]);

    const handleSave = async (data: any) => {
        try {
            await addTransaction({ ...data, accountId });
            success(t('added') || 'Added', `${data.type === 'income' ? 'Income' : 'Expense'} recorded successfully`);
            setIsModalOpen(false);
        } catch (err: any) {
            toastError(t('error'), err.message);
        }
    };

    const handleReturn = (id: string) => {
        setReturnTransactionId(id);
        setIsReturnModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setDeleteTransactionId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmReturn = async () => {
        if (!returnTransactionId) return;
        try {
            await returnTransaction(returnTransactionId, 'Transaction returned');
            success(t('returned') || 'Returned', t('transaction_returned_msg') || 'Transaction has been returned');
        } catch (err: any) {
            toastError(t('error'), err.message);
        }
        setIsReturnModalOpen(false);
        setReturnTransactionId(null);
    };

    const confirmDelete = async () => {
        if (!deleteTransactionId) return;
        try {
            await deleteTransaction(deleteTransactionId);
            success(t('deleted') || 'Deleted', t('transaction_deleted') || 'Transaction permanently deleted');
        } catch (err: any) {
            toastError(t('error'), err.message);
        }
        setIsDeleteModalOpen(false);
        setDeleteTransactionId(null);
        setDeleteTransactionId(null);
    };

    const handleRestore = async (id: string) => {
        try {
            await restoreTransaction(id);
            success(t('restored') || 'Restored', t('transaction_restored') || 'Transaction restored successfully');
        } catch (err: any) {
            toastError(t('error'), err.message);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6 relative overflow-hidden">

            {/* --- Background Decor Removed for KISS/Apple Aesthetic --- */}

            {/* --- HEADER + TAB SWITCHER --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                {/* PREMIUM TAB SWITCHER */}
                <div className="bg-white/90 p-1.5 rounded-2xl flex items-center relative gap-1 border border-slate-200/50 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-xl self-start md:self-center">
                    {(['overview', 'transactions'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setView(tab)}
                            className={`
                                relative px-8 py-3 rounded-xl text-sm font-bold transition-colors duration-300 z-10 flex items-center gap-2.5
                                ${view === tab ? 'text-white' : 'text-slate-500 hover:text-slate-700'}
                            `}
                        >
                            {view === tab && (
                                <div
                                    className="absolute inset-0 rounded-xl overflow-hidden"
                                    style={{
                                        background: 'linear-gradient(180deg, #4A85FF 0%, #0044FF 100%)',
                                        boxShadow: '0 8px 16px -4px rgba(0, 68, 255, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.45), inset 0 -2px 1px rgba(0, 0, 0, 0.15)'
                                    }}
                                >
                                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                                </div>
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                {tab === 'overview' ? <LayoutGrid className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                {tab === 'overview' ? (t('overview') || 'Umumiy') : (t('transactions') || 'Tranzaksiyalar')}
                            </span>
                        </button>
                    ))}
                </div >

                <div className="flex items-center gap-3 self-end md:self-auto">
                    <button
                        onClick={() => { setInitialPatientId(undefined); setIsModalOpen(true); }}
                        className="btn-glossy-blue !w-auto !py-3 px-6 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5 stroke-[3]" />
                        <span className="relative z-10">{t('add_transaction') || 'Tranzaksiya'}</span>
                    </button>
                </div>
            </div >

            {/* --- CONTENT AREA --- */}

            {view === 'overview' ? (
                <div className="space-y-6 relative z-10">
                    {/* 1. KEY STATS CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        {/* Income Card */}
                        <div
                            className="relative rounded-[2rem] p-6 bg-white border border-slate-100 overflow-hidden group transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
                        >
                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('income') || 'Kirim'}</span>
                                        <Tooltip content={formatCurrency(stats.totalIncome)}>
                                            <div className="text-3xl md:text-[2.5rem] font-black text-slate-900 tracking-tighter leading-none mt-1">
                                                +{formatCompactNumber(stats.totalIncome)}
                                            </div>
                                        </Tooltip>
                                    </div>
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors duration-300">
                                        <ArrowUpRight className="w-7 h-7 text-emerald-600 stroke-[2.5]" />
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Expense Card */}
                        <div
                            className="relative rounded-[2rem] p-6 bg-white border border-slate-100 overflow-hidden group transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
                        >
                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('expense') || 'Xarajat'}</span>
                                        <Tooltip content={formatCurrency(stats.totalExpense)}>
                                            <div className="text-3xl md:text-[2.5rem] font-black text-slate-900 tracking-tighter leading-none mt-1">
                                                -{formatCompactNumber(stats.totalExpense)}
                                            </div>
                                        </Tooltip>
                                    </div>
                                    <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors duration-300">
                                        <ArrowDownRight className="w-7 h-7 text-rose-600 stroke-[2.5]" />
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Net Profit Card */}
                        <div
                            className="relative rounded-[2rem] p-6 bg-white border border-slate-100 overflow-hidden group transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
                        >
                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('net_profit') || 'Sof foyda'}</span>
                                        <Tooltip content={formatCurrency(stats.netProfit)}>
                                            <div className={`text-3xl md:text-[2.5rem] font-black tracking-tighter leading-none mt-1 ${stats.netProfit >= 0 ? 'text-slate-900' : 'text-amber-500'}`}>
                                                {formatCompactNumber(stats.netProfit)}
                                            </div>
                                        </Tooltip>
                                    </div>
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300 ${stats.netProfit >= 0 ? 'bg-blue-50 group-hover:bg-blue-100' : 'bg-amber-50 group-hover:bg-amber-100'}`}>
                                        <Wallet className={`w-7 h-7 stroke-[2.5] ${stats.netProfit >= 0 ? 'text-blue-600' : 'text-amber-600'}`} />
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>



                    <div className="flex flex-col">
                        {/* 3. ANALYTICS CHART (Full Width + Date Picker) */}
                        <div
                            className="w-full bg-white rounded-[2rem] p-5 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_16px_36px_rgba(0,0,0,0.06)] border border-white/60 flex flex-col justify-between"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 border border-slate-100">
                                        <BarChart3 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">{t('review_analytics') || 'Review Analytics'}</h3>
                                        <p className="text-sm text-slate-400 font-medium mt-0.5">{t('income_statistics') || 'Income and expense statistics'}</p>
                                    </div>
                                </div>
                                {/* Date Range Picker for Analytics */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50/50 p-2 rounded-2xl border border-slate-200/50 md:bg-white/50 md:border-white/60 md:shadow-sm">
                                    {/* Date Inputs */}
                                    <div className="flex items-center gap-2 flex-1">
                                        <div className="flex-1 min-w-0">
                                            <CustomDatePicker
                                                value={startDate}
                                                onChange={(date) => setStartDate(date)}
                                                placeholder={t('start_date') || 'Start Date'}
                                            />
                                        </div>
                                        <span className="text-slate-300 font-bold shrink-0">-</span>
                                        <div className="flex-1 min-w-0">
                                            <CustomDatePicker
                                                value={endDate}
                                                onChange={(date) => setEndDate(date)}
                                                placeholder={t('end_date') || 'End Date'}
                                            />
                                        </div>
                                    </div>

                                    <div className="w-px h-6 bg-slate-300 hidden sm:block mx-1" />

                                    {/* Quick Filters */}
                                    <div className="flex bg-white sm:bg-slate-100/50 p-1 rounded-xl border border-slate-200/50 shrink-0 overflow-x-auto">
                                        {(['week', 'month', 'all'] as const).map((f) => {
                                            const labelKey = f === 'week' ? 'weekly' : f === 'month' ? 'monthly' : 'filter_all';
                                            return (
                                                <button
                                                    key={f}
                                                    onClick={() => handleDateFilterChange(f)}
                                                    className={`
                                                                px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all capitalize duration-300 whitespace-nowrap flex-1 sm:flex-none text-center
                                                                ${dateFilter === f ? 'bg-white shadow-sm text-slate-800 scale-100 ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}
                                                            `}
                                                >
                                                    {t(labelKey) || (f === 'all' ? 'All' : f)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="h-64 md:h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }} barGap={0}>
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
                                            tickFormatter={(value) => formatCompactNumber(value)}
                                            width={60}
                                            dx={-10}
                                        />
                                        <RechartsTooltip
                                            cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] rounded-2xl p-4 min-w-[180px]">
                                                            <p className="text-slate-500 font-bold text-xs mb-3 capitalize tracking-wide border-b border-slate-200/60 pb-2">{label}</p>
                                                            {payload.map((entry: any, index: number) => (
                                                                <div key={index} className="flex items-center justify-between gap-4 mb-2 last:mb-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-2 h-2 rounded-full ring-2 ring-white shadow-sm ${entry.dataKey === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                                        <span className="text-xs font-bold text-slate-600 capitalize">
                                                                            {t(entry.dataKey === 'income' ? 'income' : 'expense')}
                                                                        </span>
                                                                    </div>
                                                                    <span className={`text-sm font-black ${entry.dataKey === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                        {formatCurrency(entry.value as number)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar
                                            dataKey="income"
                                            fill="#10b981"
                                            radius={[6, 6, 0, 0]}
                                            maxBarSize={50}
                                        />
                                        <Bar
                                            dataKey="expense"
                                            fill="#f43f5e"
                                            radius={[6, 6, 0, 0]}
                                            maxBarSize={50}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                </div>
            ) : false ? (
                <div
                    key="patients"
                    className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden relative z-10"
                >
                    {/* Patients Toolbar */}
                    <div className="p-8 border-b border-slate-100/50 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="relative w-full max-w-md group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Search className="text-slate-400 group-focus-within:text-promed-primary transition-colors w-5 h-5" />
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
                                className={`p-3 rounded-xl transition-all duration-300 ${layout === 'grid' ? 'bg-white shadow-md text-promed-primary scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setLayout('list')}
                                className={`p-3 rounded-xl transition-all duration-300 ${layout === 'list' ? 'bg-white shadow-md text-promed-primary scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Patients List Content */}
                    <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar">
                        {layout === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {paginatedPatients.map(patient => {
                                    // Specific calc for this patient
                                    const pTransactions = transactions.filter(t => t.patientId === patient.id && t.type === 'income' && !t.isVoided);
                                    const totalPaid = pTransactions.reduce((sum, t) => sum + t.amount, 0);
                                    const totalCost = patient.totalAmount || 0;
                                    const remaining = Math.max(0, totalCost - totalPaid);

                                    return (
                                        <div
                                            key={patient.id}
                                            className="bg-white/80 backdrop-blur-xl rounded-3xl p-4 shadow-sm border border-white/60 hover:shadow-md transition-all duration-300 group cursor-pointer flex flex-col items-center text-center relative overflow-hidden h-[260px]"
                                            onClick={() => {
                                                setInitialPatientId(patient.id);
                                                setIsModalOpen(true);
                                            }}
                                        >
                                            {/* Status Badge - Top Right */}
                                            <div className="absolute top-3 right-3">
                                                <span className={`w-2.5 h-2.5 rounded-full block ${patient.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`} />
                                            </div>

                                            {/* Avatar - Compact */}
                                            <div className="relative mb-3 mt-2">
                                                <div className="w-16 h-16 rounded-full overflow-hidden bg-white p-1 shadow-sm border border-slate-100">
                                                    <ImageWithFallback src={patient.profileImage} alt={patient.fullName} className="w-full h-full object-cover rounded-full" />
                                                </div>
                                            </div>

                                            {/* Info - Compact */}
                                            <div className="mb-2 w-full px-2">
                                                <h3 className="font-bold text-slate-800 group-hover:text-promed-primary transition-colors text-base truncate mb-1">{patient.fullName}</h3>
                                                <p className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-full inline-block border border-slate-100 truncate max-w-full">
                                                    {patient.phone}
                                                </p>
                                            </div>

                                            {/* Divider */}
                                            <div className="w-12 h-px mb-auto bg-slate-100" />

                                            {/* Paid Amount - Compact */}
                                            <div className="mt-2 mb-8">
                                                <p className="mb-0.5 text-[10px] font-bold tracking-wider uppercase text-slate-400">Total Paid</p>
                                                <div className="text-xl font-black tracking-tight text-emerald-500">
                                                    +{formatCurrency(totalPaid)}
                                                </div>
                                            </div>

                                            {/* Hover Action Hint - Compact Slide Up */}
                                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white transition-transform duration-300 translate-y-full bg-promed-primary group-hover:translate-y-0">
                                                <Plus className="w-3.5 h-3.5" />
                                                Add Transaction
                                            </div>
                                        </div>
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
                                        {paginatedPatients.map((patient) => {
                                            const pTransactions = transactions.filter(t => t.patientId === patient.id && t.type === 'income' && !t.isVoided);
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
                                                                <p className="font-bold text-slate-800 text-sm group-hover:text-promed-primary transition-colors cursor-pointer" onClick={() => onPatientClick?.(patient.id)}>{patient.fullName}</p>
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
                                                            className="text-slate-300 hover:text-promed-primary transition-colors p-2 hover:bg-promed-light rounded-xl"
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

                        {/* Patients Pagination Controls */}
                        {totalPatientPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                                <button
                                    onClick={() => setPatientsPage(p => Math.max(1, p - 1))}
                                    disabled={patientsPage === 1}
                                    className="bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-bold px-4 py-2 rounded-xl shadow-sm border border-slate-200 transition-all flex items-center gap-2"
                                >
                                    <ChevronRight className="w-5 h-5 rotate-180" />
                                    {t('prev_page') || 'Previous'}
                                </button>
                                <span className="text-slate-500 font-medium">
                                    {t('page_of')?.replace('{current}', patientsPage.toString()).replace('{total}', totalPatientPages.toString()) || `Page ${patientsPage} of ${totalPatientPages}`}
                                </span>
                                <button
                                    onClick={() => setPatientsPage(p => Math.min(totalPatientPages, p + 1))}
                                    disabled={patientsPage === totalPatientPages}
                                    className="bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-bold px-4 py-2 rounded-xl shadow-sm border border-slate-200 transition-all flex items-center gap-2"
                                >
                                    {t('next_page') || 'Next'}
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div
                    key="transactions"
                    className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden relative z-10"
                >
                    {/* --- FILTER TOOLBAR --- */}
                    <div className="p-4 md:p-6 border-b border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

                            {/* Category Filter */}
                            <div className="md:col-span-3 flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-gray-500 ml-1">Kategoriya</label>
                                <div className="h-[52px]">
                                    <CustomSelect
                                        value={txCategoryFilter}
                                        onChange={(val) => setTxCategoryFilter(val)}
                                        options={[
                                            { value: 'all', label: t('all_categories') || 'All Categories' },
                                            ...(txTypeFilter === 'all' || txTypeFilter === 'income' ? incomeCategories.map(c => ({ value: c, label: t(c.toLowerCase()) || c.charAt(0).toUpperCase() + c.slice(1) })) : []),
                                            ...(txTypeFilter === 'all' || txTypeFilter === 'expense' ? expenseCategories.map(c => ({ value: c, label: t(c.toLowerCase()) || c.charAt(0).toUpperCase() + c.slice(1) })) : []),
                                            { value: 'other', label: t('other') || 'Other' }
                                        ]}
                                        placeholder={t('filter_by_category') || "Filter by Category"}
                                        searchable
                                    />
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="md:col-span-6 flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-gray-500 ml-1">Vaqt Oralig‘i</label>
                                <div className="flex items-center gap-0 bg-slate-50 border border-slate-300 rounded-2xl p-1 h-[52px] hover:border-slate-400 transition-colors w-full overflow-hidden">
                                    <div className="flex-1 min-w-0">
                                        <CustomDatePicker
                                            value={startDate}
                                            onChange={setStartDate}
                                            minimal
                                        />
                                    </div>
                                    <div className="w-px h-6 bg-slate-300 shrink-0 mx-1" />
                                    <div className="flex-1 min-w-0">
                                        <CustomDatePicker
                                            value={endDate}
                                            onChange={setEndDate}
                                            minimal
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Type Filter */}
                            <div className="md:col-span-3 flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-gray-500 ml-1">O‘tkazma Turi</label>
                                <div className="h-[52px]">
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
                    </div>

                    {/* --- VISUAL SUMMARY --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 border-b border-slate-200">
                        {[
                            {
                                label: t('total_income') || 'Total Income',
                                value: filteredTransactionsList.filter(t => t.type === 'income' && !t.returned && !t.isVoided).reduce((sum, t) => sum + t.amount, 0),
                                color: 'text-emerald-600',
                                bg: 'bg-emerald-50/50'
                            },
                            {
                                label: t('total_expenses') || 'Total Expense',
                                value: filteredTransactionsList.filter(t => t.type === 'expense' && !t.returned && !t.isVoided).reduce((sum, t) => sum + t.amount, 0),
                                color: 'text-rose-600',
                                bg: 'bg-rose-50/50'
                            }
                        ].map((stat, i) => (
                            <div key={i} className={`p-4 flex flex-col items-center justify-center gap-1 ${stat.bg.replace('/50', '')}`}>
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">{stat.label}</span>
                                <span className={`text-lg md:text-xl font-black ${stat.color} text-center break-all`}>{formatCurrency(stat.value)}</span>
                            </div>
                        ))}
                    </div>

                    {/* --- TRANSACTIONS LIST --- */}
                    <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar p-0">
                        {filteredTransactionsList.length > 0 ? (
                            <div className="divide-y divide-slate-200">
                                {paginatedTransactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-white hover:shadow-sm transition-all duration-200 gap-4 ${tx.returned ? 'opacity-50' : ''} ${tx.isVoided ? 'bg-gray-50 opacity-60' : ''}`}
                                    >
                                        {/* Icon & Details */}
                                        <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${tx.isVoided
                                                ? 'bg-gray-100 text-gray-400'
                                                : tx.type === 'income' ? 'bg-emerald-100/50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-rose-100/50 text-rose-600 group-hover:bg-rose-100'
                                                } ${tx.returned ? 'opacity-50' : ''}`}>
                                                {tx.isVoided ? <Trash2 className="w-5 h-5" /> : (tx.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />)}
                                            </div>

                                            <div className="min-w-0 flex flex-col">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`font-bold text-sm capitalize ${tx.isVoided ? 'text-gray-500 line-through' : 'text-slate-800'}`}>{t(tx.category.toLowerCase()) || tx.category}</span>
                                                    {tx.returned && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-600 text-[10px] font-bold uppercase tracking-wider">
                                                            RETURNED
                                                        </span>
                                                    )}
                                                    {tx.isVoided && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                                                            BEKOR QILINGAN
                                                        </span>
                                                    )}
                                                    <span className="text-slate-300 text-xs hidden sm:inline">•</span>
                                                    <span className="text-slate-400 text-xs font-semibold block sm:inline w-full sm:w-auto mt-0.5 sm:mt-0">
                                                        {format(new Date(tx.date), 'MMM dd, yyyy')}
                                                        {tx.time && <span> • {tx.time}</span>}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    {tx.description && <span className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{tx.description}</span>}

                                                    {tx.patientId && (() => {
                                                        const patient = patientList.find(p => p.id === tx.patientId);
                                                        return patient ? (
                                                            <div className="flex items-center gap-2 bg-slate-50 pl-1 pr-2.5 py-1 rounded-full border border-slate-100/50">
                                                                <div className="w-5 h-5 rounded-full bg-slate-200 overflow-hidden ring-1 ring-white">
                                                                    <ImageWithFallback src={patient.profileImage || ''} alt={patient.fullName} className="w-full h-full object-cover" />
                                                                </div>
                                                                <span className="text-xs font-semibold text-slate-600">{patient.fullName}</span>
                                                            </div>
                                                        ) : null;
                                                    })()}
                                                    {tx.staffId && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 text-[10px] font-bold uppercase tracking-wider">
                                                            <User className="w-3 h-3" />
                                                            {staffList.find(s => s.id === tx.staffId)?.fullName || 'Unknown Staff'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pl-0 sm:pl-4 border-t sm:border-t-0 border-slate-50 pt-3 sm:pt-0 mt-2 sm:mt-0">
                                            <div className={`text-right font-black ${tx.amount === 0 ? 'text-slate-400' : (tx.isVoided ? 'text-gray-400 line-through' : `bg-clip-text text-transparent ${tx.type === 'income' ? 'bg-gradient-to-br from-emerald-600 to-emerald-400' : 'bg-gradient-to-br from-rose-600 to-rose-400'}`)}`}>
                                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </div>
                                            <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!tx.returned && !tx.isVoided && tx.amount !== 0 && (
                                                    <button
                                                        onClick={() => handleReturn(tx.id)}
                                                        className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all transform hover:scale-105 active:scale-95"
                                                        title="Return Transaction"
                                                    >
                                                        <RotateCcw className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => tx.isVoided ? handleRestore(tx.id) : handleDelete(tx.id)}
                                                    className={`p-2 rounded-lg transition-all transform hover:scale-105 active:scale-95 ${tx.isVoided
                                                        ? 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'
                                                        : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'
                                                        }`}
                                                    title={tx.isVoided ? "Restore Transaction" : "Delete Transaction"}
                                                >
                                                    {tx.isVoided ? <RotateCcw className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Transactions Pagination - KISS Method */}
                                {totalTransactionPages > 1 && (
                                    <div className="flex justify-center py-6">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
                                            <button
                                                onClick={() => setTransactionsPage(p => Math.max(1, p - 1))}
                                                disabled={transactionsPage === 1}
                                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                                            >
                                                <ChevronRight className="w-5 h-5 rotate-180" />
                                            </button>

                                            <div className="flex items-center gap-1.5 px-2">
                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                                    {transactionsPage}
                                                </span>
                                                <div className="w-[1px] h-3 bg-slate-100" />
                                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">
                                                    {totalTransactionPages}
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => setTransactionsPage(p => Math.min(totalTransactionPages, p + 1))}
                                                disabled={transactionsPage === totalTransactionPages}
                                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8">

                                <div className="col-span-full">
                                    <EmptyState
                                        message={t('no_transactions_found') || 'No transactions found'}
                                        description={t('try_adjusting_filters') || 'Try adjusting your filters to see more results.'}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )
            }

            {/* Modal */}
            < TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                staffList={staffList}
                patientList={patientList}
                initialPatientId={initialPatientId}
                transactions={transactions}
            />

            {/* Return Transaction Modal */}
            < DeleteModal
                isOpen={isReturnModalOpen}
                onClose={() => setIsReturnModalOpen(false)}
                onConfirm={confirmReturn}
                title={t('return_transaction') || 'Return Transaction?'}
            />

            {/* Delete Transaction Modal */}
            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={t('delete_transaction') || 'Delete Transaction?'}
            />
        </div >
    );
};

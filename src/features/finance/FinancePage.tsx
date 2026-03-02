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
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isAfter, isBefore, startOfDay, endOfDay, addDays } from 'date-fns';
import { uz, ru, enUS } from 'date-fns/locale';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { CustomDatePicker } from '../../components/ui/CustomDatePicker';
import { TimePicker } from '../../components/ui/TimePicker';
import DeleteModal from '../../components/ui/DeleteModal';
import { Tooltip } from '../../components/ui/Tooltip';
import { formatCompactNumber, formatCurrency } from '../../lib/formatters';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';


import { TransactionModal } from './TransactionModal';
import { Chart3D } from '../../components/ui/Chart3D';

// --- Types ---
type DateFilter = 'all' | 'month' | 'week';

// --- Utility: Format Currency Removed (Imported) ---

// --- Constants ---
const incomeCategories: TransactionCategory[] = ['surgery', 'consultation', 'injection', 'shampoo'];
const expenseCategories: TransactionCategory[] = ['salary', 'tax', 'rent', 'marketing', 'equipment', 'food', 'pills'];



export const FinancePage = ({ onPatientClick, highlightTransactionId, onHighlightClear }: { onPatientClick?: (id: string) => void; highlightTransactionId?: string | null; onHighlightClear?: () => void }) => {
    const { t, language } = useLanguage();
    const { accountId, role } = useAccount();
    const isViewer = role === 'viewer';
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

    // Highlight state for deep-linked transactions
    const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

    // Deep-link: auto-switch to transactions tab, clear ALL filters, scroll & highlight
    useEffect(() => {
        if (highlightTransactionId && !loading) {
            // Switch to transactions tab and clear every filter
            setView('transactions');
            setDateFilter('all');
            setStartDate(null);
            setEndDate(null);
            setSearchTerm('');
            setTxTypeFilter('all');
            setTxCategoryFilter('all');
            setTransactionsPage(1);
            setActiveHighlight(highlightTransactionId);

            // Wait for filters to settle and list to re-render, then find page + scroll
            const timer = setTimeout(() => {
                // Find the transaction in the now-unfiltered list
                const allTxRows = document.querySelectorAll('[data-transaction-id]');
                let targetEl: Element | null = null;
                let targetIdx = -1;
                allTxRows.forEach((el, i) => {
                    if (el.getAttribute('data-transaction-id') === highlightTransactionId) {
                        targetEl = el;
                        targetIdx = i;
                    }
                });

                if (!targetEl) {
                    // Transaction not on current page — search in data list
                    const idx = transactions.findIndex(tx => tx.id === highlightTransactionId);
                    if (idx >= 0) {
                        setTransactionsPage(Math.floor(idx / ITEMS_PER_PAGE) + 1);
                        // Re-scroll after page change
                        setTimeout(() => {
                            const el2 = document.querySelector(`[data-transaction-id="${highlightTransactionId}"]`);
                            if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300);
                    }
                } else {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 600);

            // Clear highlight after 4s
            const clearTimer = setTimeout(() => {
                setActiveHighlight(null);
                onHighlightClear?.();
            }, 4000);

            return () => { clearTimeout(timer); clearTimeout(clearTimer); };
        }
    }, [highlightTransactionId, loading]);

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
            // Monthly: full current year (Jan 1 → Dec 31)
            setStartDate(new Date(now.getFullYear(), 0, 1));
            setEndDate(new Date(now.getFullYear(), 11, 31));
        } else if (filter === 'week') {
            // Weekly: full Mon→Sun week
            const weekStart = startOfWeek(now, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
            setStartDate(weekStart);
            setEndDate(weekEnd);
        } else if (filter === 'all') {
            // Annual: span all transaction history
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
            const startOfDayTime = startOfDay(startDate).getTime();
            result = result.filter(t => new Date(t.date).getTime() >= startOfDayTime);
        }
        if (endDate) {
            const endOfDayTime = endOfDay(endDate).getTime();
            result = result.filter(t => new Date(t.date).getTime() <= endOfDayTime);
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
            const startOfDayTime = startOfDay(startDate).getTime();
            result = result.filter(t => new Date(t.date).getTime() >= startOfDayTime);
        }
        if (endDate) {
            const endOfDayTime = endOfDay(endDate).getTime();
            result = result.filter(t => new Date(t.date).getTime() <= endOfDayTime);
        }

        // 4. Category Filter
        if (txCategoryFilter !== 'all') {
            result = result.filter(t => t.category === txCategoryFilter);
        }

        return result.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateB !== dateA) {
                return dateB - dateA;
            }
            // Secondary sort: Time if available
            if (a.time && b.time) {
                if (b.time !== a.time) return b.time.localeCompare(a.time);
            }

            // Tertiary sort: CreatedAt
            const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return createdB - createdA;
        });
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

    // Generate accurate Time-Series data for the 3D Grouped Bar Chart
    const timeSeriesData = useMemo(() => {
        const dataMap = new Map<string, { kirim: number; xarajat: number; sof: number; fullLabel?: string }>();
        const dateLocale = language === 'ru' ? ru : language === 'uz' ? uz : enUS;

        if (dateFilter === 'week') {
            // ── WEEKLY: Each day of the current week (Mon → Sun) with dates ──
            const weekStart = startDate || startOfWeek(new Date(), { weekStartsOn: 1 });
            for (let i = 0; i < 7; i++) {
                const day = addDays(weekStart, i);
                const dayAbbr = format(day, 'EE', { locale: dateLocale }).replace('.', '').toUpperCase();
                const dateNum = format(day, 'd');
                const shortLabel = `${dayAbbr} ${dateNum}`; // e.g. "DU 24" or "MON 24"
                const fullLabel = format(day, 'EEEE, d MMMM yyyy', { locale: dateLocale });
                const dayKey = format(day, 'yyyy-MM-dd');
                dataMap.set(dayKey, { kirim: 0, xarajat: 0, sof: 0, fullLabel: `${shortLabel}||${fullLabel}` });
            }

            const validTxs = (filteredTransactions || []).filter(t => !t.isVoided && !t.returned);
            validTxs.forEach(t => {
                const dayKey = format(new Date(t.date), 'yyyy-MM-dd');
                const item = dataMap.get(dayKey);
                if (item) {
                    if (t.type === 'income') { item.kirim += t.amount; item.sof += t.amount; }
                    else if (t.type === 'expense') { item.xarajat += t.amount; item.sof -= t.amount; }
                }
            });

            return Array.from(dataMap.entries()).map(([, vals]) => {
                const [shortLabel, fullLabel] = (vals.fullLabel || '').split('||');
                return { label: shortLabel, fullLabel, kirim: vals.kirim, xarajat: vals.xarajat, sof: vals.sof };
            });

        } else if (dateFilter === 'month') {
            // ── MONTHLY: All 12 months of the current year (Jan → Dec) ──
            const year = startDate ? startDate.getFullYear() : new Date().getFullYear();
            for (let i = 0; i < 12; i++) {
                const monthDate = new Date(year, i, 1);
                const shortLabel = format(monthDate, 'MMM', { locale: dateLocale }).replace('.', '');
                const shortLabelCap = shortLabel.charAt(0).toUpperCase() + shortLabel.slice(1);
                const fullMonth = format(monthDate, 'MMMM yyyy', { locale: dateLocale });
                const fullMonthCap = fullMonth.charAt(0).toUpperCase() + fullMonth.slice(1);
                dataMap.set(String(i), { kirim: 0, xarajat: 0, sof: 0, fullLabel: `${shortLabelCap}||${fullMonthCap}` });
            }

            // Use ALL transactions from the same year (not filtered by date range)
            const yearTxs = transactions.filter(t => {
                const d = new Date(t.date);
                return d.getFullYear() === year && !t.isVoided && !t.returned;
            });

            yearTxs.forEach(t => {
                const monthIdx = String(new Date(t.date).getMonth());
                const item = dataMap.get(monthIdx);
                if (item) {
                    if (t.type === 'income') { item.kirim += t.amount; item.sof += t.amount; }
                    else if (t.type === 'expense') { item.xarajat += t.amount; item.sof -= t.amount; }
                }
            });

            return Array.from(dataMap.entries()).map(([, vals]) => {
                const [shortLabel, fullLabel] = (vals.fullLabel || '').split('||');
                return { label: shortLabel, fullLabel, kirim: vals.kirim, xarajat: vals.xarajat, sof: vals.sof };
            });

        } else {
            // ── ANNUAL: Year-by-year comparison starting from 2026 ──
            const startYear = 2026;
            const rangeEnd = startYear + 4; // Show 5 years: 2026–2030

            for (let year = startYear; year <= rangeEnd; year++) {
                dataMap.set(String(year), { kirim: 0, xarajat: 0, sof: 0, fullLabel: String(year) });
            }

            transactions.filter(t => !t.isVoided && !t.returned).forEach(t => {
                const year = String(new Date(t.date).getFullYear());
                const item = dataMap.get(year);
                if (item) {
                    if (t.type === 'income') { item.kirim += t.amount; item.sof += t.amount; }
                    else if (t.type === 'expense') { item.xarajat += t.amount; item.sof -= t.amount; }
                }
            });

            return Array.from(dataMap.entries()).map(([label, vals]) => ({ label, fullLabel: label, ...vals }));
        }
    }, [filteredTransactions, transactions, dateFilter, startDate, endDate, language]);


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
                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                            key={tab}
                            onClick={() => setView(tab)}
                            className={`
                                relative px-4 md:px-8 py-3 rounded-xl text-sm font-bold transition-colors duration-300 z-10 flex items-center gap-2.5 whitespace-nowrap
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
                        </motion.button>
                    ))}
                </div >

                <div className="flex items-center gap-3 self-end md:self-auto">
                    {!isViewer && (
                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                            onClick={() => { setInitialPatientId(undefined); setIsModalOpen(true); }}
                            className="btn-glossy-blue !w-auto !py-3 px-6 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5 stroke-[3]" />
                            <span className="relative z-10">{t('add_transaction') || 'Tranzaksiya'}</span>
                        </motion.button>
                    )}
                </div>
            </div >

            {/* --- CONTENT AREA --- */}

            {view === 'overview' ? (
                <div className="space-y-6 relative z-10">
                    {/* 1. KEY STATS CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                        {/* Income Card */}
                        <div
                            className="relative rounded-2xl md:rounded-[2rem] p-4 md:p-6 bg-white border border-slate-100 overflow-hidden group transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
                        >
                            <div className="relative z-10">
                                <div className="flex items-center md:items-start justify-between md:mb-6">
                                    <div className="flex flex-col gap-0.5 md:gap-1">
                                        <span className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider">{t('income') || 'Kirim'}</span>
                                        <Tooltip content={formatCurrency(stats.totalIncome)}>
                                            <div className="text-2xl md:text-[2.5rem] font-black text-emerald-600 tracking-tighter leading-none">
                                                +{formatCompactNumber(stats.totalIncome)}
                                            </div>
                                        </Tooltip>
                                    </div>
                                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors duration-300">
                                        <ArrowUpRight className="w-5 h-5 md:w-7 md:h-7 text-emerald-600 stroke-[2.5]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Expense Card */}
                        <div
                            className="relative rounded-2xl md:rounded-[2rem] p-4 md:p-6 bg-white border border-slate-100 overflow-hidden group transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
                        >
                            <div className="relative z-10">
                                <div className="flex items-center md:items-start justify-between md:mb-6">
                                    <div className="flex flex-col gap-0.5 md:gap-1">
                                        <span className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider">{t('expense') || 'Xarajat'}</span>
                                        <Tooltip content={formatCurrency(stats.totalExpense)}>
                                            <div className="text-2xl md:text-[2.5rem] font-black text-rose-600 tracking-tighter leading-none">
                                                -{formatCompactNumber(stats.totalExpense)}
                                            </div>
                                        </Tooltip>
                                    </div>
                                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors duration-300">
                                        <ArrowDownRight className="w-5 h-5 md:w-7 md:h-7 text-rose-600 stroke-[2.5]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Net Profit Card */}
                        <div
                            className="relative rounded-2xl md:rounded-[2rem] p-4 md:p-6 bg-white border border-slate-100 overflow-hidden group transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] col-span-2 md:col-span-1"
                        >
                            <div className="relative z-10">
                                <div className="flex items-center md:items-start justify-between md:mb-6">
                                    <div className="flex flex-col gap-0.5 md:gap-1">
                                        <span className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider">{t('net_profit') || 'Sof foyda'}</span>
                                        <Tooltip content={formatCurrency(stats.netProfit)}>
                                            <div className={`text-2xl md:text-[2.5rem] font-black tracking-tighter leading-none ${stats.netProfit >= 0 ? 'text-blue-600' : 'text-rose-500'}`}>
                                                {formatCompactNumber(stats.netProfit)}
                                            </div>
                                        </Tooltip>
                                    </div>
                                    <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-colors duration-300 ${stats.netProfit >= 0 ? 'bg-blue-50 group-hover:bg-blue-100' : 'bg-rose-50 group-hover:bg-rose-100'}`}>
                                        <Wallet className={`w-5 h-5 md:w-7 md:h-7 stroke-[2.5] ${stats.netProfit >= 0 ? 'text-blue-600' : 'text-rose-600'}`} />
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
                                {/* Date Range and Filters */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                    {/* Date Range Box */}
                                    <div className="flex items-center justify-center gap-0 bg-slate-50 border border-slate-200 rounded-2xl p-1 h-[52px] shadow-sm flex-1 sm:flex-none sm:w-[380px]">
                                        <div className="flex-1 min-w-0">
                                            <CustomDatePicker
                                                value={startDate}
                                                onChange={(date) => setStartDate(date)}
                                                placeholder={t('start_date') || 'Start Date'}
                                                minimal
                                            />
                                        </div>
                                        <div className="w-px h-6 bg-slate-300 shrink-0 mx-1" />
                                        <div className="flex-1 min-w-0">
                                            <CustomDatePicker
                                                value={endDate}
                                                onChange={(date) => setEndDate(date)}
                                                placeholder={t('end_date') || 'End Date'}
                                                minimal
                                            />
                                        </div>
                                    </div>

                                    {/* Quick Filters */}
                                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0 overflow-x-auto">
                                        {(['week', 'month', 'all'] as const).map((f) => {
                                            const labelKey = f === 'week' ? 'weekly' : f === 'month' ? 'monthly' : 'yearly';
                                            const isActive = dateFilter === f;
                                            return (
                                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                    key={f}
                                                    onClick={() => handleDateFilterChange(f)}
                                                    className={`
                                                                relative px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all capitalize duration-300 whitespace-nowrap flex-1 sm:flex-none text-center z-10
                                                                ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}
                                                            `}
                                                >
                                                    {isActive && (
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
                                                    <span className="relative z-10">
                                                        {t(labelKey) || (f === 'all' ? 'Yillik' : f)}
                                                    </span>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* 3D BAR CHART — synced with actual data filters via stats */}
                            <div className="pt-8 border-t border-slate-100/60 pb-0">
                                <Chart3D
                                    data={timeSeriesData}
                                    maxBarHeight={260}
                                />
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
                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                onClick={() => setLayout('grid')}
                                className={`p-3 rounded-xl transition-all duration-300 ${layout === 'grid' ? 'bg-white shadow-md text-promed-primary scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                onClick={() => setLayout('list')}
                                className={`p-3 rounded-xl transition-all duration-300 ${layout === 'list' ? 'bg-white shadow-md text-promed-primary scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                            >
                                <List className="w-5 h-5" />
                            </motion.button>
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
                                                if (!isViewer) {
                                                    setInitialPatientId(patient.id);
                                                    setIsModalOpen(true);
                                                }
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
                                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                            onClick={() => {
                                                                setInitialPatientId(patient.id);
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="text-slate-300 hover:text-promed-primary transition-colors p-2 hover:bg-promed-light rounded-xl"
                                                        >
                                                            <Plus className="w-5 h-5 stroke-[3]" />
                                                        </motion.button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Patients Pagination Controls */}
                        <Pagination
                            currentPage={patientsPage}
                            totalPages={totalPatientPages}
                            onPageChange={setPatientsPage}
                        />
                    </div>
                </div>
            ) : (
                <div
                    key="transactions"
                    className="flex flex-col bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden relative z-10"
                >
                    {/* --- FILTER TOOLBAR --- */}
                    <div className="p-4 md:p-6 border-b border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

                            {/* Category Filter */}
                            <div className="md:col-span-3 flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-gray-500 ml-1">{t('category') || 'Kategoriya'}</label>
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
                                <label className="text-xs font-medium text-gray-500 ml-1">{t('time_range') || 'Vaqt Oralig‘i'}</label>
                                <div className="flex items-center gap-0 bg-slate-50 border border-slate-300 rounded-2xl p-1 h-[52px] hover:border-slate-400 transition-colors w-full overflow-hidden">
                                    <div className="flex-1 min-w-0">
                                        <CustomDatePicker
                                            value={startDate}
                                            onChange={setStartDate}
                                            placeholder={t('start_date') || 'Start Date'}
                                            minimal
                                        />
                                    </div>
                                    <div className="w-px h-6 bg-slate-300 shrink-0 mx-1" />
                                    <div className="flex-1 min-w-0">
                                        <CustomDatePicker
                                            value={endDate}
                                            onChange={setEndDate}
                                            placeholder={t('end_date') || 'End Date'}
                                            minimal
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Type Filter */}
                            <div className="md:col-span-3 flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-gray-500 ml-1">{t('transaction_type') || 'O‘tkazma Turi'}</label>
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
                    {(() => {
                        const incomeVal = filteredTransactionsList.filter(t => t.type === 'income' && !t.returned && !t.isVoided).reduce((sum, t) => sum + t.amount, 0);
                        const expenseVal = filteredTransactionsList.filter(t => t.type === 'expense' && !t.returned && !t.isVoided).reduce((sum, t) => sum + t.amount, 0);
                        return (
                            <div className="flex flex-col sm:flex-row items-stretch gap-4 px-4 md:px-6 py-4 border-b border-slate-100 bg-white/50">
                                {/* Income Card Premium */}
                                <div
                                    className="flex-1 flex items-center gap-3 md:gap-4 shadow-[0_4px_12px_-4px_rgba(16,185,129,0.3)] px-4 py-3 md:px-5 md:py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden"
                                    style={{ background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)' }}
                                >
                                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30 backdrop-blur-md z-10 group-hover:scale-105 transition-transform">
                                        <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6 text-white stroke-[2.5] drop-shadow-sm" />
                                    </div>
                                    <div className="flex flex-col min-w-0 z-10 text-white justify-center">
                                        <span className="text-emerald-50 font-bold text-[10px] md:text-[11px] uppercase tracking-wider mb-0.5 opacity-90">{t('total_income') || 'Jami Daromad'}</span>
                                        <span className="font-black text-lg md:text-xl leading-none truncate block drop-shadow-sm tracking-tight">
                                            +{formatCurrency(incomeVal)}
                                        </span>
                                    </div>
                                </div>

                                {/* Expense Card Premium */}
                                <div
                                    className="flex-1 flex items-center gap-3 md:gap-4 shadow-[0_4px_12px_-4px_rgba(244,63,94,0.3)] px-4 py-3 md:px-5 md:py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden"
                                    style={{ background: 'linear-gradient(180deg, #F43F5E 0%, #E11D48 100%)' }}
                                >
                                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30 backdrop-blur-md z-10 group-hover:scale-105 transition-transform">
                                        <ArrowDownRight className="w-5 h-5 md:w-6 md:h-6 text-white stroke-[2.5] drop-shadow-sm" />
                                    </div>
                                    <div className="flex flex-col min-w-0 z-10 text-white justify-center">
                                        <span className="text-rose-50 font-bold text-[10px] md:text-[11px] uppercase tracking-wider mb-0.5 opacity-90">{t('total_expenses') || 'Jami Xarajatlar'}</span>
                                        <span className="font-black text-lg md:text-xl leading-none truncate block drop-shadow-sm tracking-tight">
                                            -{formatCurrency(expenseVal)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* --- TRANSACTIONS LIST --- */}
                    <div className="flex-1 bg-slate-50 p-0">
                        {filteredTransactionsList.length > 0 ? (
                            <div className="divide-y divide-slate-200">
                                {paginatedTransactions.map((tx) => {
                                    const patient = tx.patientId ? patientList.find(p => p.id === tx.patientId) : null;
                                    const staff = tx.staffId ? staffList.find(s => s.id === tx.staffId) : null;
                                    const isIncome = tx.type === 'income';
                                    const isVoided = !!tx.isVoided;
                                    const isReturned = !!tx.returned;

                                    return (
                                        <div
                                            key={tx.id}
                                            data-transaction-id={tx.id}
                                            role="listitem"
                                            aria-label={`${t(tx.category.toLowerCase()) || tx.category} — ${isIncome ? '+' : '-'}${formatCurrency(tx.amount)}`}
                                            className={`group border-b border-slate-100 last:border-b-0 px-4 py-3.5 hover:bg-slate-50/70 transition-all duration-500 ${isReturned ? 'opacity-60' : ''} ${isVoided ? 'opacity-50' : ''} ${activeHighlight === tx.id ? 'bg-gradient-to-r from-blue-50/90 via-blue-50/50 to-white ring-2 ring-blue-500/70 rounded-2xl my-1.5 mx-1 shadow-lg shadow-blue-500/10 border-b-0 relative z-10' : 'bg-white'}`}
                                        >
                                            {/* ── Row 1: icon · amount · actions ── */}
                                            <div className="flex items-center gap-3">
                                                {/* Type Icon */}
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isVoided
                                                    ? 'bg-slate-100 text-slate-400'
                                                    : isIncome
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : 'bg-rose-50 text-rose-500'
                                                    }`}>
                                                    {isVoided
                                                        ? <Trash2 className="w-4 h-4" />
                                                        : isIncome
                                                            ? <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                                                            : <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                                                    }
                                                </div>

                                                {/* Amount — grows to fill space */}
                                                <div className={`flex-1 font-black text-base leading-none ${isVoided
                                                    ? 'text-slate-400 line-through'
                                                    : isIncome
                                                        ? 'text-emerald-600'
                                                        : 'text-rose-500'
                                                    }`}>
                                                    {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                                                </div>

                                                {/* Action buttons — always visible on mobile, not hidden behind hover */}
                                                {!isViewer && (
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {!isReturned && !isVoided && tx.amount !== 0 && (
                                                            <motion.button
                                                                whileTap={{ scale: 0.92 }}
                                                                transition={{ type: 'spring', stiffness: 800, damping: 35 }}
                                                                onClick={() => handleReturn(tx.id)}
                                                                aria-label={t('return_transaction') || 'Return Transaction'}
                                                                className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 active:bg-amber-100 transition-colors"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                            </motion.button>
                                                        )}
                                                        <motion.button
                                                            whileTap={{ scale: 0.92 }}
                                                            transition={{ type: 'spring', stiffness: 800, damping: 35 }}
                                                            onClick={() => isVoided ? handleRestore(tx.id) : handleDelete(tx.id)}
                                                            aria-label={isVoided ? (t('restore') || 'Restore') : (t('delete') || 'Delete')}
                                                            className={`p-2 rounded-xl transition-colors active:scale-95 ${isVoided
                                                                ? 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'
                                                                : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 active:bg-rose-100'
                                                                }`}
                                                        >
                                                            {isVoided ? <RotateCcw className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                                                        </motion.button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── Row 2: meta info ── */}
                                            <div className="mt-2 pl-12 flex flex-col gap-1.5">
                                                {/* Category + badges + date */}
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <span className={`text-sm font-bold capitalize ${isVoided ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                        {t(tx.category.toLowerCase()) || tx.category}
                                                    </span>
                                                    {isReturned && (
                                                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-600 text-[10px] font-bold uppercase tracking-wide">
                                                            {t('returned') || 'Returned'}
                                                        </span>
                                                    )}
                                                    {isVoided && (
                                                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wide">
                                                            {t('cancelled') || 'Bekor'}
                                                        </span>
                                                    )}
                                                    <span className="text-slate-400 text-xs font-medium">
                                                        {format(new Date(tx.date), 'dd MMM yyyy')}
                                                        {tx.time && <span> · {tx.time}</span>}
                                                    </span>
                                                </div>

                                                {/* Description / patient / staff chips */}
                                                {(tx.description || patient || staff) && (
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                        {tx.description && (() => {
                                                            const rawDesc = tx.description.replace('[Split]', '').trim();
                                                            const isSplit = tx.description.startsWith('[Split]');

                                                            // Hide if it just repeats the staff's name or is a generic salary/patient tag.
                                                            if (staff && rawDesc === staff.fullName) return null;
                                                            if (staff && rawDesc.toLowerCase().includes('oylik')) return null;
                                                            if (staff && rawDesc.toLowerCase().includes('salary')) return null;
                                                            if (patient && rawDesc === patient.fullName) return null;

                                                            return (
                                                                <span className="text-[12px] text-slate-500 font-medium truncate max-w-[200px] flex items-center bg-slate-100 rounded-full px-2 py-0.5 border border-slate-200">
                                                                    {isSplit ? (t('split_from') ? t('split_from').replace('Bo\'linma', 'Ulush') : 'Ulush') : tx.description}
                                                                </span>
                                                            );
                                                        })()}

                                                        {patient && (
                                                            <div
                                                                className="flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer pl-0.5 pr-3 py-[3px] rounded-full border border-sky-100/60 shadow-sm group/patient"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onPatientClick?.(patient.id);
                                                                }}
                                                                title={t('patient') || 'Bemor'}
                                                            >
                                                                <div className="w-6 h-6 rounded-full bg-sky-200 overflow-hidden shrink-0 flex items-center justify-center border-2 border-white shadow-sm">
                                                                    {patient.profileImage ? (
                                                                        <ImageWithFallback src={patient.profileImage || ''} alt={patient.fullName} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <User size={11} className="text-sky-600" />
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col justify-center">
                                                                    <span className="text-[8px] font-bold uppercase tracking-widest text-sky-500 leading-none mb-[3px]">{t('patient') || 'Bemor'}</span>
                                                                    <span className="text-[12px] font-bold text-sky-900 max-w-[150px] md:max-w-[200px] truncate leading-none">{patient.fullName}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {staff && (
                                                            <div
                                                                className="flex items-center gap-1.5 pl-0.5 pr-3 py-[3px] rounded-full bg-fuchsia-50 border border-fuchsia-100/60 shadow-sm"
                                                                title={t('doctor_staff') || 'Xodim'}
                                                            >
                                                                <div className="w-6 h-6 rounded-full bg-fuchsia-200 overflow-hidden shrink-0 flex items-center justify-center border-2 border-white shadow-sm">
                                                                    {staff.imageUrl ? <img src={staff.imageUrl} alt={staff.fullName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-violet-200 text-fuchsia-700 text-[11px] font-bold">{staff.fullName.charAt(0)}</div>}
                                                                </div>
                                                                <div className="flex flex-col justify-center">
                                                                    <span className="text-[8px] font-bold uppercase tracking-widest text-fuchsia-500 leading-none mb-[3px]">{t('staff_member') || 'Xodim'}</span>
                                                                    <span className="text-[12px] font-bold text-fuchsia-900 max-w-[150px] md:max-w-[200px] truncate leading-none">{staff.fullName}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Transactions Pagination - KISS Method */}
                                <Pagination
                                    currentPage={transactionsPage}
                                    totalPages={totalTransactionPages}
                                    onPageChange={setTransactionsPage}
                                />
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

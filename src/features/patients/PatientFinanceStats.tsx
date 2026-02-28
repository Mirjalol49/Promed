import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

import { useLanguage } from '../../contexts/LanguageContext';
import { Patient, Transaction, TransactionCategory } from '../../types';
import { subscribeToTransactions, deleteTransaction, restoreTransaction } from '../../lib/financeService';
import { useToast } from '../../contexts/ToastContext';
import {
    CreditCard,
    Plus,
    Wallet,
    CheckCircle2,
    ChevronDown,
    User,
    Percent,
    Building2,
    ArrowDownRight,
    TrendingUp,
    ChevronLeft,
    ChevronRight,
    X as XIcon,
    TrendingDown,
    PieChart,
    Trash2,
    RotateCcw,
    Activity,
    Syringe,
    Users,
    Calendar as CalendarIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { AddPaymentModal } from './AddPaymentModal';
import { formatWithSpaces } from '../../lib/formatters';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import DeleteModal from '../../components/ui/DeleteModal';
import { subscribeToStaff } from '../../lib/staffService';
import { Staff } from '../../types';

interface PatientFinanceStatsProps {
    patient: Patient;
    accountId: string;
}

import { useAccount } from '../../contexts/AccountContext';
import { Pagination } from '../../components/ui/Pagination';

interface GroupedTransaction {
    income: Transaction;
    splits: Transaction[];
    clinicAmount: number;
    clinicPercent: number;
}

// A unified timeline item: either grouped income or standalone expense
type TimelineItem =
    | { kind: 'income'; data: GroupedTransaction }
    | { kind: 'expense'; data: Transaction };

// ── Color palette for split items ──
const SPLIT_COLORS = [
    { bg: 'bg-violet-500', light: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-600', ring: 'ring-violet-100' },
    { bg: 'bg-blue-500', light: 'bg-[#ddedf8]', border: 'border-blue-100', text: 'text-blue-600', ring: 'ring-blue-100' },
    { bg: 'bg-pink-500', light: 'bg-pink-50', border: 'border-pink-100', text: 'text-pink-600', ring: 'ring-pink-100' },
    { bg: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600', ring: 'ring-orange-100' },
    { bg: 'bg-cyan-500', light: 'bg-cyan-50', border: 'border-cyan-100', text: 'text-cyan-600', ring: 'ring-cyan-100' },
];

export const PatientFinanceStats: React.FC<PatientFinanceStatsProps> = ({ patient, accountId }) => {
    const { t, language } = useLanguage();
    const { success, error: toastError } = useToast();
    const { role } = useAccount();
    const isViewer = role === 'viewer';
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingPayment, setIsAddingPayment] = useState(false);
    const [filterCategory, setFilterCategory] = useState<'all' | 'income' | 'expense' | 'surgery' | 'injection'>('all');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [deleteItem, setDeleteItem] = useState<TimelineItem | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
    const monthPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterCategory, selectedMonth, pickerYear]);

    // Click outside to close month picker
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
                setIsMonthPickerOpen(false);
            }
        };
        if (isMonthPickerOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMonthPickerOpen]);

    const MONTH_NAMES_SHORT_MAP: Record<string, string[]> = {
        en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        uz: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
        ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
    };
    const MONTH_NAMES_FULL_MAP: Record<string, string[]> = {
        en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'],
        ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    };
    const MONTH_NAMES_SHORT = MONTH_NAMES_SHORT_MAP[language] || MONTH_NAMES_SHORT_MAP.uz;
    const MONTH_NAMES_FULL = MONTH_NAMES_FULL_MAP[language] || MONTH_NAMES_FULL_MAP.uz;

    const getMonthShort = (dateStr: string) => {
        const d = new Date(dateStr);
        return MONTH_NAMES_SHORT[d.getMonth()];
    };

    const handleSelectMonth = (monthIndex: number) => {
        const mm = String(monthIndex + 1).padStart(2, '0');
        setSelectedMonth(`${pickerYear}-${mm}`);
        setIsMonthPickerOpen(false);
    };

    const handleClearMonth = () => {
        setSelectedMonth('');
        setIsMonthPickerOpen(false);
    };

    const selectedMonthLabel = useMemo(() => {
        if (!selectedMonth) return t('all_months') || 'Barcha oylar';
        const [y, m] = selectedMonth.split('-');
        return `${MONTH_NAMES_FULL[parseInt(m) - 1]} ${y}`;
    }, [selectedMonth, t]);

    // Filter by Month first (shared by Timeline and Stats)
    const dateFilteredTransactions = useMemo(() => {
        if (!selectedMonth) return transactions;
        return transactions.filter(t => t.date.startsWith(selectedMonth));
    }, [transactions, selectedMonth]);

    const performDelete = async () => {
        if (!deleteItem) return;
        try {
            if (deleteItem.kind === 'income') {
                const { splits, income } = deleteItem.data;
                if (splits.length > 0) {
                    await Promise.all(splits.map(s => deleteTransaction(s.id)));
                }
                await deleteTransaction(income.id);
            } else {
                await deleteTransaction(deleteItem.data.id);
            }
            success(t('transaction_deleted') || "O'chirildi", t('transaction_deleted_msg') || "Tranzaksiya muvaffaqiyatli o'chirildi");
        } catch (err) {
            console.error(err);
            toastError(t('error') || "Xatolik", t('error_deleting') || "O'chirishda xatolik yuz berdi");
        } finally {
            setDeleteItem(null);
        }
    };

    const handleRestore = async (item: TimelineItem) => {
        try {
            if (item.kind === 'income') {
                const { splits, income } = item.data;
                // Restore income
                await restoreTransaction(income.id);
                // Restore splits
                if (splits.length > 0) {
                    await Promise.all(splits.map(s => restoreTransaction(s.id)));
                }
            } else {
                await restoreTransaction(item.data.id);
            }
            success(t('restored') || "Tiklandi", "Tranzaksiya muvaffaqiyatli tiklandi");
        } catch (err) {
            console.error(err);
            toastError(t('error') || "Xatolik", "Xatolik yuz berdi");
        }
    };

    // Fetch transactions
    useEffect(() => {
        if (!accountId) return;
        const unsub = subscribeToTransactions(accountId, (allTransactions) => {
            const patientTx = allTransactions.filter(t => t.patientId === patient.id);
            patientTx.sort((a, b) => {
                const strA = `${a.date}T${a.time || '00:00'}`;
                const strB = `${b.date}T${b.time || '00:00'}`;
                return strB.localeCompare(strA);
            });
            setTransactions(patientTx);
            setLoading(false);
        });
        return () => unsub();
    }, [accountId, patient.id]);

    // Fetch staff for avatars
    useEffect(() => {
        if (!accountId) return;
        const unsub = subscribeToStaff(accountId, (staff) => setStaffList(staff));
        return () => unsub();
    }, [accountId]);

    // Build unified timeline: grouped incomes + standalone expenses
    const timeline = useMemo((): TimelineItem[] => {
        // Use dateFilteredTransactions instead of transactions
        const incomes = dateFilteredTransactions.filter(t => t.type === 'income' && !t.returned);
        const allSplits = dateFilteredTransactions.filter(t => t.description?.startsWith('[Split]'));
        const splitIds = new Set(allSplits.map(s => s.id));
        // Standalone expenses = expense type, not a [Split], for this patient
        const standaloneExpenses = dateFilteredTransactions.filter(t =>
            t.type === 'expense' && !splitIds.has(t.id) && !t.description?.startsWith('[Split]')
        );

        // Build income items if category allows
        let incomeItems: TimelineItem[] = [];
        let expenseItems: TimelineItem[] = [];

        if (filterCategory === 'all' || filterCategory === 'income' || filterCategory === 'surgery' || filterCategory === 'injection') {
            const filteredIncomes = (filterCategory === 'all' || filterCategory === 'income')
                ? incomes
                : incomes.filter(t => t.category === filterCategory);

            incomeItems = filteredIncomes.map(income => {
                const relatedSplits = allSplits.filter(s =>
                    s.date === income.date &&
                    s.time === income.time &&
                    s.patientId === income.patientId
                );
                const totalSplitAmount = relatedSplits.reduce((sum, s) => sum + Number(s.amount), 0);
                const clinicAmount = Math.max(0, Number(income.amount) - totalSplitAmount);
                const clinicPercent = Number(income.amount) > 0
                    ? Math.round((clinicAmount / Number(income.amount)) * 100) : 100;

                return { kind: 'income', data: { income, splits: relatedSplits, clinicAmount, clinicPercent } };
            });
        }

        if (filterCategory === 'all' || filterCategory === 'expense') {
            const filteredExpenses = (filterCategory === 'all' || filterCategory === 'expense')
                ? standaloneExpenses
                : standaloneExpenses.filter(t => t.category === filterCategory);

            expenseItems = filteredExpenses.map(exp => ({
                kind: 'expense',
                data: exp
            }));
        }

        // Merge and sort by date+time descending using robust string comparison
        const all = [...incomeItems, ...expenseItems];
        all.sort((a, b) => {
            const txA = a.kind === 'income' ? a.data.income : a.data;
            const txB = b.kind === 'income' ? b.data.income : b.data;
            const strA = `${txA.date}T${txA.time || '00:00'}`;
            const strB = `${txB.date}T${txB.time || '00:00'}`;
            if (strA === strB) {
                return txB.id.localeCompare(txA.id);
            }
            return strB.localeCompare(strA);
        });
        return all;
    }, [dateFilteredTransactions, filterCategory]);

    const totalPages = Math.ceil(timeline.length / ITEMS_PER_PAGE);
    const paginatedTimeline = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return timeline.slice(start, start + ITEMS_PER_PAGE);
    }, [timeline, currentPage]);

    const stats = useMemo(() => {
        // Use dateFilteredTransactions instead of transactions
        const incomes = dateFilteredTransactions.filter(t => t.type === 'income' && !t.returned && !t.isVoided);
        const filteredInc = filterCategory === 'all' ? incomes : incomes.filter(t => t.category === filterCategory);
        const totalPaid = filteredInc.reduce((sum, t) => sum + Number(t.amount), 0);

        const allSplits = dateFilteredTransactions.filter(t => t.description?.startsWith('[Split]'));
        const splitIds = new Set(allSplits.map(s => s.id));
        const standaloneExpenses = dateFilteredTransactions.filter(t =>
            t.type === 'expense' && !splitIds.has(t.id) && !t.description?.startsWith('[Split]') && !t.isVoided
        );
        const totalExpenses = standaloneExpenses.reduce((sum, t) => sum + Number(t.amount), 0);

        return { totalPaid, totalExpenses };
    }, [dateFilteredTransactions, filterCategory]);

    const toggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
                // Auto-scroll to the breakdown after it renders
                setTimeout(() => {
                    const el = document.querySelector(`[data-breakdown-id="${id}"]`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 350);
            }
            return next;
        });
    }, []);

    // Find staff info for a split transaction
    const getStaffForSplit = (tx: Transaction) => {
        if (tx.staffId) return staffList.find(s => s.id === tx.staffId);
        return undefined;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ── Summary Stats ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-8">
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('paid_so_far')}</div>
                        <div className="text-2xl font-black text-emerald-600">
                            {formatWithSpaces(stats.totalPaid)} <span className="text-xs text-slate-400">UZS</span>
                        </div>
                    </div>
                    {stats.totalExpenses > 0 && (
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('expense') || 'Xarajat'}</div>
                            <div className="text-2xl font-black text-rose-500">
                                {formatWithSpaces(stats.totalExpenses)} <span className="text-xs text-slate-400">UZS</span>
                            </div>
                        </div>
                    )}
                </div>
                {!isViewer && (
                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                        onClick={() => setIsAddingPayment(!isAddingPayment)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${isAddingPayment ? 'bg-slate-100 text-slate-600' : 'btn-premium-emerald hover:scale-105 active:scale-95'}`}
                    >
                        {isAddingPayment ? t('cancel') : (
                            <><Plus size={18} strokeWidth={3} />{t('add_payment')}</>
                        )}
                    </motion.button>
                )}
            </div>

            <AddPaymentModal
                isOpen={isAddingPayment}
                onClose={() => setIsAddingPayment(false)}
                patient={patient}
                accountId={accountId}
                transactions={transactions}
            />

            {/* ── Transaction History ── */}
            <div className="flex flex-col gap-5">
                {/* Header */}
                <div className="bg-white rounded-[2rem] px-5 sm:px-6 md:px-8 py-5 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-5 md:gap-6">
                    <h3 className="text-xl font-black text-slate-800 flex items-center justify-center md:justify-start gap-3">
                        <div className="p-2 bg-promed-light rounded-xl shrink-0">
                            <Wallet className="text-promed-primary w-5 h-5" />
                        </div>
                        <span className="truncate">{t('transaction_history')}</span>
                    </h3>

                    <div className="flex flex-col items-center md:flex-row md:items-center gap-3 w-full md:w-auto min-w-0">
                        {/* Custom Month Picker */}
                        <div className="relative w-full max-w-[280px] sm:max-w-sm mx-auto md:w-auto md:mx-0 flex justify-center md:block" ref={monthPickerRef}>
                            {/* Trigger Button */}
                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                onClick={() => {
                                    if (!isMonthPickerOpen && selectedMonth) {
                                        setPickerYear(parseInt(selectedMonth.split('-')[0]));
                                    } else if (!isMonthPickerOpen) {
                                        setPickerYear(new Date().getFullYear());
                                    }
                                    setIsMonthPickerOpen(!isMonthPickerOpen);
                                }}
                                className={`flex items-center justify-center gap-2.5 pl-3.5 pr-4 py-2.5 w-full md:w-auto rounded-2xl text-sm font-bold transition-all duration-200 border ${selectedMonth
                                    ? 'bg-promed-primary/5 border-promed-primary/20 text-promed-primary hover:bg-promed-primary/10'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                                    } ${isMonthPickerOpen ? 'ring-2 ring-promed-primary/20 shadow-lg shadow-promed-primary/5' : ''}`}
                            >
                                <CalendarIcon size={16} strokeWidth={2.5} />
                                <span className="whitespace-nowrap">{selectedMonthLabel}</span>
                                {selectedMonth && (
                                    <span
                                        onClick={(e) => { e.stopPropagation(); handleClearMonth(); }}
                                        className="ml-1 p-0.5 rounded-full hover:bg-promed-primary/20 transition-colors cursor-pointer"
                                    >
                                        <XIcon size={12} strokeWidth={3} />
                                    </span>
                                )}
                            </motion.button>

                            {/* Dropdown */}
                            {isMonthPickerOpen && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 md:translate-x-0 md:left-0 mt-2 z-50 w-[280px] bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Year Navigation */}
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={() => setPickerYear(y => y - 1)}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all active:scale-90"
                                        >
                                            <ChevronLeft size={18} strokeWidth={2.5} />
                                        </motion.button>
                                        <span className="text-base font-black text-slate-800 tracking-tight">{pickerYear}</span>
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={() => setPickerYear(y => y + 1)}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all active:scale-90"
                                        >
                                            <ChevronRight size={18} strokeWidth={2.5} />
                                        </motion.button>
                                    </div>

                                    {/* Month Grid */}
                                    <div className="grid grid-cols-3 gap-1.5 p-4">
                                        {MONTH_NAMES_SHORT.map((name, idx) => {
                                            const mm = String(idx + 1).padStart(2, '0');
                                            const value = `${pickerYear}-${mm}`;
                                            const isActive = selectedMonth === value;
                                            const isCurrentMonth = new Date().getFullYear() === pickerYear && new Date().getMonth() === idx;

                                            return (
                                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                    key={idx}
                                                    onClick={() => handleSelectMonth(idx)}
                                                    className={`relative py-2.5 px-1 rounded-xl text-[13px] font-bold transition-all duration-150 ${isActive
                                                        ? 'bg-promed-primary text-white shadow-md shadow-promed-primary/30 scale-105'
                                                        : isCurrentMonth
                                                            ? 'bg-promed-primary/8 text-promed-primary ring-1 ring-promed-primary/20 hover:bg-promed-primary/15'
                                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 active:scale-95'
                                                        }`}
                                                >
                                                    {name}
                                                </motion.button>
                                            );
                                        })}
                                    </div>

                                    {/* Footer */}
                                    <div className="px-4 pb-4 flex items-center gap-2">
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={handleClearMonth}
                                            className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                                        >
                                            {t('clear') || 'Tozalash'}
                                        </motion.button>
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={() => {
                                                const now = new Date();
                                                setPickerYear(now.getFullYear());
                                                handleSelectMonth(now.getMonth());
                                            }}
                                            className="flex-1 py-2 rounded-xl text-xs font-bold text-promed-primary hover:bg-promed-primary/5 transition-all"
                                        >
                                            {t('this_month') || 'Shu oy'}
                                        </motion.button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Category Filters */}
                        <div className="relative flex items-center bg-white/90 rounded-2xl p-1.5 border border-slate-200/50 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-xl overflow-x-auto no-scrollbar w-full max-w-[calc(100vw-3rem)] sm:max-w-[400px] md:max-w-none justify-start md:justify-center mx-auto md:mx-0">
                            {(['all', 'income', 'expense', 'surgery', 'injection'] as const).map(cat => (
                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                    key={cat}
                                    onClick={() => setFilterCategory(cat)}
                                    className={`relative z-10 flex items-center shrink-0 min-w-max whitespace-nowrap px-5 py-2.5 rounded-xl text-[13px] font-bold transition-colors duration-300 ${filterCategory === cat ? 'text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {filterCategory === cat && (
                                        <motion.div
                                            layoutId="FinanceCategoryPill"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                            className="absolute inset-0 rounded-xl overflow-hidden"
                                            style={{
                                                background: 'linear-gradient(180deg, #4A85FF 0%, #0044FF 100%)',
                                                boxShadow: '0 8px 16px -4px rgba(0, 68, 255, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.45), inset 0 -2px 1px rgba(0, 0, 0, 0.15)'
                                            }}
                                        >
                                            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                                        </motion.div>
                                    )}
                                    <span className="relative z-10">{cat === 'all' ? t('filter_all') : t(cat)}</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Transaction List ── */}
                <div className="min-h-[600px] max-h-[calc(100vh-280px)] overflow-y-auto no-scrollbar pr-1 -mr-1 pb-4">
                    {timeline.length > 0 ? (
                        <>
                            <div>
                                {paginatedTimeline.map((item, itemIdx) => {
                                    // ══════════════════════════════
                                    // ── EXPENSE ROW ──
                                    // ══════════════════════════════
                                    if (item.kind === 'expense') {
                                        const exp = item.data;
                                        const isVoided = !!exp.isVoided;
                                        return (
                                            <div
                                                key={exp.id}
                                                className={`group relative px-4 py-3 md:px-6 md:py-3.5 flex flex-col md:flex-row md:items-center gap-2.5 md:gap-4 transition-all duration-200 mx-3 md:mx-5 mb-2 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md ${isVoided ? 'opacity-75' : ''}`}
                                            >
                                                <div className="hidden md:flex flex-col items-center justify-center w-12 h-12 bg-slate-100/80 rounded-xl border border-slate-200 shadow-sm shrink-0 group-hover:scale-105 transition-all duration-300">
                                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">{getMonthShort(exp.date)}</span>
                                                    <span className="text-[1.25rem] font-black text-slate-800 leading-none">{format(new Date(exp.date), 'dd')}</span>
                                                    <span className="text-[8px] font-bold text-rose-500 leading-none mt-0.5">{exp.time || '--:--'}</span>
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 w-full md:w-auto min-w-0">
                                                    <div className="flex justify-between items-start gap-3 mb-1.5 md:mb-1">
                                                        <div className={`font-medium text-slate-600 text-sm leading-snug line-clamp-2 md:line-clamp-none ${isVoided ? 'line-through decoration-slate-400 text-slate-400' : ''}`}>
                                                            {exp.description ? (
                                                                exp.description.startsWith('[Split]')
                                                                    ? `${t('split_from') || '[Split] '}${exp.description.replace('[Split]', '').trim()}`
                                                                    : exp.description
                                                            ) : (t('expense') || 'Xarajat')}
                                                        </div>

                                                        {/* Mobile Amount */}
                                                        <div className="md:hidden text-right shrink-0">
                                                            <div className={`text-lg font-black tabular-nums ${isVoided ? 'text-slate-400 line-through decoration-slate-400' : 'text-rose-500'}`}>
                                                                -{formatWithSpaces(exp.amount)} <span className={`text-[10px] font-bold ${isVoided ? 'text-slate-300 no-underline' : 'text-rose-300'}`}>UZS</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {isVoided ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-500">
                                                                BEKOR QILINGAN
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-500 ring-1 ring-rose-100">
                                                                <TrendingDown size={10} />
                                                                {t('expense') || 'Xarajat'}
                                                            </span>
                                                        )}
                                                        <span className="md:hidden text-[10px] font-bold text-slate-400 ml-auto">
                                                            {getMonthShort(exp.date)} {format(new Date(exp.date), 'dd')} • {exp.time || '--:--'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Amount */}
                                                <div className="hidden md:block text-right shrink-0">
                                                    <div className={`text-lg font-black tabular-nums ${isVoided ? 'text-slate-400 line-through decoration-slate-400' : 'text-rose-500'}`}>
                                                        -{formatWithSpaces(exp.amount)} <span className={`text-[11px] font-bold ml-0.5 ${isVoided ? 'text-slate-300 no-underline' : 'text-rose-300'}`}>UZS</span>
                                                    </div>
                                                </div>

                                                {!isViewer && (
                                                    <div className="flex items-center gap-2 self-end md:self-center w-full md:w-auto justify-end mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 md:border-transparent">
                                                        {isVoided ? (
                                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                                onClick={(e) => { e.stopPropagation(); handleRestore(item); }}
                                                                className="flex p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                                title="Tranzaksiyani tiklash"
                                                            >
                                                                <RotateCcw size={18} strokeWidth={2.5} />
                                                            </motion.button>
                                                        ) : (
                                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                                onClick={(e) => { e.stopPropagation(); setDeleteItem(item); }}
                                                                className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-all"
                                                                title={t('delete') || "O'chirish"}
                                                            >
                                                                <Trash2 size={16} strokeWidth={2.5} />
                                                            </motion.button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // ══════════════════════════════
                                    // ── INCOME ROW (grouped) ──
                                    // ══════════════════════════════
                                    const { income, splits, clinicAmount, clinicPercent } = item.data;
                                    const hasSplits = splits.length > 0;
                                    const isVoided = !!income.isVoided;
                                    const isExpanded = expandedIds.has(income.id);
                                    const totalAmount = Number(income.amount);

                                    return (
                                        <div key={income.id}>
                                            {/* ── Main Transaction Row ── */}
                                            <div
                                                className={`group relative px-4 py-3 md:px-6 md:py-3.5 flex flex-col md:flex-row md:items-center gap-2.5 md:gap-4 transition-all duration-200 mx-3 md:mx-5 mb-2 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md ${isVoided ? 'opacity-75' : (hasSplits ? 'cursor-pointer' : '')} ${isExpanded ? 'ring-2 ring-blue-100 shadow-md' : ''}`}
                                                onClick={() => !isVoided && hasSplits && toggleExpand(income.id)}
                                            >
                                                <div className="hidden md:flex flex-col items-center justify-center w-12 h-12 bg-slate-100/80 rounded-xl border border-slate-200 shadow-sm shrink-0 group-hover:scale-105 transition-all duration-300">
                                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">{getMonthShort(income.date)}</span>
                                                    <span className="text-[1.25rem] font-black text-slate-800 leading-none">{format(new Date(income.date), 'dd')}</span>
                                                    <span className="text-[8px] font-bold text-blue-600 leading-none mt-0.5">{income.time || '--:--'}</span>
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 w-full md:w-auto min-w-0">
                                                    <div className="flex justify-between items-start gap-3 mb-1.5 md:mb-1">
                                                        <div className={`font-medium text-slate-600 text-sm leading-snug line-clamp-2 md:line-clamp-none ${isVoided ? 'line-through decoration-slate-400 text-slate-400' : ''}`}>
                                                            {income.description && income.description !== t(income.category) && income.description !== income.category
                                                                ? income.description.replace(` - ${patient.fullName}`, '')
                                                                : (t('payment_received') || "To'lov qabul qilindi")}
                                                        </div>

                                                        {/* Mobile Amount */}
                                                        <div className="md:hidden text-right shrink-0">
                                                            <div className={`text-lg font-black tabular-nums ${isVoided ? 'text-slate-400 line-through decoration-slate-400' : 'text-emerald-500'}`}>
                                                                +{formatWithSpaces(income.amount)} <span className={`text-[10px] font-bold ${isVoided ? 'text-slate-300 no-underline' : 'text-emerald-300'}`}>UZS</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {isVoided ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-500">
                                                                BEKOR QILINGAN
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${income.category === 'surgery'
                                                                    ? 'bg-violet-50 text-violet-600 ring-1 ring-violet-100'
                                                                    : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
                                                                    }`}>
                                                                    {income.category === 'surgery' ? <Activity size={10} /> : <Syringe size={10} />}
                                                                    {t(income.category)}
                                                                </span>

                                                                {hasSplits && splits.some(s => s.category === 'salary') && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ddedf8] text-blue-600 text-[9px] font-bold border border-blue-100 uppercase tracking-wide">
                                                                        <Users size={10} />
                                                                        {t('salary_split') || 'Ish haqi'}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                        <span className="md:hidden text-[10px] font-bold text-slate-400 ml-auto">
                                                            {getMonthShort(income.date)} {format(new Date(income.date), 'dd')} • {income.time || '--:--'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {hasSplits && (
                                                    <div className="hidden md:flex ml-auto items-center gap-3">
                                                        {splits.slice(0, 4).map((s, i) => {
                                                            const staff = getStaffForSplit(s);
                                                            const isTax = s.category === 'tax';

                                                            // Smart Name Resolution
                                                            let displayName = '';
                                                            if (isTax) {
                                                                displayName = t('tax') || 'Soliq';
                                                            } else if (staff) {
                                                                displayName = staff.fullName.split(' ')[0];
                                                            } else {
                                                                // Fallback: Try to parse name from description for deleted staff
                                                                // Format usually "[Split] Name"
                                                                const rawName = s.description?.replace('[Split] ', '').trim();
                                                                displayName = rawName ? rawName.split(' ')[0] : (t('unknown') || '???');
                                                            }

                                                            return (
                                                                <div key={i} className="flex flex-col items-center gap-1 min-w-[40px]">
                                                                    {/* Avatar / Icon */}
                                                                    <div className={`w-8 h-8 rounded-full ring-2 ring-white shadow-sm overflow-hidden flex items-center justify-center ${isTax ? SPLIT_COLORS[0].light + ' ' + SPLIT_COLORS[0].text
                                                                        : !staff ? SPLIT_COLORS[(i) % SPLIT_COLORS.length].light + ' ' + SPLIT_COLORS[(i) % SPLIT_COLORS.length].text
                                                                            : 'bg-slate-100'
                                                                        }`}>
                                                                        {isTax ? (
                                                                            <Percent size={14} strokeWidth={3} />
                                                                        ) : staff?.imageUrl ? (
                                                                            <ImageWithFallback src={staff.imageUrl} alt={staff.fullName} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <span className="text-[9px] font-black">
                                                                                {displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {/* Name */}
                                                                    <span className={`text-[9px] font-bold max-w-[50px] truncate text-center leading-none ${!staff && !isTax ? 'text-slate-400 italic' : 'text-slate-500'}`}>
                                                                        {displayName}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                        {splits.length > 4 && (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                                    +{splits.length - 4}
                                                                </div>
                                                                <span className="h-2"></span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Amount */}
                                                <div className="hidden md:block text-right shrink-0 min-w-[100px]">
                                                    <div className={`text-lg font-black tabular-nums tracking-tight ${isVoided ? 'text-slate-400 line-through decoration-slate-400' : 'text-emerald-500'}`}>
                                                        +{formatWithSpaces(income.amount)} <span className={`text-[11px] font-bold ml-0.5 uppercase ${isVoided ? 'text-slate-300 no-underline' : 'text-emerald-300'}`}>UZS</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end md:self-center w-full md:w-auto justify-end mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 md:border-transparent">
                                                    {hasSplits && !isVoided && (
                                                        <motion.div
                                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 text-slate-500 group-hover:bg-blue-500 group-hover:text-white transition-colors"
                                                        >
                                                            <ChevronDown size={18} strokeWidth={2.5} />
                                                        </motion.div>
                                                    )}

                                                    {!isViewer && (
                                                        isVoided ? (
                                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                                onClick={(e) => { e.stopPropagation(); handleRestore(item); }}
                                                                className="flex p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                                title="Tranzaksiyani tiklash"
                                                            >
                                                                <RotateCcw size={18} strokeWidth={2.5} />
                                                            </motion.button>
                                                        ) : (
                                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                                onClick={(e) => { e.stopPropagation(); setDeleteItem(item); }}
                                                                className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-all"
                                                                title={t('delete') || "O'chirish"}
                                                            >
                                                                <Trash2 size={16} strokeWidth={2.5} />
                                                            </motion.button>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            {/* ── Expanded Split Breakdown ── */}
                                            <AnimatePresence>
                                                {hasSplits && isExpanded && (
                                                    <motion.div
                                                        data-breakdown-id={income.id}
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="px-5 pb-5">
                                                            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 overflow-hidden">

                                                                {/* ── Visual Distribution Header ── */}
                                                                <div className="p-5 pb-4">
                                                                    {/* Segment bar */}
                                                                    <div className="flex gap-1 h-2.5 w-full rounded-full overflow-hidden mb-4">
                                                                        <motion.div
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${clinicPercent}%` }}
                                                                            transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
                                                                            className="h-full bg-emerald-400 rounded-full"
                                                                        />
                                                                        {splits.map((s, idx) => {
                                                                            const pct = totalAmount > 0 ? (Number(s.amount) / totalAmount) * 100 : 0;
                                                                            return (
                                                                                <motion.div
                                                                                    key={s.id || idx}
                                                                                    initial={{ width: 0 }}
                                                                                    animate={{ width: `${pct}%` }}
                                                                                    transition={{ delay: 0.15 + idx * 0.05, duration: 0.5, ease: 'easeOut' }}
                                                                                    className={`h-full ${SPLIT_COLORS[idx % SPLIT_COLORS.length].bg} rounded-full`}
                                                                                />
                                                                            );
                                                                        })}
                                                                    </div>

                                                                    {/* Legend pills */}
                                                                    <div className="flex flex-wrap gap-2">
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black ring-1 ring-emerald-100">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                                            Klinika {clinicPercent}%
                                                                        </span>
                                                                        {splits.map((s, idx) => {
                                                                            const pct = totalAmount > 0 ? Math.round((Number(s.amount) / totalAmount) * 100) : 0;
                                                                            const colors = SPLIT_COLORS[idx % SPLIT_COLORS.length];
                                                                            const label = s.description?.replace('[Split] ', '') || '';
                                                                            return (
                                                                                <span key={s.id || idx} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${colors.light} ${colors.text} text-[10px] font-black ring-1 ${colors.ring}`}>
                                                                                    <span className={`w-1.5 h-1.5 rounded-full ${colors.bg}`} />
                                                                                    {label.length > 15 ? label.slice(0, 15) + '…' : label} {pct}%
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>

                                                                {/* ── Split Cards ── */}
                                                                <div className="px-4 pb-3 space-y-2">
                                                                    {splits.map((s, idx) => {
                                                                        const staff = getStaffForSplit(s);
                                                                        const pct = totalAmount > 0 ? Math.round((Number(s.amount) / totalAmount) * 100) : 0;
                                                                        const label = s.description?.replace('[Split] ', '') || '';
                                                                        const colors = SPLIT_COLORS[idx % SPLIT_COLORS.length];
                                                                        const isTax = s.category === 'tax';

                                                                        return (
                                                                            <motion.div
                                                                                key={s.id || idx}
                                                                                initial={{ opacity: 0, y: 10 }}
                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                transition={{ delay: 0.1 + idx * 0.05 }}
                                                                                className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group/card"
                                                                            >
                                                                                {/* Avatar / Icon */}
                                                                                {isTax ? (
                                                                                    <div className={`w-12 h-12 rounded-2xl ${colors.light} flex items-center justify-center ring-1 ${colors.ring} shrink-0 group-hover/card:scale-105 transition-transform`}>
                                                                                        <Percent size={20} className={colors.text} strokeWidth={2.5} />
                                                                                    </div>
                                                                                ) : staff?.imageUrl ? (
                                                                                    <div className="w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-slate-50 shadow-sm shrink-0 group-hover/card:scale-105 transition-transform">
                                                                                        <ImageWithFallback src={staff.imageUrl} alt={staff.fullName} className="w-full h-full object-cover" />
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className={`w-12 h-12 rounded-2xl ${colors.light} flex items-center justify-center ring-1 ${colors.ring} shrink-0 group-hover/card:scale-105 transition-transform`}>
                                                                                        <span className={`text-sm font-black ${colors.text}`}>
                                                                                            {(label || '').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '??'}
                                                                                        </span>
                                                                                    </div>
                                                                                )}

                                                                                {/* Name & Role */}
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="font-black text-slate-800 text-sm truncate mb-0.5">{label || (isTax ? t('tax') : 'Staff')}</div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded-md">
                                                                                            {isTax ? (t('tax') || 'Soliq') : (staff?.role || t('salary') || 'Ish haqi')}
                                                                                        </span>
                                                                                        <span className={`text-[10px] font-semibold ${colors.text} bg-white px-1.5 py-0.5 rounded-md shadow-sm ring-1 ${colors.ring}`}>
                                                                                            {pct}%
                                                                                        </span>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Amount */}
                                                                                <div className="text-right shrink-0">
                                                                                    <div className={`text-lg font-black tabular-nums tracking-tight ${colors.text} flex items-baseline justify-end gap-1`}>
                                                                                        {formatWithSpaces(s.amount)}
                                                                                        <span className="text-[10px] uppercase font-bold text-slate-400">UZS</span>
                                                                                    </div>
                                                                                </div>
                                                                            </motion.div>
                                                                        );
                                                                    })}

                                                                    {/* ── Clinic Remainder Card ── */}
                                                                    {/* ── Clinic Remainder Card ── */}
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        transition={{ delay: 0.1 + splits.length * 0.05 }}
                                                                        className="flex items-center gap-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/60 shadow-sm hover:shadow-md transition-all duration-300 group/card"
                                                                    >
                                                                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center ring-1 ring-emerald-100 shadow-sm shrink-0">
                                                                            <Building2 size={20} className="text-emerald-500" strokeWidth={2.5} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-black text-emerald-900 text-sm mb-0.5">Klinika</div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-100/50 px-1.5 py-0.5 rounded-md">
                                                                                    {t('net_income') || 'Sof daromad'}
                                                                                </span>
                                                                                <span className="text-[10px] font-black text-emerald-600 bg-white px-1.5 py-0.5 rounded-md shadow-sm ring-1 ring-emerald-100">
                                                                                    {clinicPercent}%
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right shrink-0">
                                                                            <div className="text-lg font-black text-emerald-600 tabular-nums tracking-tight flex items-baseline justify-end gap-1">
                                                                                {formatWithSpaces(clinicAmount)}
                                                                                <span className="text-[10px] uppercase font-bold text-emerald-400">UZS</span>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                </div>

                                                                {/* ── Summary Footer ── */}
                                                                <div className="mx-4 mb-4 mt-2 flex items-center justify-between px-6 py-5 bg-slate-50 rounded-2xl border border-slate-100/80">
                                                                    <span className="text-base font-black text-slate-800 uppercase tracking-widest">{t('total') || 'JAMI'}</span>
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className="text-2xl font-black text-emerald-600 tabular-nums tracking-tight">{formatWithSpaces(income.amount)}</span>
                                                                        <span className="text-xs font-bold text-slate-400 uppercase">UZS</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                            {totalPages > 1 && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            )}
                        </>
                    ) : (
                        <div className="py-24 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                                <CreditCard size={32} className="text-slate-300" />
                            </div>
                            <h4 className="font-black text-slate-800 text-xl mb-2">{t('no_payments_yet')}</h4>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">{t('no_payments_desc')}</p>
                            {filterCategory !== 'all' && (
                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} onClick={() => setFilterCategory('all')} className="mt-6 text-promed-primary font-black text-sm hover:underline">
                                    {t('clear_filters')}
                                </motion.button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <DeleteModal
                isOpen={!!deleteItem}
                onClose={() => setDeleteItem(null)}
                onConfirm={performDelete}
                title={t('delete_transaction_title') || "To'lovni o'chirish"}
                description=""
            />
        </div >
    );
};

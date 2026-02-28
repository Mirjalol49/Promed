import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Building2, Calendar, Percent, ChevronDown, Search, User, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Patient, Staff, TransactionCategory, Transaction } from '../../types';
import { addTransaction } from '../../lib/financeService';
import { subscribeToStaff } from '../../lib/staffService';
import { useToast } from '../../contexts/ToastContext';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { CustomDatePicker } from '../../components/ui/CustomDatePicker';
import { Portal } from '../../components/ui/Portal';
import { formatWithSpaces, formatCurrency } from '../../lib/formatters';
import { format } from 'date-fns';
import { enUS, ru, uz } from 'date-fns/locale';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';

interface AddPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: Patient;
    accountId: string;
    transactions?: Transaction[];
}

// ── Split Types ──
interface Split {
    category: TransactionCategory;
    amount: number;
    note?: string;
    staffId?: string;
    type: 'fixed' | 'percent';
    rawValue: number;
    isTax?: boolean;
}

// ── Progress Bar ──
const ProgressBar = ({ splits, total, currency }: { splits: Split[]; total: number; currency: string }) => {
    const { t } = useLanguage();
    const allocated = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
    const clinicAmount = Math.max(0, total - allocated);
    const clinicPct = total > 0 ? Math.round((clinicAmount / total) * 100) : 0;
    const sortedSplits = [...splits].sort((a, b) => b.amount - a.amount);

    return (
        <div className="mb-4 space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-gray-800">
                <span className="text-lg">{t('distribution') || 'Taqsimot'}</span>
                <span className="text-gray-400 font-normal">100%</span>
            </div>
            <div className="flex gap-4 text-xs font-semibold overflow-x-auto pb-1 no-scrollbar">
                <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-gray-900">Klinika <span className="text-gray-400 ml-0.5">{clinicPct}%</span></span>
                </div>
                {sortedSplits.map((split, i) => {
                    const pct = total > 0 ? Math.round((split.amount / total) * 100) : 0;
                    return (
                        <div key={i} className="flex items-center gap-1.5 shrink-0">
                            <div className={`w-2 h-2 rounded-full ${['bg-purple-500', 'bg-blue-500', 'bg-pink-500', 'bg-orange-500'][i % 4]}`} />
                            <span className="text-gray-700 truncate max-w-[150px]">
                                {split.note || (split.staffId ? 'Staff' : 'Expense')}
                                <span className="text-gray-400 ml-1">{pct}%</span>
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: total > 0 ? `${(clinicAmount / total) * 100}%` : '100%' }}
                    className="h-full bg-emerald-500"
                />
                {sortedSplits.map((split, i) => (
                    <motion.div
                        key={i}
                        initial={{ width: 0 }}
                        animate={{ width: total > 0 ? `${(split.amount / total) * 100}%` : '0%' }}
                        className={`h-full ${['bg-purple-500', 'bg-blue-500', 'bg-pink-500', 'bg-orange-500'][i % 4]}`}
                    />
                ))}
            </div>
        </div>
    );
};

// ── Avatar Helper ──
const Avatar = ({ src, alt, fallback, className }: { src?: string; alt: string; fallback: React.ReactNode; className?: string }) => (
    <div className={`w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center overflow-hidden border border-indigo-100 shadow-sm shrink-0 ${className || ''}`}>
        {src ? (
            <ImageWithFallback src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
            <span className="text-indigo-600 font-bold">{fallback}</span>
        )}
    </div>
);

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({ isOpen, onClose, patient, accountId, transactions = [] }) => {
    const { t, language } = useLanguage();
    const { success, error: toastError } = useToast();

    const localeMap = { en: enUS, ru, uz };
    const currentLocale = localeMap[language as keyof typeof localeMap] || enUS;

    // ── Mode toggle ──
    const [mode, setMode] = useState<'income' | 'expense'>('income');

    // Common fields
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState<Date>(new Date());
    const [note, setNote] = useState('');
    const [category, setCategory] = useState<TransactionCategory>('surgery');
    const [loading, setLoading] = useState(false);

    // Calculate previous sessions based on selected category (e.g. how many previous 'surgery' exist)
    const previousSessions = React.useMemo(() => {
        if (!transactions) return 0;
        return transactions.filter(tr => tr.type === 'income' && tr.category === category && !tr.isVoided).length;
    }, [transactions, category]);

    // Expense-specific
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseCategory, setExpenseCategory] = useState<TransactionCategory>('other');

    // Staff + Splits (income only)
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [splits, setSplits] = useState<Split[]>([]);
    const [isStaffPickerOpen, setIsStaffPickerOpen] = useState(false);
    const [staffSearch, setStaffSearch] = useState('');

    // Fetch staff on mount
    useEffect(() => {
        if (!accountId || !isOpen) return;
        const unsub = subscribeToStaff(accountId, (staff) => setStaffList(staff));
        return () => unsub();
    }, [accountId, isOpen]);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setAmount(0);
            setDate(new Date());
            setNote('');
            setCategory('surgery');
            setExpenseDescription('');
            setExpenseCategory('other');
            setSplits([]);
            setIsStaffPickerOpen(false);
            setStaffSearch('');
            setMode('income');
        }
    }, [isOpen]);

    // Keep percentage-based splits synced when total changes
    useEffect(() => {
        setSplits(prev => prev.map(s => {
            if (s.isTax && s.type === 'percent') {
                return { ...s, amount: Math.round((amount || 0) * (s.rawValue / 100)) };
            }
            return s;
        }));
    }, [amount]);

    // ── Split Methods ──
    const addSplit = (isTax = false) => {
        if (isTax) {
            setSplits([...splits, {
                category: 'tax',
                amount: 0,
                rawValue: 0,
                type: 'percent',
                note: t('tax_exp') || 'Tax/Expense',
                staffId: '',
                isTax: true
            }]);
        } else {
            setIsStaffPickerOpen(true);
        }
    };

    const handleStaffSelect = (staffId: string) => {
        const staff = staffList.find(s => s.id === staffId);
        if (staff) {
            setSplits([...splits, {
                category: 'salary',
                amount: 0,
                rawValue: 0,
                type: 'fixed',
                note: staff.fullName,
                staffId: staff.id,
                isTax: false
            }]);
            setIsStaffPickerOpen(false);
            setStaffSearch('');
        }
    };

    const removeSplit = (index: number) => {
        setSplits(splits.filter((_, i) => i !== index));
    };

    const updateSplit = (index: number, field: string, value: any) => {
        setSplits(prev => prev.map((s, i) => {
            if (i !== index) return s;
            const updated = { ...s, [field]: value };
            if (field === 'staffId') {
                const staff = staffList.find(st => st.id === value);
                if (staff) updated.note = staff.fullName;
            }
            if (field === 'amount') {
                updated.amount = value;
                if (updated.isTax && amount) {
                    updated.rawValue = Number(((value / amount) * 100).toFixed(1));
                }
            } else if (field === 'rawValue') {
                updated.rawValue = value;
                if (amount) {
                    updated.amount = Math.round((amount * value) / 100);
                }
            }
            return updated;
        }));
    };

    // ── Submit ──
    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (!amount || amount <= 0) throw new Error("Invalid amount");

            const now = new Date();
            const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const dateStr = date.toISOString().split('T')[0];

            if (mode === 'income') {
                await addTransaction({
                    accountId,
                    patientId: patient.id,
                    amount,
                    currency: 'UZS',
                    type: 'income',
                    category,
                    description: note || t(category),
                    date: dateStr,
                    time
                });

                for (const split of splits) {
                    if (split.amount > 0) {
                        await addTransaction({
                            accountId,
                            patientId: patient.id,
                            amount: split.amount,
                            currency: 'UZS',
                            type: 'expense',
                            category: split.category,
                            description: `[Split] ${split.note || (split.staffId ? 'Staff Share' : 'Expense')}`,
                            staffId: split.staffId || '',
                            date: dateStr,
                            time
                        });
                    }
                }
                success(t('payment_added') || 'Payment Added', `${formatWithSpaces(amount)} UZS — ${patient.fullName}`);
            } else {
                await addTransaction({
                    accountId,
                    patientId: patient.id,
                    amount,
                    currency: 'UZS',
                    type: 'expense',
                    category: expenseCategory,
                    description: expenseDescription || (t(expenseCategory) || t('expense') || 'Xarajat'),
                    date: dateStr,
                    time
                });
                success(t('expense') || 'Expense', `${formatWithSpaces(amount)} UZS — ${expenseDescription || (t(expenseCategory) || t('expense') || 'Xarajat')}`);
            }

            onClose();
        } catch (err: any) {
            toastError("Error", err.message);
        } finally {
            setLoading(false);
        }
    };

    const allocated = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
    const remainder = (amount || 0) - allocated;
    const isOverBudget = remainder < 0;

    const filteredStaff = staffList.filter(s => s.fullName.toLowerCase().includes(staffSearch.toLowerCase()));

    const incomeCategoryOptions = [
        { value: 'surgery', label: t('surgery') },
        { value: 'injection', label: t('injection') },
        { value: 'consultation', label: t('consultation') },
        { value: 'other', label: t('other') }
    ];

    const expenseCategoryOptions = [
        { value: 'food', label: t('food') || 'Food/Lunch' },
        { value: 'pills', label: t('pills') || 'Pills/Medicine' },
        { value: 'other', label: t('other') || 'Other' }
    ];

    if (!isOpen) return null;

    return (
        <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md font-sans">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    onClick={(e) => e.stopPropagation()}
                    className={`bg-white rounded-[32px] w-full shadow-2xl shadow-blue-500/10 overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300 ${mode === 'expense' ? 'max-w-md' : 'max-w-5xl'}`}
                >
                    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                        {mode === 'expense' ? (
                            <div className="w-full flex flex-col overflow-y-auto bg-white p-6 relative no-scrollbar">
                                <div className="flex justify-center mb-8">
                                    <div className="bg-gray-100 p-1.5 rounded-xl flex w-full relative shadow-inner mb-8">
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={() => setMode('income')}
                                            className="flex-1 py-2 text-sm font-bold rounded-lg transition-all shadow-sm text-gray-500 hover:text-gray-700 hover:bg-white/50"
                                        >
                                            <span className="relative z-10">{t('income') || 'Kirim'}</span>
                                        </motion.button>
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={() => setMode('expense')}
                                            className="flex-1 py-2 text-sm font-bold rounded-lg transition-all shadow-sm btn-glossy-red"
                                        >
                                            <span className="relative z-10">{t('expense') || 'Xarajat'}</span>
                                        </motion.button>
                                    </div>
                                </div>

                                <div className="text-center mb-8">
                                    <div className="text-[11px] font-black text-gray-300 uppercase tracking-widest mb-2">{t('amount') || 'Miqdor'}</div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        autoFocus
                                        value={amount ? new Intl.NumberFormat('en-US').format(amount) : ''}
                                        onChange={e => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            setAmount(val ? Number(val) : 0);
                                        }}
                                        placeholder="0"
                                        className="w-full bg-transparent text-center text-5xl font-bold tracking-tight text-rose-500 outline-none placeholder-gray-200 caret-rose-400"
                                    />
                                    <div className="text-xs font-bold text-rose-200 uppercase tracking-widest mt-2">UZS</div>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 isolate">
                                    <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-white/95 backdrop-blur-sm sticky top-0 z-20 rounded-t-2xl shadow-sm transition-colors">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-rose-50 flex items-center justify-center shrink-0">
                                            {patient.profileImage ? <ImageWithFallback src={patient.profileImage} alt={patient.fullName} className="w-full h-full object-cover" /> : <User size={18} className="text-rose-400" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{t('patient') || 'Bemor'}</div>
                                            <div className="font-bold text-gray-900">{patient.fullName}</div>
                                        </div>
                                    </div>
                                    <div className="p-4 border-b border-gray-100 flex items-center gap-4 relative group hover:bg-gray-50 transition-colors cursor-pointer bg-white">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0"><Calendar size={18} /></div>
                                        <div className="flex-1">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{t('date') || 'Sana'}</div>

                                            <div className="font-bold text-gray-900">{format(date, 'dd MMMM yyyy', { locale: currentLocale })}</div>
                                        </div>
                                        <div className="absolute inset-0 opacity-0"><CustomDatePicker value={date} onChange={setDate} centered /></div>
                                    </div>
                                    <div className="p-4 flex items-center justify-between gap-4 relative group hover:bg-gray-50 transition-colors cursor-pointer bg-white rounded-b-2xl">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 shrink-0"><Search size={18} /></div>
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{t('category') || 'Kategoriya'}</div>
                                                <div className="font-bold text-gray-900 capitalize truncate">{t(expenseCategory) || expenseCategory}</div>
                                            </div>
                                        </div>
                                        <ChevronDown size={18} className="text-gray-300" />
                                        <div className="absolute inset-0 opacity-0"><CustomSelect options={expenseCategoryOptions} value={expenseCategory} onChange={(val) => setExpenseCategory(val as TransactionCategory)} minimal /></div>
                                    </div>
                                </div>

                                {/* Expense Note - Moved Outside as Standalone */}
                                <div className="mb-6">
                                    <textarea
                                        value={expenseDescription}
                                        onChange={e => {
                                            setExpenseDescription(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        rows={3}
                                        placeholder={t('expense_note_placeholder') || "Xarajat haqida..."}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-bold text-slate-900 outline-none placeholder-slate-400 resize-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                        ) : (
                            <>
                                <div className="w-full md:w-[35%] bg-blue-50/20 p-8 flex flex-col border-b md:border-b-0 md:border-r border-blue-100/50 relative shrink-0">
                                    <div className="flex justify-center mb-10">
                                        <div className="bg-slate-100 p-1.5 rounded-xl flex w-full relative shadow-inner border border-slate-200/60 mb-6">
                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                onClick={() => setMode('income')}
                                                className="flex-1 py-2.5 text-sm font-bold rounded-lg transition-all shadow-sm btn-glossy-emerald"
                                            >
                                                <span className="relative z-10">{t('income') || 'Kirim'}</span>
                                            </motion.button>
                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                onClick={() => setMode('expense')}
                                                className="flex-1 py-2.5 text-sm font-bold rounded-lg transition-all shadow-sm text-slate-400 hover:text-slate-600 hover:bg-white/50"
                                            >
                                                <span className="relative z-10">{t('expense') || 'Xarajat'}</span>
                                            </motion.button>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center items-center mb-10">
                                        <div className="text-[11px] font-black text-gray-300 uppercase tracking-widest mb-3">{t('amount') || 'Miqdor'}</div>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            autoFocus
                                            value={amount ? new Intl.NumberFormat('en-US').format(amount) : ''}
                                            onChange={e => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                setAmount(val ? Number(val) : 0);
                                            }}
                                            placeholder="0"
                                            className="w-full bg-transparent text-center text-5xl font-bold tracking-tight text-emerald-500 outline-none placeholder-gray-200 caret-emerald-500"
                                        />
                                        <div className="text-xs font-bold text-gray-300 uppercase tracking-widest mt-3">UZS</div>
                                    </div>
                                    <div className="bg-white rounded-[1.25rem] border border-blue-100/60 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.05)] overflow-hidden">
                                        <div className="p-4 border-b border-gray-50 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-slate-100">
                                                {patient.profileImage ? <ImageWithFallback src={patient.profileImage} alt={patient.fullName} className="w-full h-full object-cover" /> : <User size={18} className="text-slate-400" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('patient') || 'Bemor'}</div>
                                                <div className="font-extrabold text-slate-900 text-sm truncate">{patient.fullName}</div>
                                            </div>
                                        </div>
                                        <div className="p-4 border-b border-gray-50 flex items-center justify-between gap-4 relative group hover:bg-gray-50/50 transition-colors cursor-pointer">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 shrink-0 border border-purple-100"><Search size={18} /></div>
                                                <div className="min-w-0 flex flex-col justify-center">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('category') || 'Kategoriya'}</div>
                                                        {category === 'surgery' && (
                                                            <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200/60 px-1.5 py-0.5 rounded-md font-bold tracking-widest uppercase whitespace-nowrap">
                                                                {previousSessions === 0 ? (t('seans_1') || '1-Seans') : (t('seans_n')?.replace('{n}', `${previousSessions + 1}`) || `${previousSessions + 1}-Seans`)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="font-extrabold text-slate-900 text-sm capitalize truncate">{t(category) || category}</div>
                                                </div>
                                            </div>
                                            <ChevronDown size={18} className="text-slate-300" />
                                            <div className="absolute inset-0 opacity-0"><CustomSelect options={incomeCategoryOptions} value={category} onChange={(val) => setCategory(val as TransactionCategory)} minimal /></div>
                                        </div>
                                        <div className="p-4 flex items-center gap-4 relative group hover:bg-gray-50/50 transition-colors cursor-pointer">
                                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0 border border-orange-100"><Calendar size={18} /></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('date') || 'Sana'}</div>
                                                <div className="font-extrabold text-slate-900 text-sm">{format(date, 'dd MMMM yyyy', { locale: currentLocale })}</div>
                                            </div>
                                            <div className="absolute inset-0 opacity-0"><CustomDatePicker value={date} onChange={setDate} centered /></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-[65%] bg-white flex flex-col relative overflow-hidden">
                                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                        <div>
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">{t('distribution') || 'Taqsimot'}</h3>
                                            <ProgressBar splits={splits} total={amount || 0} currency="UZS" />
                                        </div>

                                        <div className="space-y-3 pb-2">
                                            <AnimatePresence initial={false}>
                                                {splits.map((split, i) => {
                                                    const staff = staffList.find(s => s.id === split.staffId);
                                                    return (
                                                        <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="group flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-300 shadow-sm hover:border-slate-400 hover:shadow-md transition-all duration-200">

                                                            {split.isTax ? (
                                                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 text-slate-500"><Percent size={18} /></div>
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                                                    {staff?.imageUrl ? <ImageWithFallback src={staff.imageUrl} alt="staff" className="w-full h-full object-cover" /> : <User size={18} className="text-slate-400" />}
                                                                </div>
                                                            )}

                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-bold text-slate-900 text-sm truncate">{split.note || (split.isTax ? (t('tax_exp') || 'Tax/Expense') : 'Staff')}</div>
                                                                <div className="text-xs text-slate-500 font-medium mt-0.5">{split.isTax ? (t('tax') || 'Tax') : (staff?.role || 'staff')}</div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                {split.isTax ? (
                                                                    <div className="w-24 bg-slate-200 rounded-lg px-3 py-2 flex items-center border border-slate-300 focus-within:border-slate-400 focus-within:bg-white transition-all duration-200">
                                                                        <input
                                                                            type="number"
                                                                            value={split.rawValue || ''}
                                                                            onChange={e => updateSplit(i, 'rawValue', Number(e.target.value))}
                                                                            className="w-full bg-transparent text-right text-sm font-bold text-slate-900 outline-none placeholder-slate-400"
                                                                            placeholder="0"
                                                                        />
                                                                        <span className="text-xs font-bold text-slate-500 ml-1.5">%</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-40 bg-slate-200 rounded-lg px-3 py-2 flex items-center border border-slate-300 focus-within:border-slate-400 focus-within:bg-white transition-all duration-200">
                                                                        <input
                                                                            type="text"
                                                                            inputMode="numeric"
                                                                            value={split.amount ? new Intl.NumberFormat('en-US').format(split.amount) : ''}
                                                                            onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); updateSplit(i, 'amount', val ? Number(val) : 0); }}
                                                                            className="w-full bg-transparent text-right text-sm font-bold text-slate-900 outline-none placeholder-slate-400 font-mono"
                                                                            placeholder="0"
                                                                        />
                                                                        <span className="text-[11px] font-bold text-slate-400 uppercase ml-2">UZS</span>
                                                                    </div>
                                                                )}

                                                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                                    onClick={() => removeSplit(i)}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </motion.button>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>

                                            {/* Clinic Residual Row (Professional) */}
                                            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                                                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200 shrink-0 text-slate-400">
                                                    <Building2 size={18} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-700 text-sm">{t('clinic_remainder') || 'Klinika (Qoldiq)'}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-base font-mono font-bold ${isOverBudget ? 'text-rose-600' : 'text-slate-900'}`}>
                                                        {new Intl.NumberFormat('en-US').format(Math.abs(remainder))} <span className="text-[10px] text-slate-400 uppercase tracking-wide">UZS</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Notes / Description Field */}
                                            <div className="mt-6">
                                                <textarea
                                                    value={note}
                                                    onChange={e => {
                                                        setNote(e.target.value);
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                    }}
                                                    rows={3}
                                                    placeholder={t('add_note_placeholder') || "Izoh qo'shish..."}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-900 outline-none placeholder-slate-400 resize-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 border-t border-gray-50 bg-white relative z-20">
                                        {!isStaffPickerOpen ? (
                                            <div className="flex gap-3">
                                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} onClick={() => addSplit(false)} className="flex-1 py-3.5 flex items-center justify-center gap-2 text-white font-bold bg-gradient-to-b from-blue-500 to-blue-600 shadow-sm hover:shadow-md hover:from-blue-400 hover:to-blue-600 border border-transparent rounded-xl transition-all text-sm group active:scale-95"><User size={18} className="group-hover:scale-110 transition-transform" /><span>+ {t('staff') || 'Xodimlar'}</span></motion.button>
                                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} onClick={() => addSplit(true)} className="flex-1 py-3.5 flex items-center justify-center gap-2 text-white font-bold bg-gradient-to-b from-rose-500 to-rose-600 shadow-sm hover:shadow-md hover:from-rose-400 hover:to-rose-600 border border-transparent rounded-xl transition-all text-sm group active:scale-95"><Percent size={18} className="group-hover:scale-110 transition-transform" /><span>+ {t('tax_exp') || 'Tax/Expense'}</span></motion.button>
                                            </div>
                                        ) : (
                                            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-blue-100 shadow-2xl shadow-blue-500/10 rounded-2xl p-3 z-50 animate-in fade-in slide-in-from-bottom-2">
                                                <div className="flex items-center gap-2 mb-2 p-1 border-b border-gray-50">
                                                    <Search size={16} className="text-blue-500 ml-1" />
                                                    <input autoFocus type="text" value={staffSearch} onChange={e => setStaffSearch(e.target.value)} className="flex-1 bg-transparent px-2 py-1 text-sm font-bold text-gray-900 outline-none placeholder-gray-300" placeholder={t('search_staff') || "Search staff..."} />
                                                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} onClick={() => setIsStaffPickerOpen(false)} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"><X size={16} /></motion.button>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                                                    {filteredStaff.map(staff => (
                                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} key={staff.id} onClick={() => handleStaffSelect(staff.id)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-left transition-colors group">
                                                            <div className="relative">
                                                                <Avatar src={staff.imageUrl} alt={staff.fullName} fallback={<User size={14} />} className="w-8 h-8 rounded-full border border-gray-100 group-hover:border-blue-200" />
                                                            </div>
                                                            <div><div className="font-bold text-xs text-gray-800 group-hover:text-blue-700">{staff.fullName}</div></div>
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    {/* ── FOOTER ── */}
                    <div className="px-8 py-5 border-t border-gray-50 flex items-center justify-end gap-3 shrink-0 bg-white">
                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} onClick={onClose} className="px-6 py-3 rounded-2xl font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors text-sm">
                            {t('cancel') || 'Bekor qilish'}
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading || !amount || (mode === 'income' && isOverBudget)} className={`px-10 py-4 rounded-xl font-bold text-white text-lg shadow-xl shadow-blue-600/40 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-b from-blue-400 to-blue-700 hover:from-blue-400 hover:to-blue-600 ring-1 ring-white/20`}>
                            {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (t('save') || 'Saqlash')}
                        </motion.button>
                    </div>
                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} onClick={onClose} className="md:hidden absolute top-4 right-4 z-50 p-2 bg-white rounded-full shadow-sm text-gray-500"><X size={20} /></motion.button>
                </motion.div>
            </div >
        </Portal >
    );
};

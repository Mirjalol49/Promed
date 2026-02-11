import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccount } from '../../contexts/AccountContext';
import { Transaction, TransactionType, TransactionCategory, Staff, Patient } from '../../types';
import { subscribeToTransactions, addTransaction, deleteTransaction, returnTransaction, calculateStats } from '../../lib/financeService';
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


// --- Types ---
type DateFilter = 'all' | 'month' | 'week';

// --- Utility: Format Currency Removed (Imported) ---

// --- Constants ---
const incomeCategories: TransactionCategory[] = ['surgery', 'consultation', 'injection'];
const expenseCategories: TransactionCategory[] = ['salary', 'tax'];

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

    // Splits state
    const [splits, setSplits] = useState<{
        category: TransactionCategory;
        amount: number;
        note?: string;
        staffId?: string;
        type: 'fixed' | 'percent'; // New field
        rawValue: number; // The value entered (e.g., 12 for 12%)
    }[]>([]);

    const [isSplitting, setIsSplitting] = useState(false);

    // Month/Year state for salary transactions
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
            setSplits([]);
            setIsSplitting(false);
            setSelectedMonth(new Date().getMonth());
            setSelectedYear(new Date().getFullYear());
        }
    }, [isOpen, initialPatientId]);

    // Month names for picker
    const monthOptions = [
        { value: 0, label: 'January' },
        { value: 1, label: 'February' },
        { value: 2, label: 'March' },
        { value: 3, label: 'April' },
        { value: 4, label: 'May' },
        { value: 5, label: 'June' },
        { value: 6, label: 'July' },
        { value: 7, label: 'August' },
        { value: 8, label: 'September' },
        { value: 9, label: 'October' },
        { value: 10, label: 'November' },
        { value: 11, label: 'December' }
    ];

    // Year options (current year ± 2 years)
    const currentYear = new Date().getFullYear();
    const yearOptions = [-2, -1, 0, 1, 2].map(offset => ({
        value: currentYear + offset,
        label: String(currentYear + offset)
    }));

    // Recalculate percentage splits when main Income Amount changes
    useEffect(() => {
        if (type === 'income') {
            setSplits(prevSplits => {
                let hasChanges = false;
                const newSplits = prevSplits.map(s => {
                    if (s.type === 'percent') {
                        const newAmount = Math.round((formData.amount || 0) * (s.rawValue / 100));
                        if (newAmount !== s.amount) {
                            hasChanges = true;
                            return { ...s, amount: newAmount };
                        }
                    }
                    return s;
                });
                return hasChanges ? newSplits : prevSplits;
            });
        }
    }, [formData.amount, type]);

    // Auto-fill salary amount when staff is selected for salary expense
    useEffect(() => {
        if (type === 'expense' && formData.category === 'salary' && formData.staffId) {
            const selectedStaff = staffList.find(s => s.id === formData.staffId);
            if (selectedStaff && selectedStaff.salary) {
                setFormData(prev => ({
                    ...prev,
                    amount: selectedStaff.salary
                }));
            }
        }
    }, [type, formData.category, formData.staffId, staffList]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const finalCategory = formData.category === 'other' ? customCategory : formData.category;
            const currentTime = new Date().toTimeString().slice(0, 5); // HH:mm format

            // 1. Create Main Transaction with current device time
            await onSave({ ...formData, category: finalCategory, type, time: currentTime });

            // 2. Create Split Transactions (Expenses) with same time
            if (type === 'income' && splits.length > 0) {
                for (const split of splits) {
                    await onSave({
                        amount: split.amount,
                        currency: formData.currency,
                        type: 'expense',
                        category: split.category,
                        date: formData.date,
                        time: currentTime,
                        description: `[Split from Income] ${split.note || ''}`,
                        staffId: split.staffId || '',
                        patientId: formData.patientId || '' // Keep link to patient if relevant
                    });
                }
            }

            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const addSplit = () => {
        setSplits([...splits, { category: 'tax', amount: 0, rawValue: 0, type: 'percent', note: '' }]);
    };

    const removeSplit = (index: number) => {
        setSplits(splits.filter((_, i) => i !== index));
    };

    const updateSplit = (index: number, field: string, value: any) => {
        setSplits(prevSplits => {
            const newSplits = prevSplits.map((s, i) => {
                if (i !== index) return s;

                const updatedSplit = { ...s, [field]: value };

                // Force type to 'fixed' if category is not 'tax'
                if (field === 'category' && value !== 'tax') {
                    updatedSplit.type = 'fixed';
                }

                // Recalculate based on new field value
                if (updatedSplit.type === 'percent') {
                    // If changing rawValue or type to percent, calc amount from total
                    updatedSplit.amount = Math.round((formData.amount || 0) * (updatedSplit.rawValue / 100));
                } else {
                    // Fixed mode: amount = rawValue
                    updatedSplit.amount = updatedSplit.rawValue;
                }

                return updatedSplit;
            });
            return newSplits;
        });
    };



    const totalSplits = splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const netIncome = (formData.amount || 0) - totalSplits;

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
                <div className={`w-full md:w-5/12 p-8 flex flex-col items-center justify-between relative overflow-hidden transition-colors duration-500 ${type === 'income' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                    <div className="w-full relative z-10 text-white">
                        <h3 className="font-black text-2xl mb-1 text-center">
                            {t('add_transaction') || "Tranzaksiya Qo'shish"}
                        </h3>
                        <p className="text-white/70 font-medium text-sm text-center mb-8">{t('fill_details')}</p>

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

                    {/* Type Toggle - KISS Method */}
                    <div className="relative z-10 bg-black/20 backdrop-blur-md rounded-2xl p-1 flex w-full border border-white/10">
                        <button
                            type="button"
                            onClick={() => { setType('income'); setFormData({ ...formData, category: 'consultation' }); }}
                            className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${type === 'income'
                                ? 'bg-emerald-500 text-white shadow-lg'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <ArrowUpRight size={16} className="stroke-[3]" />
                            {t('income') || 'Income'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setType('expense'); setFormData({ ...formData, category: 'salary' }); }}
                            className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${type === 'expense'
                                ? 'bg-rose-500 text-white shadow-lg'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <ArrowDownRight size={16} className="stroke-[3]" />
                            {t('expense') || 'Expense'}
                        </button>
                    </div>
                </div>

                {/* RIGHT SIDE: Details Form */}
                <form onSubmit={handleSubmit} className="w-full md:w-7/12 p-8 md:p-10 pb-12 bg-white flex flex-col h-full overflow-hidden">
                    <div className="flex justify-between items-center mb-8 hidden md:flex">
                        <h3 className="text-xl font-bold text-slate-800">{t('transaction_details')}</h3>

                        <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Date Picker - Conditional based on category */}
                            {type === 'expense' && formData.category === 'salary' ? (
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">{t('month') || 'Month'} / {t('year') || 'Year'}</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <CustomSelect
                                            label=""
                                            options={monthOptions}
                                            value={selectedMonth}
                                            onChange={(val) => {
                                                setSelectedMonth(Number(val));
                                                const dateStr = `${selectedYear}-${String(Number(val) + 1).padStart(2, '0')}-01`;
                                                setFormData({ ...formData, date: dateStr });
                                            }}
                                        />
                                        <CustomSelect
                                            label=""
                                            options={yearOptions}
                                            value={selectedYear}
                                            onChange={(val) => {
                                                setSelectedYear(Number(val));
                                                const dateStr = `${val}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
                                                setFormData({ ...formData, date: dateStr });
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <CustomDatePicker
                                    label={t('date') || 'Date'}
                                    value={new Date(formData.date)}
                                    onChange={(date) => setFormData({ ...formData, date: date.toISOString().split('T')[0] })}
                                />
                            )}

                            <CustomSelect
                                label={t('category') || 'Category'}
                                options={[
                                    ...(type === 'income' ? incomeCategories : expenseCategories).map(c => ({ value: c, label: t(c) || c })),
                                    { value: 'other', label: t('other') || 'Other...' }
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
                                        {t('custom_category_name')}
                                    </label>

                                    <input
                                        type="text"
                                        value={customCategory}
                                        onChange={(e) => setCustomCategory(e.target.value)}
                                        placeholder={t('enter_custom_category') || "Enter custom category..."}
                                        className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-3.5 px-4 text-slate-700 font-bold focus:bg-white focus:ring-4 focus:ring-promed-primary/10 focus:border-promed-primary hover:border-slate-400 transition-all outline-none"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence mode="wait">
                            {type === 'income' && (formData.category === 'consultation' || formData.category === 'surgery' || formData.category === 'injection') && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2 overflow-hidden"
                                >
                                    <CustomSelect
                                        label={`${t('patient') || 'Patient'} ${formData.category === 'consultation' || formData.category === 'surgery' ? '' : '(Optional)'}`}
                                        options={patientList.map(p => ({ value: p.id, label: p.fullName }))}
                                        value={formData.patientId || ''}
                                        onChange={(val) => setFormData({ ...formData, patientId: val })}
                                        placeholder={t('select_patient') || "Select Patient"}
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

                            {/* Income Splits Section - Scrollable Area */}
                            {type === 'income' && (
                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-slate-700">{t('income_distribution')}</h4>

                                        <button
                                            type="button"
                                            onClick={addSplit}
                                            className="text-xs font-bold text-promed-primary bg-promed-light px-3 py-1.5 rounded-lg hover:bg-promed-primary/10 transition-colors"
                                        >
                                            {t('add_split')}

                                        </button>
                                    </div>

                                    <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                        {splits.map((split, index) => (
                                            <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group transition-all hover:border-promed-primary/30">
                                                <button
                                                    type="button"
                                                    onClick={() => removeSplit(index)}
                                                    className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-500 rounded-full p-1.5 shadow-sm border border-slate-200 opacity-0 group-hover:opacity-100 transition-all z-10"
                                                >
                                                    <X size={14} />
                                                </button>

                                                <div className="flex gap-2 mb-3">
                                                    <div className="flex-[2] flex gap-2">
                                                        {split.category === 'other' ? (
                                                            <>
                                                                <input
                                                                    type="text"
                                                                    value={split.note || ''}
                                                                    onChange={(e) => updateSplit(index, 'note', e.target.value)}
                                                                    placeholder={t('enter_category')}
                                                                    className="w-full bg-white px-3 py-2 rounded-xl border border-slate-300 focus:border-promed-primary outline-none text-slate-700 font-medium"
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateSplit(index, 'category', 'tax')}
                                                                    className="bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-red-500 p-2 rounded-xl transition-colors"
                                                                >
                                                                    <X size={18} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CustomSelect
                                                                    options={expenseCategories.map(c => ({ value: c, label: t(c) || c }))}
                                                                    value={split.category}
                                                                    onChange={(val) => updateSplit(index, 'category', val)}
                                                                    placeholder={t('category') || "Category"}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateSplit(index, 'category', 'other')}
                                                                    className="bg-promed-light text-promed-primary hover:bg-promed-primary/10 px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
                                                                >
                                                                    {t('other')}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>

                                                    <div className={`flex bg-white rounded-xl border border-slate-300 overflow-hidden h-[52px] shrink-0 ${split.category === 'tax' ? 'w-[140px]' : 'w-full flex-1'}`}>
                                                        <input
                                                            type="number"
                                                            value={split.rawValue || ''}
                                                            onChange={(e) => updateSplit(index, 'rawValue', Number(e.target.value))}
                                                            className="w-full h-full px-3 font-bold text-slate-700 outline-none text-right"
                                                            placeholder="0"
                                                        />
                                                        {split.category === 'tax' ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => updateSplit(index, 'type', split.type === 'percent' ? 'fixed' : 'percent')}
                                                                className="px-3 bg-slate-100 hover:bg-slate-200 border-l border-slate-300 font-bold text-xs text-slate-600 transition-colors w-[50px]"
                                                            >
                                                                {split.type === 'percent' ? '%' : formData.currency}
                                                            </button>
                                                        ) : (
                                                            <div className="px-3 bg-slate-50 border-l border-slate-300 flex items-center justify-center font-bold text-xs text-slate-500 w-[50px]">
                                                                {formData.currency}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {split.category === 'salary' && (
                                                    <div className="flex gap-3 mb-3">
                                                        <div className="w-full">
                                                            <CustomSelect
                                                                options={staffList.map(s => ({ value: s.id, label: s.fullName }))}
                                                                value={split.staffId || ''}
                                                                onChange={(val) => updateSplit(index, 'staffId', val)}
                                                                placeholder={`${t('staff_member') || 'Staff Member'} (Optional)`}
                                                                searchable
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex gap-3 items-center">
                                                    <textarea
                                                        value={split.note || ''}
                                                        onChange={(e) => updateSplit(index, 'note', e.target.value)}
                                                        onInput={(e) => {
                                                            const target = e.target as HTMLTextAreaElement;
                                                            target.style.height = 'auto';
                                                            target.style.height = target.scrollHeight + 'px';
                                                        }}
                                                        rows={1}
                                                        placeholder={t('description') || "Description (e.g. Tax Fund)"}
                                                        className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-promed-primary resize-none overflow-hidden min-h-[38px] leading-tight"
                                                    />
                                                    {split.type === 'percent' && (
                                                        <div className="text-right min-w-[80px]">
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{t('amount') || "Amount"}</div>
                                                            <div className="font-bold text-slate-700">{formatCurrency(split.amount, formData.currency)}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {splits.length === 0 && (
                                            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                                                <p className="text-slate-400 text-sm font-medium">{t('splits_empty_state')}</p>

                                            </div>
                                        )}
                                    </div>
                                </div>
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
                                className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl font-medium text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-promed-primary/10 focus:border-promed-primary hover:border-slate-400 transition-all resize-none placeholder-slate-400 min-h-[100px]"
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t('add_note_details') || "Add a note details..."}
                            />
                        </div>
                    </div>

                    {/* Footer Summary & Submit */}
                    <div className="pt-6 border-t border-slate-100 bg-white mt-auto z-20">
                        {type === 'income' && splits.length > 0 && (
                            <div className="flex flex-col gap-2 mb-4 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">{t('gross_income')}:</span>

                                    <span className="font-bold text-slate-700">{formatCurrency(formData.amount || 0, formData.currency)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">{t('total_deductions') || 'Total Deductions'}:</span>
                                    <span className="font-bold text-red-500">-{formatCurrency(totalSplits, formData.currency)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-emerald-100">
                                    <div className="text-xs text-slate-500 font-medium">{t('net_income')}</div>

                                    <div className="text-lg font-black text-emerald-600">{formatCurrency(netIncome, formData.currency)}</div>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !formData.amount}
                            className={`w-full py-4 text-white rounded-2xl font-black text-lg shadow-[0_10px_25px_rgba(0,0,0,0.1)] active:scale-[0.98] transition-all hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${type === 'income'
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                                : 'bg-gradient-to-r from-rose-600 to-rose-500'
                                }`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                            ) : (
                                <>
                                    {type === 'income' ? (t('confirm_income') || 'Confirm Income') : (t('confirm_expense') || 'Confirm Expense')}

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
            result = result.filter(t => isAfter(new Date(t.date), subDays(startOfDay(startDate), 1)));
        }
        if (endDate) {
            result = result.filter(t => isBefore(new Date(t.date), addDays(endOfDay(endDate), 0)));
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
    };

    return (
        <div className="h-full flex flex-col p-6 max-w-7xl mx-auto space-y-6 relative overflow-hidden">

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
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-promed-primary rounded-xl shadow-[0_4px_12px_rgba(0,51,255,0.3)]"
                                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                                />
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
                        className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_25px_rgba(0,0,0,0.08)] rounded-2xl px-6 py-3 font-bold transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-2"
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Income Card */}
                                <motion.div
                                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                                    whileHover={{ y: -4, transition: { duration: 0.25 } }}
                                    className="relative rounded-2xl p-5 bg-white border border-slate-100 group cursor-default"
                                    style={{
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                                <ArrowUpRight className="w-5 h-5 text-emerald-500 stroke-[2.5]" />
                                            </div>
                                            <span className="text-[13px] font-semibold text-slate-500 tracking-wide">{t('income') || 'Kirim'}</span>
                                        </div>
                                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                    </div>
                                    <Tooltip content={formatCurrency(stats.totalIncome)}>
                                        <div className="text-[2rem] font-extrabold text-slate-900 tracking-tight leading-none mb-1">
                                            +{formatCompactNumber(stats.totalIncome)}
                                        </div>
                                    </Tooltip>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <div className="h-1 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${stats.totalIncome > 0 ? Math.min(100, (stats.totalIncome / (stats.totalIncome + stats.totalExpense)) * 100) : 0}%` }}></div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Expense Card */}
                                <motion.div
                                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                                    whileHover={{ y: -4, transition: { duration: 0.25 } }}
                                    className="relative rounded-2xl p-5 bg-white border border-slate-100 group cursor-default"
                                    style={{
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                                                <ArrowDownRight className="w-5 h-5 text-rose-500 stroke-[2.5]" />
                                            </div>
                                            <span className="text-[13px] font-semibold text-slate-500 tracking-wide">{t('expense') || 'Xarajat'}</span>
                                        </div>
                                        <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                                    </div>
                                    <Tooltip content={formatCurrency(stats.totalExpense)}>
                                        <div className="text-[2rem] font-extrabold text-slate-900 tracking-tight leading-none mb-1">
                                            -{formatCompactNumber(stats.totalExpense)}
                                        </div>
                                    </Tooltip>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <div className="h-1 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500" style={{ width: `${stats.totalExpense > 0 ? Math.min(100, (stats.totalExpense / (stats.totalIncome + stats.totalExpense)) * 100) : 0}%` }}></div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Net Profit Card */}
                                <motion.div
                                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                                    whileHover={{ y: -4, transition: { duration: 0.25 } }}
                                    className="relative rounded-2xl p-5 bg-white border border-slate-100 group cursor-default"
                                    style={{
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stats.netProfit >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}>
                                                <Wallet className={`w-5 h-5 stroke-[2.5] ${stats.netProfit >= 0 ? 'text-promed-primary' : 'text-amber-500'}`} />
                                            </div>
                                            <span className="text-[13px] font-semibold text-slate-500 tracking-wide">{t('net_profit') || 'Sof foyda'}</span>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${stats.netProfit >= 0 ? 'bg-blue-400' : 'bg-amber-400'}`}></div>
                                    </div>
                                    <Tooltip content={formatCurrency(stats.netProfit)}>
                                        <div className={`text-[2rem] font-extrabold tracking-tight leading-none mb-1 ${stats.netProfit >= 0 ? 'text-slate-900' : 'text-amber-600'}`}>
                                            {formatCompactNumber(stats.netProfit)}
                                        </div>
                                    </Tooltip>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <div className="h-1 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                            <div className={`h-full rounded-full ${stats.netProfit >= 0 ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'}`} style={{ width: `${stats.totalIncome > 0 ? Math.min(100, Math.max(0, (stats.netProfit / stats.totalIncome) * 100)) : 0}%` }}></div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}


                        <div className="flex flex-col">
                            {/* 3. ANALYTICS CHART (Full Width + Date Picker) */}
                            <motion.div
                                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                                className="w-full bg-white rounded-[2rem] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_16px_36px_rgba(0,0,0,0.06)] border border-white/60 flex flex-col justify-between"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
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
                                    <div className="flex flex-col sm:flex-row items-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-white/60 shadow-sm">
                                        <CustomDatePicker
                                            value={startDate}
                                            onChange={(date) => setStartDate(date)}
                                            placeholder={t('start_date') || 'Start Date'}
                                        />
                                        <span className="text-slate-300 font-bold">|</span>
                                        <CustomDatePicker
                                            value={endDate}
                                            onChange={(date) => setEndDate(date)}
                                            placeholder={t('end_date') || 'End Date'}
                                        />
                                        <div className="bg-slate-200 w-px h-6 mx-2 hidden sm:block" />
                                        <div className="flex bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/50">
                                            {(['week', 'month', 'all'] as const).map((f) => {
                                                const labelKey = f === 'week' ? 'weekly' : f === 'month' ? 'monthly' : 'filter_all';
                                                return (
                                                    <button
                                                        key={f}
                                                        onClick={() => handleDateFilterChange(f)}
                                                        className={`
                                                            px-4 py-2 rounded-lg text-sm font-bold transition-all capitalize duration-300
                                                            ${dateFilter === f ? 'bg-white text-slate-800 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}
                                                        `}
                                                    >
                                                        {t(labelKey) || (f === 'all' ? 'All' : f)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div className="h-96 w-full">
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
                            </motion.div>

                        </div>
                    </motion.div >
                ) : false ? (
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
                                            {paginatedPatients.map((patient) => {
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
                                            ...(txTypeFilter === 'all' || txTypeFilter === 'income' ? incomeCategories.map(c => ({ value: c, label: t(c.toLowerCase()) || c.charAt(0).toUpperCase() + c.slice(1) })) : []),
                                            ...(txTypeFilter === 'all' || txTypeFilter === 'expense' ? expenseCategories.map(c => ({ value: c, label: t(c.toLowerCase()) || c.charAt(0).toUpperCase() + c.slice(1) })) : []),
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
                                    label: t('total_income') || 'Total Income',
                                    value: filteredTransactionsList.filter(t => t.type === 'income' && !t.returned).reduce((sum, t) => sum + t.amount, 0),
                                    color: 'text-emerald-600',
                                    bg: 'bg-emerald-50/50'
                                },
                                {
                                    label: t('total_expenses') || 'Total Expense',
                                    value: filteredTransactionsList.filter(t => t.type === 'expense' && !t.returned).reduce((sum, t) => sum + t.amount, 0),
                                    color: 'text-rose-600',
                                    bg: 'bg-rose-50/50'
                                }
                            ].map((stat, i) => (
                                <div key={i} className={`p-4 flex items-center justify-center gap-3 ${stat.bg.replace('/50', '')}`}>
                                    <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">{stat.label}</span>
                                    <span className={`text-lg font-black ${stat.color}`}>{formatCurrency(stat.value)}</span>
                                </div>
                            ))}
                        </div>

                        {/* --- TRANSACTIONS LIST --- */}
                        <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar p-0">
                            {filteredTransactionsList.length > 0 ? (
                                <div className="divide-y divide-slate-200">
                                    {paginatedTransactions.map((tx) => (
                                        <motion.div
                                            key={tx.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className={`group flex items-center justify-between p-4 hover:bg-white hover:shadow-sm transition-all duration-200 ${tx.returned ? 'opacity-50' : ''}`}
                                        >
                                            {/* Icon & Details */}
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${tx.type === 'income' ? 'bg-emerald-100/50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-rose-100/50 text-rose-600 group-hover:bg-rose-100'
                                                    } ${tx.returned ? 'opacity-50' : ''}`}>
                                                    {tx.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                                </div>

                                                <div className="min-w-0 flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800 text-sm capitalize">{t(tx.category.toLowerCase()) || tx.category}</span>
                                                        {tx.returned && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-600 text-[10px] font-bold uppercase tracking-wider">
                                                                RETURNED
                                                            </span>
                                                        )}
                                                        <span className="text-slate-300 text-xs">•</span>
                                                        <span className="text-slate-400 text-xs font-semibold">
                                                            {format(new Date(tx.date), 'MMM dd, yyyy')}
                                                            {tx.time && <span> • {tx.time}</span>}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
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

                                            {/* Amount & Actions */}
                                            <div className="flex items-center gap-6 pl-4">
                                                <div className={`text-right font-black ${tx.amount === 0 ? 'text-slate-400' : `bg-clip-text text-transparent ${tx.type === 'income' ? 'bg-gradient-to-br from-emerald-600 to-emerald-400' : 'bg-gradient-to-br from-rose-600 to-rose-400'}`}`}>
                                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                                                    {!tx.returned && tx.amount !== 0 && (
                                                        <button
                                                            onClick={() => handleReturn(tx.id)}
                                                            className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all transform hover:scale-105 active:scale-95"
                                                            title="Return Transaction"
                                                        >
                                                            <RotateCcw className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(tx.id)}
                                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all transform hover:scale-105 active:scale-95"
                                                        title="Delete Transaction"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
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

            {/* Return Transaction Modal */}
            <DeleteModal
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

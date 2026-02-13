import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { Transaction, TransactionType, TransactionCategory, Staff, Patient } from '../../types';
import { X, Plus, Trash2, User, Building2, Calculator, Calendar, Building, Info, MousePointerClick, Search, Percent, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { CustomDatePicker } from '../../components/ui/CustomDatePicker';
import { formatCurrency } from '../../lib/formatters';
import { format } from 'date-fns';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    staffList: Staff[];
    patientList: Patient[];
    initialPatientId?: string;
    transactions: Transaction[];
}

// Helper Components
const Avatar = ({ src, alt, fallback }: { src?: string; alt: string; fallback: React.ReactNode }) => (
    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center overflow-hidden border border-indigo-100 shadow-sm shrink-0">
        {src ? (
            <ImageWithFallback src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
            <span className="text-indigo-600 font-bold">{fallback}</span>
        )}
    </div>
);

const ProgressBar = ({ splits, total, currency }: { splits: any[]; total: number; currency: string }) => {
    // Calculate total allocated
    const allocated = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
    const clinicAmount = Math.max(0, total - allocated);
    const clinicPct = total > 0 ? Math.round((clinicAmount / total) * 100) : 0;

    // Sort splits for visualization (largest first)
    const sortedSplits = [...splits].sort((a, b) => b.amount - a.amount);

    return (
        <div className="mb-4 md:mb-6 space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-gray-800">
                <span className="text-lg">Taqsimot</span>
                <span className="text-gray-400 font-normal">100%</span>
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs font-semibold overflow-x-auto pb-1 scrollbar-hide">
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
                {/* Clinic Share (Remainder) */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(clinicAmount / total) * 100}%` }}
                    className="h-full bg-emerald-500"
                />

                {/* Staff Shares */}
                {sortedSplits.map((split, i) => (
                    <motion.div
                        key={i}
                        initial={{ width: 0 }}
                        animate={{ width: `${(split.amount / total) * 100}%` }}
                        className={`h-full ${['bg-purple-500', 'bg-blue-500', 'bg-pink-500', 'bg-orange-500'][i % 4]}`}
                    />
                ))}
            </div>
        </div>
    );
};

export const TransactionModal: React.FC<TransactionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    staffList,
    patientList,
    initialPatientId,
    transactions = []
}) => {
    const { t } = useLanguage();
    const [type, setType] = useState<TransactionType>('income');
    const [formData, setFormData] = useState<Partial<Transaction>>({
        amount: 0, // Reset to 0 initially
        currency: 'UZS',
        category: 'surgery',
        date: new Date().toISOString().split('T')[0],
        description: '',
        patientId: '',
        staffId: ''
    });

    const [splits, setSplits] = useState<{
        category: TransactionCategory;
        amount: number;
        note?: string;
        staffId?: string;
        type: 'fixed' | 'percent';
        rawValue: number;
        isTax?: boolean;
    }[]>([]);

    const [isStaffPickerOpen, setIsStaffPickerOpen] = useState(false);
    const [staffSearch, setStaffSearch] = useState('');
    const [smartData, setSmartData] = useState<{
        label: string;
        value: string;
        subValue?: string;
        action?: { label: string; onClick: () => void };
        color: string;
    } | null>(null);

    const [loading, setLoading] = useState(false);

    // Initial Setup
    useEffect(() => {
        if (isOpen) {
            setType('income');
            setFormData({
                amount: 0,
                currency: 'UZS',
                category: 'surgery',
                date: new Date().toISOString().split('T')[0],
                description: '',
                patientId: initialPatientId || '',
                staffId: ''
            });
            setSplits([]);
            setIsStaffPickerOpen(false);
            setStaffSearch('');
            setSmartData(null);
        }
    }, [isOpen, initialPatientId]);

    // Smart Logic Calculation
    useEffect(() => {
        if (type === 'income' && formData.patientId) {
            const patient = patientList.find(p => p.id === formData.patientId);
            if (patient) {
                // Calculate Paid
                const paid = transactions
                    .filter(t => t.patientId === patient.id && t.type === 'income' && !t.isVoided)
                    .reduce((sum, t) => sum + t.amount, 0);

                const totalCost = patient.totalAmount || 0;
                const remaining = Math.max(0, totalCost - paid);

                setSmartData({
                    label: t('remaining_balance') || 'Qoldiq',
                    value: formatCurrency(remaining),
                    subValue: `${t('total') || 'Jami'}: ${formatCurrency(totalCost)} | ${t('paid') || 'To\'landi'}: ${formatCurrency(paid)}`,
                    color: remaining > 0 ? 'text-rose-500' : 'text-emerald-500',
                    action: remaining > 0 ? {
                        label: t('pay_full') || "To'lov qilish",
                        onClick: () => setFormData(prev => ({ ...prev, amount: remaining }))
                    } : undefined
                });
            }
        } else if (type === 'expense' && formData.category === 'salary' && formData.staffId) {
            const staff = staffList.find(s => s.id === formData.staffId);
            if (staff) {
                const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
                const paidThisMonth = transactions
                    .filter(t => t.staffId === staff.id && t.type === 'expense' && t.category === 'salary' && t.date.startsWith(currentMonth) && !t.isVoided)
                    .reduce((sum, t) => sum + t.amount, 0);

                setSmartData({
                    label: t('paid_this_month') || 'Bu oyda to\'landi',
                    value: formatCurrency(paidThisMonth),
                    color: 'text-indigo-600'
                });
            }
        } else {
            setSmartData(null);
        }
    }, [formData.patientId, formData.staffId, formData.category, type, transactions, patientList]);

    // Update split amounts when total changes
    useEffect(() => {
        if (type === 'income') {
            setSplits(prev => prev.map(s => {
                if (s.isTax && s.type === 'percent') {
                    // Keep proportional sync for Taxes
                    return { ...s, amount: Math.round((formData.amount || 0) * (s.rawValue / 100)) };
                }
                return s;
            }));
        }
    }, [formData.amount, type]);

    const addSplit = (isTax = false) => {
        if (isTax) {
            setSplits([...splits, {
                category: 'tax',
                amount: 0,
                rawValue: 0,
                type: 'percent', // Default to percent for Tax as requested
                note: 'Expense',
                staffId: '',
                isTax
            }]);
        } else {
            // Open Smart Picker
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
                type: 'fixed', // Staff defaults to fixed amount
                note: staff.fullName,
                staffId: staff.id,
                isTax: false
            }]);
            setIsStaffPickerOpen(false);
            setStaffSearch('');
        }
    }

    const removeSplit = (index: number) => {
        setSplits(splits.filter((_, i) => i !== index));
    };

    const updateSplit = (index: number, field: string, value: any) => {
        setSplits(prev => prev.map((s, i) => {
            if (i !== index) return s;
            const updated = { ...s, [field]: value };

            if (field === 'staffId') {
                const staff = staffList.find(st => st.id === value);
                if (staff) {
                    updated.note = staff.fullName;
                }
            }

            // Logic for Amount vs Percentage
            if (field === 'amount') {
                updated.amount = value;
                if (updated.isTax && formData.amount) {
                    updated.rawValue = Number(((value / formData.amount) * 100).toFixed(1));
                }
            } else if (field === 'rawValue') { // Percentage changed
                updated.rawValue = value;
                if (formData.amount) {
                    updated.amount = Math.round((formData.amount * value) / 100);
                }
            }

            return updated;
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const currentTime = new Date().toTimeString().slice(0, 5);
            await onSave({ ...formData, type, time: currentTime });

            if (type === 'income') {
                for (const split of splits) {
                    if (split.amount > 0) {
                        await onSave({
                            amount: split.amount,
                            currency: formData.currency,
                            type: 'expense',
                            category: split.category,
                            date: formData.date,
                            time: currentTime,
                            description: `[Split] ${split.note || (split.staffId ? 'Staff Share' : 'Expense')}`,
                            staffId: split.staffId || '',
                            patientId: formData.patientId || ''
                        });
                    }
                }
            }
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const allocated = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
    const remainder = (formData.amount || 0) - allocated;
    const isOverBudget = remainder < 0;

    const filteredStaff = staffList.filter(s => s.fullName.toLowerCase().includes(staffSearch.toLowerCase()));

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 font-sans">
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white rounded-[32px] w-full max-w-5xl shadow-2xl flex flex-col md:flex-row max-h-[90vh] overflow-y-auto md:overflow-hidden relative"
            >
                {/* Mobile Sticky Close Button */}
                <div className="sticky top-0 z-50 flex justify-end p-4 md:hidden pointer-events-none">
                    <button
                        onClick={onClose}
                        className="bg-white/80 backdrop-blur-md p-2 rounded-full shadow-sm text-slate-500 hover:text-slate-700 pointer-events-auto border border-slate-100"
                    >
                        <X size={20} />
                    </button>
                </div>
                {/* --- LEFT PANEL: THE SOURCE (40%) --- */}
                <div className="w-full md:w-[40%] bg-white p-6 flex flex-col border-b md:border-b-0 md:border-r border-gray-100 relative z-10">
                    {/* ... Left Panel Content ... */}
                    {/* Header Toggle */}
                    <div className="bg-gray-100 p-1.5 rounded-xl flex w-full mb-8">
                        <button
                            onClick={() => setType('income')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all shadow-sm ${type === 'income' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('income') || 'Kirim'}
                        </button>
                        <button
                            onClick={() => setType('expense')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all shadow-sm ${type === 'expense' ? 'bg-rose-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('expense') || 'Xarajat'}
                        </button>
                    </div>

                    <div className="flex flex-col items-center justify-center mb-8 px-4">
                        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 opacity-60">{t('amount') || 'SUMMA'}</div>
                        <div className="relative w-full group">
                            <input
                                type="text"
                                inputMode="numeric"
                                autoFocus
                                value={formData.amount ? new Intl.NumberFormat('ru-RU').format(formData.amount) : ''}
                                onChange={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setFormData({ ...formData, amount: val ? Number(val) : 0 });
                                }}
                                placeholder="0"
                                className="w-full bg-transparent text-center text-3xl md:text-4xl font-black text-slate-800 outline-none placeholder-slate-200 transition-all caret-emerald-500 py-2 border-b-2 border-slate-100 group-hover:border-slate-300 focus:border-emerald-400 tracking-tight"
                            />
                            <div className="text-center mt-2">
                                <span className="text-xs font-black text-slate-300 tracking-widest bg-slate-50 px-2 py-1 rounded-md">UZS</span>
                            </div>
                        </div>
                    </div>

                    {/* SMART INFO CARD */}
                    <AnimatePresence>
                        {smartData && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -10, height: 0 }}
                                className="mb-6 overflow-hidden"
                            >
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center relative overflow-hidden">
                                    {/* Background decoration */}
                                    <div className={`absolute top-0 left-0 w-full h-1 ${smartData.color.replace('text-', 'bg-')}`} />

                                    <div className={`text-xs font-extrabold uppercase tracking-widest mb-1 ${smartData.color}`}>
                                        {smartData.label}
                                    </div>
                                    <div className="text-xl font-black text-slate-800 mb-1">
                                        {smartData.value}
                                    </div>
                                    {smartData.subValue && (
                                        <div className="text-[10px] font-bold text-slate-400">
                                            {smartData.subValue}
                                        </div>
                                    )}

                                    {smartData.action && (
                                        <button
                                            onClick={smartData.action.onClick}
                                            className="mt-3 text-xs font-bold bg-white border border-slate-200 shadow-sm text-slate-600 px-3 py-1.5 rounded-lg hover:text-rose-500 hover:border-rose-200 transition-colors flex items-center gap-1.5"
                                        >
                                            <Calculator className="w-3 h-3" />
                                            {smartData.action.label}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Source Details - Simplified Left Panel */}
                    <div className="space-y-4 flex-1">

                        {/* Category */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('category') || 'Kategoriya'}</label>
                            <div className="relative group bg-white border border-slate-200 shadow-sm rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                                        <Info size={20} />
                                    </div>
                                    <div className="font-bold text-slate-800 text-sm capitalize">{t(formData.category) || formData.category}</div>
                                </div>
                                <ChevronDown size={18} className="text-slate-300" />

                                <div className="absolute inset-0 opacity-0">
                                    <CustomSelect
                                        options={(type === 'income' ? ['surgery', 'consultation', 'injection', 'other'] : ['salary', 'tax', 'rent', 'marketing', 'equipment', 'other']).map(c => ({ value: c, label: t(c) || c }))}
                                        value={formData.category}
                                        onChange={(v) => {
                                            const newCategory = v as TransactionCategory;
                                            // Reset patient/staff if switching to 'other' or irrelevant category
                                            setFormData(prev => ({
                                                ...prev,
                                                category: newCategory,
                                                patientId: '',
                                                staffId: ''
                                            }));
                                        }}
                                        minimal
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('date') || 'Sana'}</label>
                            <div className="relative group bg-white border border-slate-200 shadow-sm rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                                    <Calendar size={20} />
                                </div>
                                <div className="font-bold text-slate-800 text-sm">
                                    {format(new Date(formData.date), 'dd MMMM yyyy')}
                                </div>
                                <div className="absolute inset-0 opacity-0 flex">
                                    <CustomDatePicker value={new Date(formData.date)} onChange={(d) => setFormData({ ...formData, date: d.toISOString() })} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT PANEL: THE DISTRIBUTION ENGINE (60%) --- */}
                <div className="w-full md:w-[60%] bg-white p-6 md:p-10 flex flex-col relative h-full">

                    <div className="flex-1 flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('transaction_details') || 'Tranzaksiya Tafsilotlari'}</h2>
                            <button onClick={onClose} className="hidden md:block p-2 -mr-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                                <X size={24} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* --- DYNAMIC CONTEXTUAL INPUTS --- */}
                        <div className="space-y-6 flex-1">

                            {/* 1. PATIENT SELECTOR (Type: Income + Category: surgery/consultation/injection) */}
                            {(type === 'income' && formData.category !== 'other') && (
                                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                    <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('patient') || 'BEMOR'}</label>
                                    <div className="relative group bg-white border border-slate-200 shadow-sm rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all h-[64px]">
                                        <div className="flex items-center gap-3 w-full overflow-hidden">
                                            {formData.patientId ? (
                                                <>
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                                                        <ImageWithFallback
                                                            src={patientList.find(p => p.id === formData.patientId)?.profileImage || ''}
                                                            alt="Patient"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-bold text-slate-800 text-sm truncate">{patientList.find(p => p.id === formData.patientId)?.fullName}</span>
                                                        <span className="text-[11px] text-slate-400 font-bold truncate">{patientList.find(p => p.id === formData.patientId)?.phone}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-slate-400 font-medium text-sm pl-2">{t('select_patient') || 'Select Patient...'}</span>
                                            )}
                                        </div>
                                        <ChevronDown size={18} className="text-slate-300 ml-2" />

                                        <div className="absolute inset-0 opacity-0">
                                            <CustomSelect
                                                options={patientList.map(p => ({ value: p.id, label: p.fullName }))}
                                                value={formData.patientId || ''}
                                                onChange={(v) => setFormData({ ...formData, patientId: v })}
                                                searchable
                                                minimal
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 2. STAFF SELECTOR (Type: Expense + Category: Salary) */}
                            {(type === 'expense' && formData.category === 'salary') && (
                                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                    <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('staff_member_label') || 'XODIM'}</label>
                                    <div className="relative bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:border-rose-300 hover:shadow-sm transition-all h-[64px]">
                                        <div className="flex items-center gap-3 w-full overflow-hidden">
                                            {formData.staffId ? (
                                                <>
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                                                        <ImageWithFallback
                                                            src={staffList.find(s => s.id === formData.staffId)?.imageUrl || ''}
                                                            alt="Staff"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-bold text-slate-800 text-sm truncate">{staffList.find(s => s.id === formData.staffId)?.fullName}</span>
                                                        <span className="text-[11px] text-slate-400 font-bold truncate capitalize">{staffList.find(s => s.id === formData.staffId)?.role}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-slate-400 font-medium text-sm pl-2">{t('select_staff') || 'Select Staff'}</span>
                                            )}
                                        </div>
                                        <ChevronDown size={18} className="text-slate-300 mr-1" />
                                        <div className="absolute inset-0 opacity-0">
                                            <CustomSelect
                                                options={staffList.map(s => ({ value: s.id, label: s.fullName }))}
                                                value={formData.staffId || ''}
                                                onChange={(v) => setFormData({ ...formData, staffId: v })}
                                                searchable
                                                minimal
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Description Textarea */}
                            <div className="flex flex-col h-full">
                                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('description') || 'TAVSIF'}</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder={t('add_description') || "Izoh qo'shing..."}
                                    className="w-full flex-1 min-h-[140px] bg-slate-50/50 border border-slate-200 rounded-2xl p-5 text-sm font-medium text-slate-700 outline-none resize-none placeholder-slate-400 focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-500/10 transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        {/* Footer / Button */}
                        <div className="mt-8">
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !formData.amount || (type === 'income' && formData.category !== 'other' && !formData.patientId) || (type === 'expense' && formData.category === 'salary' && !formData.staffId)}
                                className={`
                                    w-full !py-4 text-base uppercase tracking-wide shadow-lg
                                    ${type === 'income' ? 'btn-premium-emerald' : 'btn-premium-red'}
                                `}
                            >
                                {loading ? (t('saving') || 'Saving...') : (type === 'income' ? (t('confirm_income') || 'Kirimni Tasdiqlash') : (t('confirm_expense') || 'Chiqimni Tasdiqlash'))}
                            </button>
                        </div>
                    </div>

                </div>

                {/* Mobile Close */}

            </motion.div>
        </div>,
        document.body
    );
};

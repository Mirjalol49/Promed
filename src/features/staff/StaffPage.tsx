import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccount } from '../../contexts/AccountContext';
import { Staff, StaffRole } from '../../types';
import { subscribeToStaff, addStaff, updateStaff, deleteStaff } from '../../lib/staffService';
import { uploadImage, setOptimisticImage, getOptimisticImage } from '../../lib/imageService';
import { getStaffPaymentHistory, addTransaction } from '../../lib/financeService';
import { useToast } from '../../contexts/ToastContext';
import {
    Users, Plus, Search, Phone, Mail, DollarSign, Trash2, Edit2,
    MoreVertical, Calendar, Briefcase, User, X, ChevronLeft, ChevronDown, Activity,
    Clock, Camera, PlusCircle, Loader2, Check, ArrowLeft, Banknote
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { EmptyState } from '../../components/ui/EmptyState';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { ProBadge } from '../../components/ui/ProBadge';
import { Portal } from '../../components/ui/Portal';
import { CustomDatePicker } from '../../components/ui/CustomDatePicker';
import { format } from 'date-fns';
import Lottie from 'lottie-react';
import emptyAnimation from '../../assets/images/mascots/empty.json';

// --- Add/Edit Staff Modal ---
interface StaffFormData extends Partial<Staff> {
    firstName: string;
    lastName: string;
}

const StaffModal = ({
    isOpen,
    onClose,
    onSave,
    initialData
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any, image?: File) => Promise<void>;
    initialData?: Staff | null
}) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<StaffFormData>({
        firstName: initialData?.fullName.split(' ')[0] || '',
        lastName: initialData?.fullName.split(' ').slice(1).join(' ') || '',
        role: initialData?.role || 'doctor',
        phone: initialData?.phone || '',
        salary: initialData?.salary || 0,
        currency: initialData?.currency || 'UZS',
        status: initialData?.status || 'active',
        notes: initialData?.notes || ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [isRoleOpen, setIsRoleOpen] = useState(false);
    const roleRef = useRef<HTMLDivElement>(null);

    // Close role dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
                setIsRoleOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                firstName: initialData.fullName.split(' ')[0] || '',
                lastName: initialData.fullName.split(' ').slice(1).join(' ') || ''
            });
        } else {
            setFormData({
                firstName: '',
                lastName: '',
                role: 'doctor',
                phone: '',
                salary: 0,
                currency: 'UZS',
                status: 'active',
                notes: ''
            });
        }
        setImageFile(null);
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData, imageFile || undefined);
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Failed to save staff member');
        } finally {
            setLoading(false);
        }
    };

    const roles: StaffRole[] = ['doctor', 'assistant', 'nurse', 'cleaner', 'admin', 'other'];

    return (
        <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-[0_30px_100px_rgba(0,0,0,0.15)] relative z-10 border border-slate-100 flex flex-col md:flex-row min-h-[500px] max-h-[90vh] overflow-y-auto md:overflow-hidden"
                >
                    {/* Sticky Close Button (Overlay) */}
                    <div className="sticky top-0 z-50 flex justify-end p-6 pointer-events-none h-0 overflow-visible">
                        <button
                            onClick={onClose}
                            className="bg-slate-100/90 backdrop-blur-sm hover:bg-slate-200 text-slate-500 rounded-full p-2 transition-colors pointer-events-auto shadow-sm ring-1 ring-slate-200/50"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Left Side: Avatar & Basic Info */}
                    <div className="w-full md:w-2/5 p-6 md:p-10 bg-slate-50 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 relative rounded-t-[2.5rem] md:rounded-l-[2.5rem] md:rounded-tr-none shrink-0">
                        <div className="relative group mb-8">
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => fileInputRef.current?.click()}
                                className="w-40 h-40 rounded-[2.5rem] bg-white border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all shadow-sm group-hover:shadow-md"
                            >
                                {(imageFile || initialData?.imageUrl) ? (
                                    <img
                                        src={imageFile ? URL.createObjectURL(imageFile) : initialData?.imageUrl}
                                        className="w-full h-full object-cover"
                                        alt="Staff"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-slate-300 group-hover:text-blue-400 transition-colors">
                                        <Camera size={32} strokeWidth={1.5} />
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) setImageFile(e.target.files[0]);
                                    }}
                                />
                            </motion.div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-3 -right-3 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 border-4 border-white hover:bg-blue-700 hover:scale-110 transition-all"
                            >
                                <Plus size={24} strokeWidth={3} />
                            </button>
                        </div>
                        <h3 className="font-black text-2xl text-slate-900 tracking-tight text-center mb-1">
                            {initialData ? t('edit_staff') : t('add_new_staff')}
                        </h3>
                    </div>

                    {/* Right Side: Detailed Fields */}
                    <form onSubmit={handleSubmit} className="w-full md:w-3/5 p-6 md:p-10 flex flex-col justify-center overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">{t('first_name')}</label>
                                <input
                                    required
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 px-5 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-[3px] focus:ring-blue-500/5 focus:border-blue-400 transition-all outline-none"
                                    value={formData.firstName}
                                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                    placeholder="Mirjalol"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">{t('last_name')}</label>
                                <input
                                    required
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 px-5 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-[3px] focus:ring-blue-500/5 focus:border-blue-400 transition-all outline-none"
                                    value={formData.lastName}
                                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                    placeholder="Shamsiddinov"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">{t('role')}</label>
                                <div className="relative" ref={roleRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsRoleOpen(!isRoleOpen)}
                                        className={`w-full bg-white border rounded-2xl py-3.5 px-5 text-slate-900 font-bold flex items-center justify-between outline-none transition-all ${isRoleOpen ? 'border-blue-400 ring-[3px] ring-blue-500/5' : 'border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            {t(`role_${formData.role}`) || formData.role?.charAt(0).toUpperCase() + formData.role?.slice(1)}
                                        </span>
                                        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isRoleOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isRoleOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.12)] z-50 overflow-hidden"
                                            >
                                                {roles.map((r) => (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, role: r });
                                                            setIsRoleOpen(false);
                                                        }}
                                                        className={`w-full text-left px-5 py-3 font-bold text-sm transition-colors flex items-center justify-between ${formData.role === r ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                                    >
                                                        <span>{t(`role_${r}`) || r.charAt(0).toUpperCase() + r.slice(1)}</span>
                                                        {formData.role === r && <Check size={16} />}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">{t('phone')}</label>
                                <input
                                    required
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 px-5 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-[3px] focus:ring-blue-500/5 focus:border-blue-400 transition-all outline-none"
                                    value={formData.phone}
                                    onChange={e => {
                                        let val = e.target.value;
                                        // Ensure it starts with +998
                                        if (!val.startsWith('+998')) {
                                            if (val.startsWith('998')) val = '+' + val;
                                            else val = '+998' + val.replace(/\D/g, '');
                                        }

                                        // Strip everything except + and digits
                                        const clean = val.replace(/[^\d+]/g, '');

                                        // Format: +998XX XXX XX XX
                                        let formatted = clean;
                                        if (clean.length > 6) {
                                            formatted = clean.slice(0, 6) + ' ' + clean.slice(6);
                                        }
                                        if (clean.length > 9) {
                                            formatted = formatted.slice(0, 10) + ' ' + clean.slice(9);
                                        }
                                        if (clean.length > 11) {
                                            formatted = formatted.slice(0, 13) + ' ' + clean.slice(11);
                                        }

                                        setFormData({ ...formData, phone: formatted.slice(0, 17) });
                                    }}
                                    placeholder="+998XX XXX XX XX"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className={initialData ? "space-y-2" : "space-y-2 col-span-2"}>
                                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">{t('salary')}</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[10px]">UZS</div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-5 text-slate-900 font-bold focus:ring-[3px] focus:ring-blue-500/5 focus:border-blue-400 transition-all outline-none"
                                        value={formData.salary ? new Intl.NumberFormat('uz-UZ').format(Number(formData.salary)) : ''}
                                        onChange={e => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            setFormData({ ...formData, salary: val ? Number(val) : 0 });
                                        }}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {initialData && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('status')}</label>
                                    <div className="flex bg-slate-100/50 p-1 rounded-xl gap-1 h-[46px] items-center">
                                        {['active', 'on_leave', 'terminated'].map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, status: s as any })}
                                                className={`flex-1 h-full rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${formData.status === s
                                                    ? 'bg-white shadow-sm text-blue-600'
                                                    : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {t(`status_${s}`)?.split(' ')[0] || s.split('_')[0]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 mb-8">
                            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">{t('notes')}</label>
                            <textarea
                                className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 px-5 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-[3px] focus:ring-blue-500/5 focus:border-blue-400 transition-all outline-none resize-none"
                                rows={2}
                                value={formData.notes || ''}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="..."
                            />
                        </div>

                        <motion.button
                            whileHover={{ translateY: -2 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="btn-glossy-blue !py-5 !text-sm !uppercase !tracking-widest disabled:opacity-70"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {initialData ? <Edit2 size={18} /> : <Plus size={18} />}
                                    {initialData ? t('update_staff') : t('save_staff')}
                                </>
                            )}
                        </motion.button>
                    </form>
                </motion.div>
            </div>
        </Portal>
    );
};

// --- Pay Salary Modal ---
const PaySalaryModal = ({
    isOpen,
    onClose,
    staffList,
    accountId,
    onSuccess
}: {
    isOpen: boolean;
    onClose: () => void;
    staffList: Staff[];
    accountId: string;
    onSuccess: () => void;
}) => {
    const { t } = useLanguage();
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeStaff = staffList.filter(s => s.status === 'active');
    const selectedStaff = staffList.find(s => s.id === selectedStaffId);

    // Auto-fill amount when staff is selected
    useEffect(() => {
        if (selectedStaff && !amount) {
            setAmount(String(selectedStaff.salary || ''));
        }
    }, [selectedStaffId]);

    // Reset form on open
    useEffect(() => {
        if (isOpen) {
            const autoSelect = activeStaff.length === 1 ? activeStaff[0].id : '';
            setSelectedStaffId(autoSelect);
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setNote('');
            setIsDropdownOpen(false);
        }
    }, [isOpen]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    if (!isOpen) return null;

    const handleSelectStaff = (id: string) => {
        setSelectedStaffId(id);
        setAmount('');
        setIsDropdownOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStaffId || !amount) return;
        setLoading(true);
        try {
            const now = new Date();
            const autoTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            await addTransaction({
                amount: Number(amount),
                currency: selectedStaff?.currency || 'UZS',
                type: 'expense',
                category: 'salary',
                date,
                time: autoTime,
                description: note || `${t('salary_payment_desc') || 'Salary payment'} — ${selectedStaff?.fullName}`,
                staffId: selectedStaffId,
                accountId
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to pay salary:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white rounded-[2rem] w-full max-w-lg shadow-[0_30px_100px_rgba(0,0,0,0.15)] overflow-hidden relative z-10 border border-slate-100"
                >
                    {/* Header */}
                    <div className="p-6 pb-0 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                                <Banknote size={20} className="text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">{t('pay_salary') || 'Pay Salary'}</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-400 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Custom Staff Dropdown */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('select_staff') || 'Select Staff'}</label>
                            <div className="relative" ref={dropdownRef}>
                                {/* Trigger */}
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`w-full bg-slate-50/50 border rounded-2xl py-3 px-4 flex items-center gap-3 transition-all outline-none cursor-pointer ${isDropdownOpen ? 'border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.06)] bg-white' : 'border-slate-200/80 hover:border-slate-300 hover:bg-white'}`}
                                >
                                    {selectedStaff ? (
                                        <>
                                            <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 ring-2 ring-white shadow-sm">
                                                {selectedStaff.imageUrl ? (
                                                    <img src={selectedStaff.imageUrl} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold bg-blue-50 text-sm">
                                                        {selectedStaff.fullName.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <p className="font-bold text-slate-800 text-sm truncate">{selectedStaff.fullName}</p>
                                                <p className="text-[10px] text-slate-400 font-semibold">{t(`role_${selectedStaff.role}`) || selectedStaff.role} · {selectedStaff.salary?.toLocaleString()} {selectedStaff.currency}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                <User size={16} className="text-slate-400" />
                                            </div>
                                            <span className="text-sm font-semibold text-slate-400">{t('select_staff') || 'Select Staff'}...</span>
                                        </>
                                    )}
                                    <motion.div
                                        animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="ml-auto text-slate-400 flex-shrink-0"
                                    >
                                        <ChevronLeft size={16} className="-rotate-90" />
                                    </motion.div>
                                </button>

                                {/* Dropdown List */}
                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden z-50 max-h-[240px] overflow-y-auto"
                                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}
                                        >
                                            {activeStaff.length === 0 ? (
                                                <div className="p-6 text-center text-sm text-slate-400 font-semibold">{t('no_staff_found') || 'No staff members found'}</div>
                                            ) : (
                                                activeStaff.map((staff, idx) => {
                                                    const isSelected = staff.id === selectedStaffId;
                                                    return (
                                                        <button
                                                            key={staff.id}
                                                            type="button"
                                                            onClick={() => handleSelectStaff(staff.id)}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left ${isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'} ${idx > 0 ? 'border-t border-slate-100/70' : ''}`}
                                                        >
                                                            <div className={`w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${isSelected ? 'ring-2 ring-blue-500' : 'ring-2 ring-white'}`}>
                                                                {staff.imageUrl ? (
                                                                    <img src={staff.imageUrl} className="w-full h-full object-cover" alt="" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold bg-blue-50">
                                                                        {staff.fullName.charAt(0)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`font-bold text-sm truncate ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{staff.fullName}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t(`role_${staff.role}`) || staff.role}</span>
                                                                    <span className="text-slate-200">·</span>
                                                                    <span className="text-[10px] font-bold text-emerald-600">{staff.salary?.toLocaleString()} {staff.currency}</span>
                                                                </div>
                                                            </div>
                                                            {isSelected && (
                                                                <motion.div
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: 1 }}
                                                                    className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0"
                                                                >
                                                                    <Check size={12} className="text-white stroke-[3]" />
                                                                </motion.div>
                                                            )}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('amount') || 'Amount'}</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[10px]">UZS</div>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    required
                                    className="w-full bg-slate-50/50 border border-slate-200/80 rounded-2xl py-3.5 pl-12 pr-5 text-slate-900 font-bold text-lg focus:ring-[3px] focus:ring-blue-500/5 focus:border-blue-400 focus:bg-white transition-all outline-none"
                                    value={amount ? new Intl.NumberFormat('uz-UZ').format(Number(amount)) : ''}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setAmount(val);
                                    }}
                                    placeholder={t('enter_amount') || 'Enter amount'}
                                />
                            </div>
                        </div>

                        {/* Date (full width, custom picker) */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('date') || 'Date'}</label>
                            <CustomDatePicker
                                value={new Date(date)}
                                onChange={(d) => setDate(format(d, 'yyyy-MM-dd'))}
                                placeholder={t('select_date') || 'Select Date'}
                            />
                        </div>

                        {/* Note */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('notes') || 'Note'}</label>
                            <input
                                type="text"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                className="w-full bg-slate-50/50 border border-slate-200/80 rounded-2xl py-3.5 px-5 text-slate-900 font-bold placeholder:text-slate-300 placeholder:font-medium focus:border-blue-400 focus:ring-[3px] focus:ring-blue-500/5 focus:bg-white transition-all outline-none"
                                placeholder={t('add_description') || 'Add a description...'}
                            />
                        </div>

                        {/* Submit */}
                        <motion.button
                            whileHover={{ translateY: -2 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading || !selectedStaffId || !amount}
                            className="btn-premium-emerald w-full !py-4 text-sm uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-lg"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Banknote size={18} />
                                    {t('pay_salary') || 'Pay Salary'}
                                </>
                            )}
                        </motion.button>
                    </form>
                </motion.div>
            </div>
        </Portal>
    );
};

const StaffDetail = ({
    staff,
    onBack,
    onStatusChange,
    onEdit
}: {
    staff: Staff;
    onBack: () => void;
    onStatusChange?: (staffId: string, newStatus: string) => Promise<void>;
    onEdit: () => void;
}) => {
    const { t } = useLanguage();
    // Removed tabs, single view logic
    const [payments, setPayments] = useState<any[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Fetch payments
    useEffect(() => {
        if (!staff?.id) return;
        setLoadingPayments(true);
        const unsub = getStaffPaymentHistory(
            staff.id,
            (data: any[]) => {
                setPayments(data);
                setLoadingPayments(false);
            },
            (err: any) => {
                console.error('Error fetching payments:', err);
                setLoadingPayments(false);
            }
        );
        return () => unsub();
    }, [staff?.id]);

    const handleStatusChange = async (newStatus: string) => {
        if (!onStatusChange || !staff?.id || newStatus === staff.status) {
            setShowStatusMenu(false);
            return;
        }
        setUpdatingStatus(true);
        try {
            await onStatusChange(staff.id, newStatus);
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setUpdatingStatus(false);
            setShowStatusMenu(false);
        }
    };

    const statusOptions = [
        { value: 'active', label: 'Active', color: 'bg-emerald-500', textColor: 'text-emerald-600', bgColor: 'bg-emerald-50' },
        { value: 'on_leave', label: 'On Leave', color: 'bg-amber-500', textColor: 'text-amber-600', bgColor: 'bg-amber-50' },
        { value: 'inactive', label: 'Inactive', color: 'bg-slate-300', textColor: 'text-slate-600', bgColor: 'bg-slate-50' }
    ];
    const currentStatus = statusOptions.find(s => s.value === staff.status) || statusOptions[0];

    // Group payments by month
    const paymentsByMonth = useMemo(() => {
        return payments.reduce((acc, payment) => {
            const date = new Date(payment.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            if (!acc[monthKey]) {
                acc[monthKey] = {
                    label: monthLabel,
                    payments: [],
                    total: 0
                };
            }

            acc[monthKey].payments.push(payment);
            acc[monthKey].total += Number(payment.amount) || 0;

            return acc;
        }, {} as Record<string, { label: string; payments: any[]; total: number }>);
    }, [payments]);

    const months = Object.keys(paymentsByMonth).sort().reverse();
    const filteredPayments = selectedMonth === 'all'
        ? payments
        : paymentsByMonth[selectedMonth]?.payments || [];

    const sortedPayments = [...filteredPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate payment statistics for current month
    const paymentStats = useMemo(() => {
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const currentMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Filter payments for current month only
        const currentMonthPayments = payments.filter(p => {
            const paymentDate = new Date(p.date);
            const paymentMonthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
            return paymentMonthKey === currentMonthKey;
        });

        const totalPaidThisMonth = currentMonthPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
        const expectedSalary = staff.salary || 0;
        const remaining = Math.max(0, expectedSalary - totalPaidThisMonth);
        const percentagePaid = expectedSalary > 0 ? Math.min(100, (totalPaidThisMonth / expectedSalary) * 100) : 0;

        let statusColor = 'bg-rose-50';
        let statusTextColor = 'text-rose-600';
        let statusBorderColor = 'border-rose-200';
        let statusLabel = t('underpaid') || 'Underpaid';
        let progressColor = 'bg-rose-500';

        if (percentagePaid >= 100) {
            statusColor = 'bg-emerald-50';
            statusTextColor = 'text-emerald-600';
            statusBorderColor = 'border-emerald-200';
            statusLabel = t('fully_paid') || 'Fully Paid';
            progressColor = 'bg-emerald-500';
        } else if (percentagePaid >= 50) {
            statusColor = 'bg-amber-50';
            statusTextColor = 'text-amber-600';
            statusBorderColor = 'border-amber-200';
            statusLabel = t('partially_paid') || 'Partially Paid';
            progressColor = 'bg-amber-500';
        }

        return {
            currentMonth,
            currentMonthPayments,
            totalPaidThisMonth,
            remaining,
            percentagePaid: Math.round(percentagePaid),
            isFullyPaid: percentagePaid >= 100,
            statusColor,
            statusTextColor,
            statusBorderColor,
            statusLabel,
            progressColor
        };
    }, [payments, staff.salary, t]);

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <button onClick={onBack} className="flex items-center space-x-2 text-slate-500 hover:text-blue-600 transition mb-2 font-bold hover:-translate-x-1 duration-200 px-1">
                <ChevronLeft size={20} />
                <span>{t('back_to_list') || 'Back to List'}</span>
            </button>

            {/* Header Info */}
            <div className="bg-white rounded-3xl p-4 md:p-8 border border-slate-200 flex flex-col md:flex-row gap-8 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex-shrink-0 relative w-40 h-40">
                    {staff.imageUrl ? (
                        <div className="w-full h-full rounded-2xl overflow-hidden ring-4 ring-white border border-slate-100 relative">
                            <img src={staff.imageUrl} alt={staff.fullName} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-full h-full rounded-2xl flex items-center justify-center bg-slate-50 text-blue-500 text-4xl font-bold ring-4 ring-white border border-slate-100">
                            {staff.fullName.charAt(0)}
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-6 z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                {staff.fullName}
                            </h2>
                            <div className="flex flex-wrap items-center gap-6 text-slate-600 mt-3">
                                <span className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <span className="font-semibold text-sm">Joined: {new Date().getFullYear()}</span>
                                </span>
                                <span className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <span className="font-semibold text-sm">{staff.phone}</span>
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 flex-shrink-0">
                            <button
                                onClick={onEdit}
                                className="h-10 px-5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Edit2 size={18} />
                                <span>{t('edit') || 'Edit'}</span>
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                                    className={`h-10 px-5 rounded-xl font-bold border transition-colors flex items-center gap-2 ${currentStatus.bgColor} ${currentStatus.textColor} border-transparent`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${currentStatus.color}`} />
                                    {t(`status_${staff.status}`)?.split(' ')[0] || staff.status}
                                </button>
                                {showStatusMenu && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setShowStatusMenu(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-40 min-w-[140px]"
                                        >
                                            {statusOptions.map(option => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => handleStatusChange(option.value)}
                                                    className={`w-full px-4 py-2 text-left text-xs font-bold uppercase tracking-wide flex items-center gap-2 hover:bg-slate-50 transition-colors ${option.value === staff.status ? 'text-blue-600' : 'text-slate-600'}`}
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${option.color}`} />
                                                    {option.label}
                                                </button>
                                            ))}
                                        </motion.div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('role') || 'ROLE'}</p>
                            <p className="font-bold text-xl text-slate-800 capitalize">{t(`role_${staff.role}`) || staff.role}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('status') || 'STATUS'}</p>
                            <p className={`font-bold text-xl ${currentStatus.textColor} capitalize`}>{t(`status_${staff.status}`)?.split(' ')[0] || staff.status}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('salary') || 'SALARY'}</p>
                            <p className="font-bold text-xl text-slate-800">{staff.salary?.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('currency') || 'CURRENCY'}</p>
                            <p className="font-bold text-xl text-slate-800">{staff.currency}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Summary - Only show if not fully paid */}
            {!paymentStats.isFullyPaid && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className={`bg-white rounded-3xl border-2 ${paymentStats.statusBorderColor} overflow-hidden shadow-lg`}>
                        <div className={`p-6 ${paymentStats.statusColor} border-b-2 ${paymentStats.statusBorderColor}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                        <DollarSign className={`w-5 h-5 ${paymentStats.statusTextColor}`} />
                                        {t('payment_progress') || 'Payment Progress'} · {paymentStats.currentMonth}
                                    </h3>
                                    {paymentStats.currentMonthPayments.length > 0 && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span className="font-semibold">
                                                {t('last_payment') || 'Last Payment'}: {new Date(paymentStats.currentMonthPayments[0].date).toLocaleDateString()} • {paymentStats.currentMonthPayments[0].time || '--:--'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${paymentStats.statusColor} ${paymentStats.statusTextColor} border ${paymentStats.statusBorderColor} self-start md:self-auto`}>
                                    {paymentStats.statusLabel}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('total_paid') || 'Total Paid'}</p>
                                    <p className="font-bold text-2xl text-emerald-600">
                                        {paymentStats.totalPaidThisMonth.toLocaleString()}
                                        <span className="text-xs text-slate-400 ml-1">UZS</span>
                                    </p>
                                </div>

                                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('salary') || 'Expected'}</p>
                                    <p className="font-bold text-2xl text-slate-800">
                                        {staff.salary?.toLocaleString()}
                                        <span className="text-xs text-slate-400 ml-1">UZS</span>
                                    </p>
                                </div>

                                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('remaining_balance') || 'Remaining'}</p>
                                    <p className={`font-bold text-2xl ${paymentStats.statusTextColor}`}>
                                        {paymentStats.remaining.toLocaleString()}
                                        <span className="text-xs text-slate-400 ml-1">UZS</span>
                                    </p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs font-bold">
                                    <span className="text-slate-600">{paymentStats.percentagePaid}% {t('completed') || 'Completed'}</span>
                                    <span className={paymentStats.statusTextColor}>{paymentStats.statusLabel}</span>
                                </div>
                                <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-slate-200 shadow-inner">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${paymentStats.percentagePaid}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={`h-full ${paymentStats.progressColor} rounded-full`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Timeline (Transactions) */}
                <div className="w-full">
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                        <div className="border-b border-slate-100 bg-slate-50/50">
                            <div className="p-6 pb-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-lg text-slate-900">{t('payment_history') || 'Payment History'}</h3>
                                    <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{payments.length}</span>
                                </div>
                            </div>

                            {/* Month Filter Pills */}
                            {months.length > 0 && (
                                <div className="px-6 pb-4 flex gap-2 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none' }}>
                                    <motion.button
                                        type="button"
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedMonth('all')}
                                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 border-2 ${selectedMonth === 'all'
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Calendar size={13} className={selectedMonth === 'all' ? 'text-blue-200' : 'text-slate-400'} />
                                        {t('all_time') || 'All'}
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${selectedMonth === 'all'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {payments.length}
                                        </span>
                                    </motion.button>

                                    {months.map(monthKey => {
                                        const isActive = selectedMonth === monthKey;
                                        const monthData = paymentsByMonth[monthKey];
                                        const date = new Date(monthKey + '-01');
                                        const shortMonth = date.toLocaleDateString('en-US', { month: 'short' });
                                        const year = date.getFullYear();
                                        return (
                                            <motion.button
                                                key={monthKey}
                                                type="button"
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setSelectedMonth(monthKey)}
                                                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 border-2 ${isActive
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <span className="capitalize">{shortMonth} {year}</span>
                                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${isActive
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {monthData.payments.length}
                                                </span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-6 md:p-8">
                            {loadingPayments ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                                </div>
                            ) : sortedPayments.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-48 h-48 mx-auto mb-4">
                                        <Lottie animationData={emptyAnimation} loop={true} />
                                    </div>
                                    <h3 className="text-slate-900 font-bold text-lg mb-2">{t('no_payments_found') || 'No payments found'}</h3>
                                </div>
                            ) : (
                                <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                                    {sortedPayments.map((payment, idx) => (
                                        <div key={payment.id} className="relative">
                                            {/* Timeline Node */}
                                            <div className="absolute -left-[29px] top-4 w-6 h-6 rounded-full bg-emerald-100 border-[3px] border-white ring-1 ring-emerald-200 flex items-center justify-center z-10">
                                                <Check size={12} className="text-emerald-600 stroke-[3]" />
                                            </div>

                                            {/* Card Content */}
                                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all group">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold text-slate-900 text-lg">
                                                                {t('payment') || 'Payment'} #{sortedPayments.length - idx}
                                                            </h4>
                                                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200">
                                                                {t('paid') || 'PAID'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar size={12} />
                                                                {new Date(payment.date).toLocaleDateString()}
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock size={12} />
                                                                {payment.time || new Date(payment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between md:justify-end gap-6 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('amount') || 'Amount'}</p>
                                                            <p className="text-lg font-bold text-slate-900">
                                                                {Number(payment.amount).toLocaleString()} <span className="text-xs text-slate-500">{payment.currency}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const StaffPage = () => {
    const { t } = useLanguage();
    const { accountId } = useAccount();
    const { success, error: toastError } = useToast();

    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [loading, setLoading] = useState(true);
    const [staffPayments, setStaffPayments] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!accountId) return;
        const unsub = subscribeToStaff(accountId, (data) => {
            setStaffList(data);
            setLoading(false);
        });
        return () => unsub();
    }, [accountId]);

    // Track monthly payments for each staff member
    useEffect(() => {
        if (staffList.length === 0) return;
        const unsubscribers: (() => void)[] = [];
        staffList.forEach(staff => {
            const unsub = getStaffPaymentHistory(
                staff.id,
                (payments) => {
                    const now = new Date();
                    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    const thisMonthTotal = payments
                        .filter(p => {
                            const d = new Date(p.date);
                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentMonthKey;
                        })
                        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                    setStaffPayments(prev => ({ ...prev, [staff.id]: thisMonthTotal }));
                }
            );
            unsubscribers.push(unsub);
        });
        return () => unsubscribers.forEach(u => u());
    }, [staffList]);

    const handleSave = async (data: StaffFormData, imageFile?: File) => {
        try {
            let imageUrl = data.imageUrl;

            if (imageFile) {
                const path = `staff/${Date.now()}_${imageFile.name}`;
                imageUrl = await uploadImage(imageFile, path);
            }

            const { firstName, lastName, ...sanitizedData } = data;
            const finalFullName = `${firstName || ''} ${lastName || ''}`.trim();

            if (editingStaff) {
                await updateStaff(editingStaff.id, {
                    ...sanitizedData,
                    fullName: finalFullName,
                    imageUrl
                });
                success(t('staff_updated_title') || 'Updated', t('staff_updated_msg') || 'Staff member updated successfully');
            } else {
                await addStaff({
                    ...sanitizedData,
                    fullName: finalFullName,
                    accountId,
                    imageUrl,
                    joinDate: new Date().toISOString()
                } as Staff);
                success(t('staff_added_title') || 'Added', t('staff_added_msg') || 'New staff member added');
            }
            setIsModalOpen(false);
            setEditingStaff(null);
        } catch (err: any) {
            toastError(t('error') || 'Error', err.message);
        }
    };

    const handleDelete = async (staff: Staff) => {
        if (window.confirm(t('delete_confirmation') || 'Are you sure you want to delete this staff member?')) {
            try {
                await deleteStaff(staff.id, staff.imageUrl);
                success(t('deleted') || 'Deleted', t('staff_deleted') || 'Staff member removed');
            } catch (err: any) {
                toastError(t('error'), err.message);
            }
        }
    };

    const filteredStaff = staffList.filter(s =>
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6 relative z-10">
            {selectedStaff ? (
                <StaffDetail
                    staff={selectedStaff}
                    onBack={() => setSelectedStaff(null)}
                    onStatusChange={async (staffId, newStatus) => {
                        await updateStaff(staffId, { status: newStatus as any });
                        setSelectedStaff(prev => prev ? { ...prev, status: newStatus as any } : null);
                        success(t('status_updated_title') || 'Status Updated', t('status_updated_msg') || 'Staff status changed');
                    }}
                    onEdit={() => { setEditingStaff(selectedStaff); setIsModalOpen(true); }}
                />
            ) : (
                <>
                    {/* Elegant Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                        <div className="space-y-1">
                            <motion.h1
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-3xl font-bold text-slate-900 tracking-tight"
                            >
                                {t('staff_management') || 'Staff Management'}
                            </motion.h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <motion.button
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.01, translateY: -1 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => setIsPayModalOpen(true)}
                                className="!w-auto py-3 rounded-2xl px-6 flex items-center gap-2.5 transition-all duration-300 self-start md:self-auto bg-white border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-bold shadow-sm"
                            >
                                <Banknote size={18} className="stroke-[2.5]" />
                                <span className="text-sm uppercase tracking-wider">{t('pay_salary') || 'Pay Salary'}</span>
                            </motion.button>
                            <motion.button
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.01, translateY: -1 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => { setEditingStaff(null); setIsModalOpen(true); }}
                                className="btn-glossy-blue !w-auto !py-3 px-6 flex items-center gap-2.5 transition-all duration-300 self-start md:self-auto"
                            >
                                <Plus size={18} className="stroke-[3]" />
                                <span className="text-sm uppercase tracking-wider">{t('add_staff') || 'Add Staff'}</span>
                            </motion.button>
                        </div>
                    </div>

                    {/* Premium White Search Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4"
                    >
                        <div className="relative w-full md:w-[450px] group">
                            <input
                                type="text"
                                placeholder={t('search_staff') || "Search by name or role..."}
                                className="w-full pl-14 pr-12 py-4 bg-white/60 backdrop-blur-xl border border-white/40 rounded-[1.25rem] text-slate-900 placeholder:text-slate-400 font-semibold text-base shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] focus:shadow-[0_8px_30px_-5px_rgba(59,130,246,0.15)] focus:bg-white focus:border-blue-500/30 transition-all outline-none"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-400 group-focus-within:text-blue-600 transition-all duration-300 z-10 pointer-events-none">
                                <Search size={22} className="group-focus-within:scale-110 transition-transform" />
                            </div>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-20"
                                >
                                    <X size={14} strokeWidth={3} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 pr-2">
                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-slate-600 font-bold text-xs uppercase tracking-wider">{t('active')}: {staffList.filter(s => s.status === 'active').length}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                                <span className="text-slate-600 font-bold text-xs uppercase tracking-wider">{t('total')}: {staffList.length}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Grid */}
                    {loading ? (
                        <div className="text-center py-20 text-slate-400">{t('loading') || 'Loading...'}</div>
                    ) : filteredStaff.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-12">
                            <EmptyState
                                message={t('no_staff_found') || "No staff members found"}
                                action={
                                    <motion.button
                                        whileHover={{ scale: 1.03, translateY: -1 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => { setEditingStaff(null); setIsModalOpen(true); }}
                                        className="flex items-center gap-2.5 bg-white text-[#0071e3] px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-500/5 border border-blue-50 hover:shadow-xl transition-all uppercase tracking-wider text-xs"
                                    >
                                        <Plus size={18} className="stroke-[3]" />
                                        {t('add_staff') || 'Add Staff'}
                                    </motion.button>
                                }
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {filteredStaff.map(staff => (
                                    <motion.div
                                        key={staff.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        layout
                                        whileHover={{ y: -4 }}
                                        onClick={() => setSelectedStaff(staff)}
                                        className="bg-white rounded-[2rem] border border-slate-100 hover:border-blue-200 hover:shadow-[0_20px_60px_rgba(59,130,246,0.08)] transition-all duration-300 cursor-pointer relative group overflow-hidden"
                                    >
                                        {/* Top accent gradient */}
                                        <div className="h-20 bg-gradient-to-br from-blue-100/70 via-blue-50 to-indigo-100/50 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(59,130,246,0.12),transparent_60%)]" />
                                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-400/10 rounded-full blur-sm" />
                                            {/* Hover arrow */}
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                                <div className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm text-blue-600 flex items-center justify-center shadow-sm border border-white/50">
                                                    <ChevronLeft size={14} className="rotate-180 stroke-[2.5]" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Avatar — overlaps the accent bar */}
                                        <div className="flex justify-center -mt-10 relative z-10">
                                            <div className="relative">
                                                <div className="w-[76px] h-[76px] rounded-2xl overflow-hidden bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-[5px] ring-white">
                                                    {staff.imageUrl ? (
                                                        <img src={staff.imageUrl} alt={staff.fullName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold bg-gradient-to-br from-blue-50 to-indigo-50 text-2xl">
                                                            {staff.fullName.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-white flex items-center justify-center shadow-sm ${staff.status === 'active' ? 'bg-emerald-500' :
                                                    staff.status === 'on_leave' ? 'bg-amber-400' : 'bg-slate-300'
                                                    }`}>
                                                    {staff.status === 'active' && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Name + Role */}
                                        <div className="text-center px-6 pt-3 pb-1">
                                            <h3 className="font-bold text-slate-900 text-[17px] leading-tight truncate group-hover:text-blue-600 transition-colors duration-200">
                                                {staff.fullName}
                                            </h3>
                                            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-[0.12em] rounded-lg border border-blue-200/60">
                                                {t(`role_${staff.role}`) || staff.role}
                                            </span>
                                        </div>

                                        {/* Stat Chips */}
                                        <div className="px-5 pt-4 pb-5">
                                            <div className="flex gap-2">
                                                {/* Salary Chip */}
                                                <div className="flex-1 bg-slate-100 rounded-xl px-3.5 py-3 border border-slate-200">
                                                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.15em] mb-1">{t('salary')}</p>
                                                    <p className="font-extrabold text-slate-900 text-[15px] leading-none">
                                                        {staff.salary?.toLocaleString()}
                                                        <span className="text-[9px] text-slate-500 font-bold ml-1">UZS</span>
                                                    </p>
                                                </div>
                                                {/* Phone Chip */}
                                                <div className="flex-1 bg-slate-100 rounded-xl px-3.5 py-3 border border-slate-200">
                                                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.15em] mb-1">{t('phone')}</p>
                                                    <p className="font-bold text-slate-800 text-[13px] leading-none truncate">{staff.phone || '—'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </>
            )}

            <StaffModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingStaff(null); }}
                onSave={handleSave}
                initialData={editingStaff}
            />

            <PaySalaryModal
                isOpen={isPayModalOpen}
                onClose={() => setIsPayModalOpen(false)}
                staffList={staffList}
                accountId={accountId || ''}
                onSuccess={() => {
                    success(t('salary_paid') || 'Salary Paid', t('salary_paid_msg') || 'Salary payment recorded successfully');
                }}
            />
        </div>
    );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccount } from '../../contexts/AccountContext';
import { Staff, StaffRole } from '../../types';
import { subscribeToStaff, addStaff, updateStaff, deleteStaff } from '../../lib/staffService';
import { uploadImage, setOptimisticImage, getOptimisticImage } from '../../lib/imageService';
import { getStaffPaymentHistory, addTransaction, deleteTransaction, restoreTransaction } from '../../lib/financeService';
import { useToast } from '../../contexts/ToastContext';
import {
    Users, Plus, Search, Phone, Mail, DollarSign, Trash2, Edit2,
    MoreVertical, Calendar, Briefcase, User, X, ChevronLeft, ChevronDown, Activity,
    Clock, Camera, PlusCircle, Loader2, Check, ArrowLeft, Banknote, ChevronRight, RotateCcw
} from 'lucide-react';
import { ButtonLoader } from '../../components/ui/LoadingSpinner';

import { EmptyState } from '../../components/ui/EmptyState';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { ProBadge } from '../../components/ui/ProBadge';
import { Portal } from '../../components/ui/Portal';
import { CustomDatePicker } from '../../components/ui/CustomDatePicker';
import { format } from 'date-fns';
import Lottie from 'lottie-react';
import emptyAnimation from '../../assets/images/mascots/empty.json';
import { StaffSkeleton } from '../../components/ui/Skeletons';
import DeleteModal from '../../components/ui/DeleteModal';

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
                <div
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
                />

                {/* Modal Container */}
                <div className="bg-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                    {/* Header */}
                    <div className="px-5 md:px-8 py-4 md:py-5 flex items-center justify-between bg-slate-200 sticky top-0 z-20 rounded-t-3xl border-b border-white/50">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">
                            {initialData ? t('edit_staff') : t('add_new_staff')}
                        </h2>
                        <button
                            onClick={onClose}
                            className="bg-white/50 hover:bg-white text-slate-500 hover:text-slate-700 rounded-full p-2 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="overflow-y-auto p-5 md:p-8 custom-scrollbar">
                        <form id="staff-form" onSubmit={handleSubmit} className="space-y-6 md:space-y-8">

                            {/* Photo Section - Centered */}
                            <div className="flex flex-col items-center">
                                <div className="relative group">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg ring-1 ring-slate-200 flex items-center justify-center relative overflow-hidden cursor-pointer group-hover:ring-blue-300 transition-all"
                                    >
                                        {(imageFile || initialData?.imageUrl) ? (
                                            <img
                                                src={imageFile ? URL.createObjectURL(imageFile) : initialData?.imageUrl}
                                                className="w-full h-full object-cover"
                                                alt="Staff"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 text-slate-300 group-hover:text-blue-500 transition-colors">
                                                <Camera size={32} strokeWidth={1.5} />
                                            </div>
                                        )}
                                        {/* Overlay text on hover */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-1 right-1 w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-md border-[3px] border-white transition-transform hover:scale-110 active:scale-95"
                                    >
                                        <Plus size={18} strokeWidth={3} />
                                    </button>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) setImageFile(e.target.files[0]);
                                        }}
                                    />
                                </div>
                                <p className="mt-3 text-xs font-semibold text-slate-400">
                                    {t('upload_photo') || 'Upload Photo'}
                                </p>
                            </div>

                            {/* Form Grid */}
                            <div className="flex flex-col md:grid md:grid-cols-2 gap-5 md:gap-x-6 md:gap-y-6">
                                {/* First Name */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700 ml-1">{t('first_name')}</label>
                                    <input
                                        required
                                        className="w-full bg-white shadow-sm border border-transparent hover:border-slate-200 rounded-xl py-3 px-4 text-slate-900 font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none placeholder:text-slate-400"
                                        value={formData.firstName}
                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                        placeholder="Mirjalol"
                                    />
                                </div>
                                {/* Last Name */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700 ml-1">{t('last_name')}</label>
                                    <input
                                        required
                                        className="w-full bg-white shadow-sm border border-transparent hover:border-slate-200 rounded-xl py-3 px-4 text-slate-900 font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none placeholder:text-slate-400"
                                        value={formData.lastName}
                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                        placeholder="Shamsiddinov"
                                    />
                                </div>

                                {/* Role */}
                                <div className="space-y-1.5 relative z-10">
                                    <label className="text-sm font-bold text-slate-700 ml-1">{t('role')}</label>
                                    <div className="relative" ref={roleRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsRoleOpen(!isRoleOpen)}
                                            className={`w-full bg-white shadow-sm border rounded-xl py-3 px-4 text-slate-900 font-bold flex items-center justify-between outline-none transition-all ${isRoleOpen ? 'bg-white border-blue-500 ring-4 ring-blue-500/10' : 'border-transparent hover:border-slate-200'}`}
                                        >
                                            <span className="flex items-center gap-2 capitalize">
                                                {t(`role_${formData.role}`) || formData.role}
                                            </span>
                                            <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isRoleOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isRoleOpen && (
                                            <div
                                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                                            >
                                                {roles.map((r) => (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, role: r });
                                                            setIsRoleOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-3 font-bold text-sm transition-colors flex items-center justify-between ${formData.role === r ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                                    >
                                                        <span className="capitalize">{t(`role_${r}`) || r}</span>
                                                        {formData.role === r && <Check size={16} className="text-blue-600" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700 ml-1">{t('phone')}</label>
                                    <input
                                        required
                                        className="w-full bg-white shadow-sm border border-transparent hover:border-slate-200 rounded-xl py-3 px-4 text-slate-900 font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none placeholder:text-slate-400"
                                        value={formData.phone}
                                        onChange={e => {
                                            let val = e.target.value;
                                            if (!val.startsWith('+998')) {
                                                if (val.startsWith('998')) val = '+' + val;
                                                else val = '+998' + val.replace(/\D/g, '');
                                            }
                                            const clean = val.replace(/[^\d+]/g, '');
                                            let formatted = clean;
                                            if (clean.length > 6) formatted = clean.slice(0, 6) + ' ' + clean.slice(6);
                                            if (clean.length > 9) formatted = formatted.slice(0, 10) + ' ' + clean.slice(9);
                                            if (clean.length > 11) formatted = formatted.slice(0, 13) + ' ' + clean.slice(11);
                                            setFormData({ ...formData, phone: formatted.slice(0, 17) });
                                        }}
                                        placeholder="+998XX XXX XX XX"
                                    />
                                </div>

                                {/* Salary & Status Row */}
                                <div className={initialData ? "space-y-1.5" : "space-y-1.5 col-span-2"}>
                                    <label className="text-sm font-bold text-slate-700 ml-1">{t('salary')}</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">UZS</div>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="w-full bg-white shadow-sm border border-transparent hover:border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-900 font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
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
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700 ml-1">{t('status')}</label>
                                        <div className="flex bg-white shadow-sm p-1.5 rounded-xl border border-transparent gap-1.5 h-[52px]">
                                            {['active', 'on_leave', 'terminated'].map((s) => {
                                                const isActive = formData.status === s;
                                                let activeClass = '';
                                                if (isActive) {
                                                    if (s === 'active') activeClass = 'bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-500/20';
                                                    else if (s === 'on_leave') activeClass = 'bg-white text-amber-600 shadow-sm ring-1 ring-amber-500/20';
                                                    else activeClass = 'bg-white text-rose-600 shadow-sm ring-1 ring-rose-500/20';
                                                } else {
                                                    activeClass = 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50';
                                                }

                                                return (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, status: s as any })}
                                                        className={`flex-1 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeClass}`}
                                                    >
                                                        {t(`status_${s}`)?.split(' ')[0] || s}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 ml-1">{t('notes')}</label>
                                <textarea
                                    className="w-full bg-white shadow-sm border border-transparent hover:border-slate-200 rounded-xl py-3 px-4 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
                                    rows={3}
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder={t('notes_placeholder') || "Write some notes..."}
                                />
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-4 md:p-6 border-t border-white/50 bg-slate-200 flex justify-end gap-3 rounded-b-3xl">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200/50 hover:text-slate-700 transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="btn-glossy-blue !w-auto !px-8 !py-3 !rounded-xl text-sm font-bold shadow-blue-500/20"
                        >
                            {loading ? (
                                <ButtonLoader />
                            ) : (
                                <span className="flex items-center gap-2">
                                    {initialData ? <Edit2 size={16} /> : <Plus size={16} strokeWidth={3} />}
                                    {initialData ? t('update_staff') : t('save_staff')}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
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
    onSuccess,
    initialStaffId
}: {
    isOpen: boolean;
    onClose: () => void;
    staffList: Staff[];
    accountId: string;
    onSuccess: () => void;
    initialStaffId?: string | null;
}) => {
    const { t } = useLanguage();
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeStaff = useMemo(() => staffList.filter(s => s.status === 'active'), [staffList]);

    // Ensure selected staff is visible in dropdown even if inactive
    const visibleOptions = useMemo(() => {
        const options = [...activeStaff];
        if (selectedStaffId) {
            const selected = staffList.find(s => s.id === selectedStaffId);
            // If selected staff is not in active list (e.g. on_leave), add to top
            if (selected && !activeStaff.find(s => s.id === selected.id)) {
                options.unshift(selected);
            }
        }
        return options;
    }, [activeStaff, selectedStaffId, staffList]);

    const selectedStaff = staffList.find(s => s.id === selectedStaffId);

    // Auto-fill amount when staff is selected
    useEffect(() => {
        if (selectedStaff && !amount) {
            setAmount(String(selectedStaff.salary || ''));
        }
    }, [selectedStaffId]); // Keep this simple

    // Reset form on open
    useEffect(() => {
        if (isOpen) {
            const autoSelect = initialStaffId || (activeStaff.length === 1 ? activeStaff[0].id : '');
            setSelectedStaffId(autoSelect);

            // Pre-fill amount if selecting someone
            if (initialStaffId) {
                const s = staffList.find(x => x.id === initialStaffId);
                setAmount(s?.salary ? String(s.salary) : '');
            } else {
                setAmount('');
            }

            setDate(new Date().toISOString().split('T')[0]);
            setNote('');
            setIsDropdownOpen(false);
        }
    }, [isOpen, initialStaffId]); // Added initialStaffId dependency

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
                <div
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <div
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
                        {/* Staff Selection: Static if pre-selected, Dropdown otherwise */}
                        {initialStaffId && selectedStaff ? (
                            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shadow-sm ring-2 ring-white">
                                        {selectedStaff.imageUrl ? (
                                            <img src={selectedStaff.imageUrl} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold bg-blue-50 text-lg">
                                                {selectedStaff.fullName.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-lg">{selectedStaff.fullName}</p>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t(`role_${selectedStaff.role}`) || selectedStaff.role}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('select_staff') || 'Select Staff'}</label>
                                <div className="relative" ref={dropdownRef}>
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
                                        <div
                                            className={`ml-auto text-slate-400 flex-shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                                        >
                                            <ChevronLeft size={16} className="-rotate-90" />
                                        </div>
                                    </button>

                                    {isDropdownOpen && (
                                        <div
                                            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden z-50 max-h-[240px] overflow-y-auto"
                                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}
                                        >
                                            {visibleOptions.length === 0 ? (
                                                <div className="p-6 text-center text-sm text-slate-400 font-semibold">{t('no_staff_found') || 'No staff members found'}</div>
                                            ) : (
                                                visibleOptions.map((staff, idx) => {
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
                                                                <div
                                                                    className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0"
                                                                >
                                                                    <Check size={12} className="text-white stroke-[3]" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Amount: Read-only display if pre-selected, Input otherwise */}
                        {initialStaffId ? (
                            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/80 flex items-center justify-between group cursor-pointer" onClick={() => {
                                // Optional: Allow edit on click if valid
                                // For now, keep it read-only but focusable
                            }}>
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-0.5">{t('salary_amount') || 'Salary Amount'}</p>
                                    <p className="text-2xl font-black text-emerald-700">
                                        {new Intl.NumberFormat('uz-UZ').format(Number(amount))}
                                        <span className="text-sm font-bold text-emerald-600/60 ml-1.5">{selectedStaff?.currency || 'UZS'}</span>
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Check size={20} className="text-emerald-600 stroke-[3]" />
                                </div>
                            </div>
                        ) : (
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
                        )}

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
                        <button
                            type="submit"
                            disabled={loading || !selectedStaffId || !amount}
                            className="btn-glossy-emerald w-full !py-4 text-base uppercase tracking-wide flex items-center justify-center gap-2.5 shadow-lg"
                        >
                            {loading ? (
                                <ButtonLoader />
                            ) : (
                                <>
                                    <Banknote size={18} />
                                    {t('pay_salary') || 'Pay Salary'}
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </Portal>
    );
};

const StaffDetail = ({
    staff,
    onBack,
    onStatusChange,
    onEdit,
    onPay,
    onDelete
}: {
    staff: Staff;
    onBack: () => void;
    onStatusChange?: (staffId: string, newStatus: string) => Promise<void>;
    onEdit?: () => void;
    onPay?: () => void;
    onDelete?: () => void;
}) => {
    const { t, language } = useLanguage();
    // Removed tabs, single view logic
    const [payments, setPayments] = useState<any[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const { success, error: toastError } = useToast();

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

    const handleDeleteTransaction = async (paymentId: string) => {
        if (!window.confirm(t('delete_confirmation') || 'Are you sure?')) return;
        try {
            await deleteTransaction(paymentId);
            success(t('deleted') || 'Deleted', t('transaction_deleted') || 'Transaction deleted');
        } catch (err: any) {
            console.error(err);
            toastError(t('error') || 'Error', err.message);
        }
    };

    const handleRestoreTransaction = async (paymentId: string) => {
        try {
            await restoreTransaction(paymentId);
            success(t('restored') || 'Restored', t('transaction_restored') || 'Transaction restored');
        } catch (err: any) {
            console.error(err);
            toastError(t('error') || 'Error', err.message);
        }
    };

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

    // Helper for capitalization
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    // Group payments by month
    const paymentsByMonth = useMemo(() => {
        return payments.reduce((acc, payment) => {
            const date = new Date(payment.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = capitalize(date.toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US', { month: 'long', year: 'numeric' }));

            if (!acc[monthKey]) {
                acc[monthKey] = {
                    label: monthLabel,
                    payments: [],
                    total: 0
                };
            }

            acc[monthKey].payments.push(payment);
            if (!payment.isVoided) {
                acc[monthKey].total += Number(payment.amount) || 0;
            }

            return acc;
        }, {} as Record<string, { label: string; payments: any[]; total: number }>);
    }, [payments, language]);

    const months = Object.keys(paymentsByMonth).sort().reverse();
    const filteredPayments = selectedMonth === 'all'
        ? payments
        : paymentsByMonth[selectedMonth]?.payments || [];

    const sortedPayments = [...filteredPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate payment statistics for current month
    const paymentStats = useMemo(() => {
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const currentMonth = capitalize(now.toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US', { month: 'long', year: 'numeric' }));

        // Filter payments for current month only AND not voided
        const currentMonthPayments = payments.filter(p => {
            const paymentDate = new Date(p.date);
            const paymentMonthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
            return paymentMonthKey === currentMonthKey && !p.isVoided;
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
    }, [payments, staff.salary, t, language]);

    const monthOptions = useMemo(() => {
        const uniqueMonths = [...months];
        const opts = [
            { value: 'all', label: t('all_time') || 'All Time' }
        ];

        uniqueMonths.forEach(m => {
            try {
                const date = new Date(m + '-01');
                opts.push({
                    value: m,
                    label: capitalize(date.toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US', { month: 'long', year: 'numeric' }))
                });
            } catch (e) {
                opts.push({ value: m, label: m });
            }
        });

        return opts;
    }, [months, t, language]);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition mb-2 font-bold hover:-translate-x-1 duration-200 px-1"
                >
                    <ChevronLeft size={20} />
                    <span>{t('back_to_list') || 'Back to List'}</span>
                </button>
            </div>

            {/* Header Info - Professional Layered Design */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-200/60 shadow-sm flex flex-col gap-8">
                {/* 1. Top Row: Identity & Actions */}
                <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-6">
                    {/* Identity */}
                    <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                        <div className="relative group">
                            {staff.imageUrl ? (
                                <img
                                    src={staff.imageUrl}
                                    alt={staff.fullName}
                                    className="w-24 h-24 object-cover rounded-[1.5rem] border-4 border-white shadow-lg group-hover:scale-105 transition-transform duration-300 ring-1 ring-slate-100"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-[1.5rem] flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 text-3xl font-bold border-4 border-white shadow-lg ring-1 ring-slate-100">
                                    {staff.fullName.charAt(0)}
                                </div>
                            )}
                            <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-[3px] border-white flex items-center justify-center shadow-md ${staff.status === 'active' ? 'bg-emerald-500' :
                                staff.status === 'on_leave' ? 'bg-amber-500' : 'bg-slate-400'
                                }`}>
                                {staff.status === 'active' && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">
                                {staff.fullName}
                            </h2>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50/50 text-blue-700 text-[11px] font-black uppercase tracking-widest border border-blue-100/50">
                                    <User size={12} strokeWidth={2.5} />
                                    {t(`role_${staff.role}`) || staff.role}
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest border ${staff.status === 'active' ? 'bg-emerald-50/50 text-emerald-700 border-emerald-100/50' :
                                    staff.status === 'on_leave' ? 'bg-amber-50/50 text-amber-700 border-amber-100/50' :
                                        'bg-slate-50 text-slate-600 border-slate-100'
                                    }`}>
                                    {t(staff.status === 'active' ? 'active' : staff.status) || staff.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {onDelete && (
                            <button
                                onClick={onDelete}
                                className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-2xl transition-all shadow-sm"
                                title={t('delete_staff') || 'Delete Staff'}
                            >
                                <Trash2 size={20} strokeWidth={2} />
                            </button>
                        )}
                        {onEdit && (
                            <button
                                onClick={onEdit}
                                className="flex-1 md:flex-none h-12 px-6 bg-slate-200 border border-slate-300 hover:bg-slate-300 hover:border-slate-400 text-slate-900 font-bold rounded-2xl text-sm transition-all active:scale-[0.98]"
                            >
                                {t('edit') || 'Edit'}
                            </button>
                        )}
                        {onPay && (
                            <button
                                onClick={onPay}
                                className="btn-glossy-emerald flex-1 md:flex-none md:w-auto h-12 px-8 rounded-2xl uppercase tracking-wide shadow-lg shadow-emerald-500/20"
                            >
                                <Banknote size={18} className="stroke-[2.5]" />
                                <span className="font-black text-xs md:text-sm">{t('pay_salary') || "Oylik To'lash"}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* 2. Bottom Row: Stats/Metrics - Phone & Salary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-200 rounded-2xl p-4 flex items-center justify-between group border border-slate-300 hover:border-slate-400 transition-colors">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">{t('phone') || 'Phone'}</p>
                            <p className="text-lg font-bold text-slate-800 tracking-tight">
                                {staff.phone.replace(/(\+998)(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-colors ring-1 ring-slate-200">
                            <Phone size={20} strokeWidth={2} />
                        </div>
                    </div>

                    <div className="bg-slate-200 rounded-2xl p-4 flex items-center justify-between group border border-slate-300 hover:border-slate-400 transition-colors">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">{t('salary') || 'Salary'}</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                                {staff.salary?.toLocaleString()}
                                <span className="text-sm font-bold text-slate-600 ml-1.5">{staff.currency}</span>
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-500 group-hover:text-emerald-600 transition-colors ring-1 ring-slate-200">
                            <Banknote size={20} strokeWidth={2} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline (High Density Ledger) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1 md:px-2">
                    <h3 className="font-bold text-base md:text-lg text-slate-900 flex items-center gap-2">
                        {t('payment_history') || 'Payment History'}
                        {payments.length > 0 && (
                            <span className="bg-slate-100 text-slate-500 text-xs font-extrabold px-2 py-0.5 rounded-full border border-slate-200">
                                {payments.length}
                            </span>
                        )}
                    </h3>

                    {/* Month Filter Dropdown */}
                    <div className="w-36 md:w-56 h-9 md:h-10 bg-white border border-slate-200 rounded-lg md:rounded-xl relative z-20 text-xs md:text-sm">
                        <CustomSelect
                            options={monthOptions}
                            value={selectedMonth}
                            onChange={setSelectedMonth}
                            minimal={true}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {loadingPayments ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : sortedPayments.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Banknote className="text-slate-300" size={32} />
                            </div>
                            <p className="text-slate-500 font-medium">{t('no_payments_found') || 'No payments recorded yet'}</p>
                        </div>
                    ) : (
                        <div className="min-w-full">
                            {months.map(monthKey => {
                                const monthData = paymentsByMonth[monthKey];
                                if (!monthData || monthData.payments.length === 0) return null;
                                if (selectedMonth !== 'all' && selectedMonth !== monthKey) return null;

                                return (
                                    <div key={monthKey}>
                                        {/* Sticky Month Header - Clean & Distinct */}
                                        <div className="sticky top-0 bg-slate-50/95 backdrop-blur-md px-3 md:px-6 py-2 md:py-2.5 border-b border-slate-200/60 z-10 flex items-center justify-between group">
                                            <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 group-hover:text-blue-600 transition-colors">
                                                {monthData.label}
                                            </h4>
                                            <span className="text-[9px] md:text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">{monthData.payments.length} {t('records') || 'records'}</span>
                                        </div>

                                        {/* Ledger List */}
                                        <div className="space-y-2 px-3 md:px-6 pb-4 md:pb-6">
                                            {monthData.payments.map((payment, idx) => {
                                                const isVoided = !!payment.isVoided;
                                                return (
                                                    <div
                                                        key={payment.id}
                                                        className={`rounded-xl md:rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-0 sm:justify-between transition-colors group cursor-default border ${isVoided
                                                            ? 'bg-slate-100 border-slate-200 opacity-60'
                                                            : 'bg-slate-200/60 border-slate-300/60 hover:bg-slate-200 hover:border-slate-400'
                                                            }`}
                                                    >
                                                        {/* Top/Left: Icon & Info */}
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center border shadow-sm flex-shrink-0 transition-transform duration-300 ${isVoided
                                                                ? 'bg-slate-50 text-slate-400 border-slate-100'
                                                                : 'bg-white text-emerald-600 border-slate-200 group-hover:scale-110'
                                                                }`}>
                                                                <Banknote size={16} className="stroke-[2.5] md:w-[18px] md:h-[18px]" />
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                                <p className={`font-bold text-[13px] md:text-sm leading-tight capitalize transition-colors truncate ${isVoided
                                                                    ? 'text-slate-400 line-through decoration-slate-300'
                                                                    : 'text-slate-900 group-hover:text-blue-600'
                                                                    }`}>
                                                                    {payment.description.startsWith('[Split]')
                                                                        ? `${t('split_from') || '[Split] '}${payment.description.replace('[Split]', '').trim()}`
                                                                        : (t(payment.description) || payment.description)}
                                                                </p>
                                                                <div className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-xs text-slate-500 font-medium flex-wrap">
                                                                    <span>{new Date(payment.date).toLocaleDateString()}</span>
                                                                    <span className="w-1 h-1 rounded-full bg-slate-400" />
                                                                    <span>{payment.time || '—'}</span>
                                                                    {isVoided && (
                                                                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-[9px] font-bold uppercase text-slate-500 tracking-wider">
                                                                            {t('voided') || 'VOIDED'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Bottom/Right: Amount & Buttons */}
                                                        <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-4 pl-12 sm:pl-4">
                                                            <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                                                                <p className={`font-black text-[15px] md:text-base tabular-nums leading-none ${isVoided ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900'
                                                                    }`}>
                                                                    {Number(payment.amount).toLocaleString()}
                                                                    <span className={`text-[10px] font-extrabold ml-1 uppercase ${isVoided ? 'text-slate-300 no-underline' : 'text-slate-500'
                                                                        }`}>{payment.currency}</span>
                                                                </p>
                                                                <div className={`flex items-center gap-1 transition-opacity ${isVoided ? 'opacity-50' : 'opacity-80 group-hover:opacity-100'
                                                                    }`}>
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${isVoided ? 'bg-slate-400' : 'bg-emerald-500'}`}></div>
                                                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isVoided ? 'text-slate-400' : 'text-emerald-700'
                                                                        }`}>
                                                                        {t('paid') || 'Paid'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Delete/Restore Buttons */}
                                                            {isVoided ? (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleRestoreTransaction(payment.id); }}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors bg-white border border-slate-200 shadow-sm flex-shrink-0"
                                                                    title={t('restore') || 'Restore'}
                                                                >
                                                                    <RotateCcw size={16} strokeWidth={2.5} />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(payment.id); }}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white hover:border-rose-200 border border-transparent transition-all shadow-none hover:shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0"
                                                                    title={t('delete') || 'Delete'}
                                                                >
                                                                    <Trash2 size={16} strokeWidth={2.5} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const StaffPage = () => {
    const { t } = useLanguage();
    const { accountId, role } = useAccount();
    const isViewer = role === 'viewer';
    const { success, error: toastError } = useToast();

    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [loading, setLoading] = useState(true);
    const [payModalStaffId, setPayModalStaffId] = useState<string | null>(null);
    const [staffPayments, setStaffPayments] = useState<Record<string, number>>({});
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);

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

    const handleDelete = (staff: Staff) => {
        setStaffToDelete(staff);
    };

    const confirmDelete = async () => {
        if (!staffToDelete) return;
        try {
            await deleteStaff(staffToDelete.id, staffToDelete.imageUrl);
            success(t('deleted') || 'Deleted', t('staff_deleted') || 'Staff member removed');
            if (selectedStaff?.id === staffToDelete.id) {
                setSelectedStaff(null);
            }
        } catch (err: any) {
            toastError(t('error'), err.message);
        } finally {
            setStaffToDelete(null);
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
                    onEdit={!isViewer ? () => { setEditingStaff(selectedStaff); setIsModalOpen(true); } : undefined}
                    onPay={!isViewer ? () => { setPayModalStaffId(selectedStaff.id); setIsPayModalOpen(true); } : undefined}
                    onDelete={!isViewer ? () => handleDelete(selectedStaff) : undefined}
                />
            ) : (
                <>
                    {/* Elegant Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                        <div className="space-y-1">
                            <h1
                                className="text-3xl font-bold text-slate-900 tracking-tight"
                            >
                                {t('staff_management') || 'Staff Management'}
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">

                            {!isViewer && (
                                <button
                                    onClick={() => { setEditingStaff(null); setIsModalOpen(true); }}
                                    className="btn-glossy-blue !w-auto !py-3 px-6 flex items-center gap-2.5 transition-all duration-300 self-start md:self-auto hover:scale-[1.01] hover:-translate-y-px active:scale-99"
                                >
                                    <Plus size={18} className="stroke-[3]" />
                                    <span className="text-sm uppercase tracking-wider">{t('add_staff') || 'Add Staff'}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Premium White Search Bar */}
                    <div
                        className="bg-white p-2 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4"
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
                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-slate-600 font-bold text-xs uppercase tracking-wider">{t('active')}: {staffList.filter(s => s.status === 'active').length}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                                <span className="text-slate-600 font-bold text-xs uppercase tracking-wider">{t('total')}: {staffList.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Grid */}
                    {loading ?
                        <StaffSkeleton />
                        : filteredStaff.length === 0 ?
                            <div className="flex-1 flex items-center justify-center p-12">
                                <EmptyState
                                    message={t('no_staff_found') || "No staff members found"}
                                />
                            </div>
                            :
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                                {filteredStaff.map((staff) => (
                                    <div
                                        key={staff.id}
                                        onClick={() => setSelectedStaff(staff)}
                                        className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 relative group overflow-visible cursor-pointer"
                                    >


                                        {/* Top accent gradient - Simplified for accessibility */}
                                        <div
                                            onClick={() => setSelectedStaff(staff)}
                                            className="h-24 relative overflow-hidden bg-slate-100 cursor-pointer rounded-t-[2rem]"
                                        />

                                        {/* Avatar */}
                                        <div
                                            onClick={() => setSelectedStaff(staff)}
                                            className="flex justify-center -mt-12 relative z-10 cursor-pointer"
                                        >
                                            <div className="relative">
                                                <div className="w-[88px] h-[88px] rounded-[1.5rem] overflow-hidden bg-white shadow-lg ring-[4px] ring-white">
                                                    {staff.imageUrl ? (
                                                        <img src={staff.imageUrl} alt={staff.fullName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold bg-gradient-to-br from-blue-50 to-indigo-50 text-3xl">
                                                            {staff.fullName.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Status Indicator with white border */}
                                                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-[3.5px] border-white flex items-center justify-center shadow-sm z-20 ${staff.status === 'active' ? 'bg-emerald-500' :
                                                    staff.status === 'on_leave' ? 'bg-amber-400' : 'bg-slate-300'
                                                    }`}>
                                                    {staff.status === 'active' && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="px-6 pt-4 pb-6">
                                            {/* Name + Role */}
                                            <div className="text-center mb-6" onClick={() => setSelectedStaff(staff)}>
                                                <h3 className="font-bold text-slate-900 text-lg leading-tight truncate capitalize group-hover:text-blue-600 transition-colors duration-200 cursor-pointer">
                                                    {staff.fullName}
                                                </h3>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                                                    {t(`role_${staff.role}`) || staff.role}
                                                </p>
                                            </div>

                                            {/* Clean Data Layout */}
                                            {/* Data & Actions */}
                                            <div className="space-y-4">
                                                {/* Salary */}
                                                <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between group/item hover:bg-slate-100 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                                                            <Banknote size={16} className="stroke-[2.5]" />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('salary')}</span>
                                                    </div>
                                                    <div className="font-bold text-slate-900">
                                                        {staff.salary?.toLocaleString()} <span className="text-[10px] text-slate-400 font-extrabold ml-0.5">UZS</span>
                                                    </div>
                                                </div>

                                                {/* Phone (Full Width) */}
                                                <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between group/item hover:bg-slate-100 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white text-blue-600 flex items-center justify-center shadow-sm">
                                                            <Phone size={16} className="stroke-[2.5]" />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('phone')}</span>
                                                    </div>
                                                    <div className="font-bold text-slate-900 text-sm">
                                                        {staff.phone || '—'}
                                                    </div>
                                                </div>

                                                {/* Pay Button */}
                                                {/* Pay Button - Hidden for Viewer */}
                                                {!isViewer && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPayModalStaffId(staff.id);
                                                            setIsPayModalOpen(true);
                                                        }}
                                                        className="btn-glossy-emerald uppercase"
                                                    >
                                                        <Banknote size={18} className="stroke-[2.5]" />
                                                        {t('pay_salary') || "Oylik To'lash"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                    }


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
                onClose={() => { setIsPayModalOpen(false); setPayModalStaffId(null); }}
                staffList={staffList}
                accountId={accountId || ''}
                onSuccess={() => {
                    success(t('salary_paid') || 'Salary Paid', t('salary_paid_msg') || 'Salary payment recorded successfully');
                }}
                initialStaffId={payModalStaffId}
            />

            <DeleteModal
                isOpen={!!staffToDelete}
                onClose={() => setStaffToDelete(null)}
                onConfirm={confirmDelete}
                title={t('staff_delete_popup_title') || 'Delete Staff Member?'}
            />
        </div>
    );
};

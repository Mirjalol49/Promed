import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Calendar as CalendarIcon, Bell, AlertCircle, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '../../components/ui/Portal';
import { CustomCalendar } from './CustomCalendar';
import { format, parse } from 'date-fns';

interface ReminderPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (date: Date, reason: string) => Promise<boolean>;
    anchorRef: React.RefObject<HTMLElement>;
    initialDate?: Date;
    initialReason?: string;
}

export const ReminderPopover: React.FC<ReminderPopoverProps> = ({
    isOpen,
    onClose,
    onSave,
    initialDate,
    initialReason = ''
}) => {
    // Default to tomorrow at 10:00 AM
    const getDefaultDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        return tomorrow;
    };

    const [date, setDate] = useState<string>(() => {
        const d = initialDate || getDefaultDate();
        return format(d, 'yyyy-MM-dd');
    });
    const [time, setTime] = useState<string>(() => {
        const d = initialDate || getDefaultDate();
        return format(d, 'HH:mm');
    });
    const [reason, setReason] = useState(initialReason);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedQuick, setSelectedQuick] = useState<number | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setShowSuccess(false);
            setSelectedQuick(null);
            setShowCalendar(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const selectedDate = new Date(`${date}T${time}`);
        if (isNaN(selectedDate.getTime())) {
            setError('Iltimos, to\'g\'ri sana va vaqtni tanlang');
            return;
        }

        if (selectedDate < new Date()) {
            setError('O\'tgan vaqtga eslatma qo\'yib bo\'lmaydi');
            return;
        }

        if (!reason.trim()) {
            setError('Iltimos, sababni kiriting');
            return;
        }

        setIsSaving(true);
        const success = await onSave(selectedDate, reason.trim());

        if (success) {
            setShowSuccess(true);
            setTimeout(() => {
                setIsSaving(false);
                onClose();
            }, 500);
        } else {
            setIsSaving(false);
            setError('Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
        }
    };

    // Quick time options
    const quickOptions = [
        { label: '1 soat', getDate: () => { const d = new Date(); d.setHours(d.getHours() + 1); return d; } },
        { label: 'Ertaga', getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; } },
        { label: '3 kun', getDate: () => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(10, 0, 0, 0); return d; } },
        { label: 'Hafta', getDate: () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(10, 0, 0, 0); return d; } },
    ];

    const applyQuickOption = (index: number, getDate: () => Date) => {
        const d = getDate();
        setDate(format(d, 'yyyy-MM-dd'));
        setTime(format(d, 'HH:mm'));
        setSelectedQuick(index);
        setShowCalendar(false);
    };

    if (!isOpen) return null;

    return (
        <Portal>
            <AnimatePresence>
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
                    onClick={onClose}
                />

                {/* Centered Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="fixed inset-0 z-[101] flex items-center justify-center p-4 py-8 pointer-events-none"
                >
                    <div
                        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh] pointer-events-auto overflow-hidden ring-1 ring-white/20"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) onClose();
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-br from-blue-600 to-indigo-700 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md shadow-inner ring-1 ring-white/20">
                                    <Bell size={22} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">Eslatma o'rnatish</h2>
                                    <p className="text-sm text-blue-100 font-medium opacity-90">Mijozga qo'ng'iroq qilishni unutmang</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-blue-100 hover:text-white"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50" onClick={() => { /* Don't close calendar on click inside */ }}>
                            <div className="p-6 space-y-6">
                                {/* Quick Options */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 px-1">
                                        <Clock size={12} strokeWidth={2.5} />
                                        Tez tanlash
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {quickOptions.map((opt, idx) => (
                                            <button
                                                key={opt.label}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    applyQuickOption(idx, opt.getDate);
                                                }}
                                                className={`py-2.5 px-2 rounded-xl text-sm font-bold transition-all duration-200 border ${selectedQuick === idx
                                                    ? 'bg-blue-700 text-white border-blue-700 shadow-md transform scale-[1.02]'
                                                    : 'bg-white text-slate-700 border-slate-400 hover:border-slate-500 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Date & Time */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-5 gap-3">
                                        <div className="col-span-3 space-y-2">
                                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-widest px-1">
                                                <CalendarIcon size={12} strokeWidth={2.5} />
                                                Sana
                                            </label>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowCalendar(!showCalendar);
                                                }}
                                                className={`w-full px-4 py-3.5 flex items-center justify-between text-sm font-bold border rounded-xl transition-all duration-200 bg-white
                                                    ${showCalendar
                                                        ? 'border-blue-600 ring-4 ring-blue-600/10 text-blue-800 shadow-sm'
                                                        : 'border-slate-400 text-slate-900 hover:border-slate-500 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <span className="font-bold">{format(parse(date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}</span>
                                                <ChevronDown size={18} className={`text-slate-500 transition-transform duration-300 ${showCalendar ? 'rotate-180 text-blue-600' : ''}`} />
                                            </button>
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-widest px-1">
                                                <Clock size={12} strokeWidth={2.5} />
                                                Vaqt
                                            </label>
                                            <input
                                                type="time"
                                                value={time}
                                                onChange={(e) => { setTime(e.target.value); setSelectedQuick(null); }}
                                                className="w-full px-4 py-3.5 text-sm font-bold text-slate-900 border border-slate-400 bg-white rounded-xl focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all hover:border-slate-500 hover:bg-slate-50 appearance-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Custom Calendar Popup - Full Width Expand */}
                                    <AnimatePresence>
                                        {showCalendar && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                                                className="overflow-hidden"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-300/50">
                                                    <CustomCalendar
                                                        value={parse(date, 'yyyy-MM-dd', new Date())}
                                                        onChange={(d) => {
                                                            setDate(format(d, 'yyyy-MM-dd'));
                                                            setSelectedQuick(null);
                                                            setShowCalendar(false);
                                                        }}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 px-1">
                                        <Check size={12} strokeWidth={2.5} />
                                        Sabab
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => {
                                            setReason(e.target.value);
                                            e.target.style.height = 'auto';
                                            const newHeight = Math.min(e.target.scrollHeight, 120);
                                            e.target.style.height = newHeight + 'px';
                                            e.target.style.overflowY = e.target.scrollHeight > 120 ? 'auto' : 'hidden';
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="Eslatma sababini kiriting..."
                                        rows={1}
                                        className="w-full px-4 py-3.5 text-sm font-bold border border-slate-400 bg-white rounded-xl focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all placeholder:text-slate-400 text-slate-900 min-h-[52px] resize-none hover:border-slate-500 hover:bg-slate-50"
                                        style={{ height: '52px' }}
                                    />
                                </div>

                                {/* Error */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, height: 0 }}
                                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                                            exit={{ opacity: 0, y: -10, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="flex items-center gap-3 text-red-600 text-sm font-semibold bg-red-50/50 px-4 py-3 rounded-xl border border-red-100">
                                                <AlertCircle size={18} className="shrink-0" />
                                                <span>{error}</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Actions Footer */}
                            <div className="p-6 bg-white border-t border-slate-100 mt-auto sticky bottom-0">
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-5 py-3.5 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                                    >
                                        Bekor qilish
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-[2] px-5 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        {showSuccess ? (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                            >
                                                <Check size={20} className="stroke-[3]" />
                                            </motion.div>
                                        ) : isSaving ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Bell size={18} className="fill-white/20" />
                                                Saqlash
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </AnimatePresence>
        </Portal>
    );
};

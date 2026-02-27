import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Calendar as CalendarIcon, Bell, AlertCircle, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '../../components/ui/Portal';
import { CustomCalendar } from './CustomCalendar';
import { format, parse } from 'date-fns';
import { useLanguage } from '../../contexts/LanguageContext';

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
    const { t } = useLanguage();

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
    const [calendarPos, setCalendarPos] = useState({ top: 0, left: 0, isAbove: false });
    const buttonRef = useRef<HTMLDivElement>(null);

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
            setError(t('error_date_invalid') || 'Please select a valid date and time');
            return;
        }

        if (selectedDate < new Date()) {
            setError(t('alert_future_time') || 'Please select a valid future time.');
            return;
        }

        if (!reason.trim()) {
            setError(t('validation_reason_required') || 'Please enter a reason');
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
            setError(t('login_error_generic') || 'An error occurred. Please try again.');
        }
    };

    // Quick time options — labels pulled from locale
    const quickOptions = [
        { labelKey: 'one_hour', getDate: () => { const d = new Date(); d.setHours(d.getHours() + 1); return d; } },
        { labelKey: 'tomorrow', getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; } },
        { labelKey: 'three_days', getDate: () => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(10, 0, 0, 0); return d; } },
        { labelKey: 'one_week', getDate: () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(10, 0, 0, 0); return d; } },
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
                        <div className="relative px-6 py-6 shrink-0 overflow-hidden" style={{ background: 'linear-gradient(180deg, #4A85FF 0%, #0044FF 100%)' }}>
                            {/* Glossy reflection overlay */}
                            <div className="absolute inset-x-0 top-0 h-[45%] pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0) 100%)' }} />
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md shadow-inner ring-1 ring-white/25">
                                        <Bell size={22} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight leading-none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}>
                                            {t('set_reminder')}
                                        </h2>
                                        <p className="text-[10px] text-white/80 font-black uppercase tracking-widest mt-1">
                                            {t('dont_forget_call')}
                                        </p>
                                    </div>
                                </div>
                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                    onClick={onClose}
                                    className="p-2.5 hover:bg-white/15 rounded-xl transition-colors text-white/60 hover:text-white"
                                >
                                    <X size={22} />
                                </motion.button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50" onClick={() => { /* Don't close calendar on click inside */ }}>
                            <div className="p-6 space-y-6">
                                {/* Quick Options */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 px-1">
                                        <Clock size={12} strokeWidth={2.5} />
                                        {t('quick_select')}
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {quickOptions.map((opt, idx) => (
                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                key={opt.labelKey}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    applyQuickOption(idx, opt.getDate);
                                                }}
                                                className={`py-2.5 px-2 rounded-xl text-sm font-black transition-all duration-300 border ${selectedQuick === idx
                                                    ? 'text-white border-transparent shadow-lg shadow-blue-500/30 transform scale-[1.02]'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400/30 hover:bg-blue-50/50'
                                                    }`}
                                                style={selectedQuick === idx ? { background: 'linear-gradient(180deg, #4A85FF 0%, #0044FF 100%)' } : undefined}
                                            >
                                                {t(opt.labelKey) || opt.labelKey}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* Date & Time */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-5 gap-3">
                                        <div className="col-span-3 space-y-2 relative" ref={buttonRef}>
                                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-widest px-1">
                                                <CalendarIcon size={12} strokeWidth={2.5} />
                                                {t('date_label') || t('date')}
                                            </label>
                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const spaceBelow = window.innerHeight - rect.bottom;
                                                    const showAbove = spaceBelow < 340;
                                                    setCalendarPos({
                                                        top: showAbove ? rect.top - 8 : rect.bottom + 8,
                                                        left: rect.left,
                                                        isAbove: showAbove
                                                    });
                                                    setShowCalendar(!showCalendar);
                                                }}
                                                className={`w-full px-4 py-3.5 flex items-center justify-between text-sm font-bold border rounded-xl transition-all duration-200 bg-white
                                                    ${showCalendar
                                                        ? 'border-promed-primary ring-4 ring-promed-primary/10 text-promed-primary shadow-sm'
                                                        : 'border-slate-200 text-slate-900 hover:border-promed-primary/30 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <span className="font-bold">{format(parse(date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}</span>
                                                <ChevronDown size={18} className={`text-slate-500 transition-transform duration-300 ${showCalendar ? 'rotate-180 text-promed-primary' : ''}`} />
                                            </motion.button>

                                            {/* Floating Calendar via Portal - No Clipping */}
                                            {showCalendar && (
                                                <Portal>
                                                    <div
                                                        className="fixed inset-0 z-[9999]"
                                                        onClick={() => setShowCalendar(false)}
                                                    />
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: calendarPos.isAbove ? 10 : -10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: calendarPos.isAbove ? 10 : -10 }}
                                                        transition={{ duration: 0.2 }}
                                                        style={{
                                                            position: 'fixed',
                                                            top: calendarPos.isAbove ? 'auto' : calendarPos.top,
                                                            bottom: calendarPos.isAbove ? (window.innerHeight - calendarPos.top) : 'auto',
                                                            left: calendarPos.left,
                                                            zIndex: 10000
                                                        }}
                                                        className="bg-white rounded-2xl shadow-2xl shadow-slate-900/15 border border-slate-200 p-4 w-[320px]"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <CustomCalendar
                                                            value={parse(date, 'yyyy-MM-dd', new Date())}
                                                            onChange={(d) => {
                                                                setDate(format(d, 'yyyy-MM-dd'));
                                                                setSelectedQuick(null);
                                                                setShowCalendar(false);
                                                            }}
                                                        />
                                                    </motion.div>
                                                </Portal>
                                            )}
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-widest px-1">
                                                <Clock size={12} strokeWidth={2.5} />
                                                {t('time_label') || t('select_time')}
                                            </label>
                                            <input
                                                type="time"
                                                value={time}
                                                onChange={(e) => { setTime(e.target.value); setSelectedQuick(null); }}
                                                className="w-full px-4 py-3.5 text-sm font-black text-slate-900 border border-slate-200 bg-white rounded-xl focus:outline-none focus:border-promed-primary focus:ring-4 focus:ring-promed-primary/10 transition-all hover:border-promed-primary/30 hover:bg-slate-50 appearance-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 px-1">
                                        <Check size={12} strokeWidth={2.5} />
                                        {t('reason_label')}
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
                                        placeholder={t('reason_placeholder') || t('add_note_placeholder') || '...'}
                                        rows={1}
                                        className="w-full px-4 py-3.5 text-sm font-black border border-slate-200 bg-white rounded-xl focus:outline-none focus:border-promed-primary focus:ring-4 focus:ring-promed-primary/10 transition-all placeholder:text-slate-400 placeholder:font-normal text-slate-900 min-h-[52px] resize-none hover:border-promed-primary/30 hover:bg-slate-50"
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
                                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-5 py-3.5 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                                    >
                                        {t('cancel')}
                                    </motion.button>
                                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                        type="submit"
                                        disabled={isSaving}
                                        onClick={(e) => e.stopPropagation()}
                                        className="btn-glossy-blue flex-[2] !px-5 !py-3.5 !text-sm !font-black !rounded-xl disabled:opacity-50"
                                    >
                                        <span className="flex items-center justify-center gap-2">
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
                                                    {t('save')}
                                                </>
                                            )}
                                        </span>
                                    </motion.button>
                                </div>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </AnimatePresence>
        </Portal>
    );
};

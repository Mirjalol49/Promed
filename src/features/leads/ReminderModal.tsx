import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Bell, Trash, ChevronDown, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

interface ReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSetReminder: (date: Date, note: string) => void;
    initialDate?: Date;
    initialNote?: string;
    onDelete?: () => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose, onSetReminder, initialDate, initialNote, onDelete }) => {
    const { t } = useLanguage();

    // Default to tomorrow at 10:00 AM if no initial date
    const getDefaultDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(10, 0, 0, 0);
        return d;
    };

    const [date, setDate] = useState<string>('');
    const [time, setTime] = useState<string>('10:00');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (isOpen) {
            const d = initialDate || getDefaultDate();
            setDate(d.toISOString().split('T')[0]);
            setTime(d.toTimeString().slice(0, 5));
            setNote(initialNote || '');
        }
    }, [isOpen, initialDate, initialNote]);

    if (!isOpen) return null;

    const handleQuickSelect = (type: '1h' | 'tomorrow' | '3d' | '1w') => {
        const d = new Date();
        if (type === '1h') d.setHours(d.getHours() + 1);
        else if (type === 'tomorrow') d.setDate(d.getDate() + 1);
        else if (type === '3d') d.setDate(d.getDate() + 3);
        else if (type === '1w') d.setDate(d.getDate() + 7);

        setDate(d.toISOString().split('T')[0]);
        // Round to nearest 5 mins for cleaner time
        const roundedTime = new Date(Math.round(d.getTime() / 300000) * 300000);
        setTime(roundedTime.toTimeString().slice(0, 5));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const combined = new Date(`${date}T${time}`);
            onSetReminder(combined, note);
            onClose();
        } catch (err) {
            console.error("Invalid date", err);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden"
            >
                {/* Premium Glossy Blue Header */}
                <div className="relative px-8 py-10 overflow-hidden" style={{ background: 'linear-gradient(180deg, #4A85FF 0%, #0044FF 100%)' }}>
                    {/* Glossy reflection overlay */}
                    <div className="absolute inset-x-0 top-0 h-[45%] pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0) 100%)' }} />
                    {/* Abstract background glow */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl animate-pulse" style={{ background: 'rgba(74,133,255,0.35)' }} />

                    <div className="relative flex items-center gap-5 z-10">
                        <div className="w-14 h-14 bg-white/15 backdrop-blur-xl border border-white/25 rounded-[1.25rem] flex items-center justify-center shadow-lg transform rotate-3">
                            <Bell size={28} className="text-white fill-white/10" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-black text-2xl text-white tracking-tight leading-none mb-1.5" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}>{t('set_reminder')}</h3>
                            <p className="text-[10px] font-bold text-blue-100 uppercase tracking-[0.15em] opacity-90">{t('dont_forget_call')}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="absolute top-0 right-0 p-2 text-white/50 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-7">
                    {/* Quick Select Buttons */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={12} strokeWidth={3} />
                            {t('quick_select')}
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { id: '1h', label: t('one_hour') },
                                { id: 'tomorrow', label: t('tomorrow') },
                                { id: '3d', label: t('three_days') },
                                { id: '1w', label: t('one_week') }
                            ].map(btn => (
                                <button
                                    key={btn.id}
                                    type="button"
                                    onClick={() => handleQuickSelect(btn.id as any)}
                                    className="h-11 rounded-2xl border border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95 shadow-sm"
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date/Time Inputs */}
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                                <Calendar size={12} strokeWidth={3} />
                                {t('date_label')}
                            </label>
                            <div className="relative group">
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-800 text-sm shadow-sm cursor-pointer hover:border-slate-300"
                                />
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
                            </div>
                        </div>
                        <div className="w-[120px] space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                                <Clock size={12} strokeWidth={3} />
                                {t('time_label')}
                            </label>
                            <input
                                type="time"
                                required
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-800 text-sm shadow-sm cursor-pointer hover:border-slate-300"
                            />
                        </div>
                    </div>

                    {/* Label/Note */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                            <Check size={12} strokeWidth={3} />
                            {t('reason_label')}
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="..."
                            rows={1}
                            className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-800 text-sm shadow-sm placeholder:text-slate-300 resize-none hover:border-slate-300"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col gap-3 pt-4">
                        <button
                            type="submit"
                            className="btn-glossy-blue w-full !h-16 !rounded-[1.25rem] flex items-center justify-center gap-3 !font-black !text-sm uppercase tracking-widest"
                        >
                            <span className="flex items-center gap-3">
                                <Bell size={18} strokeWidth={3} />
                                {t('save')}
                            </span>
                        </button>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 h-14 bg-slate-50 text-slate-500 border border-slate-100 rounded-[1.25rem] font-bold text-sm hover:bg-slate-100 transition-all active:scale-[0.98]"
                            >
                                {t('cancel')}
                            </button>
                            {initialDate && onDelete && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm("Delete this reminder?")) {
                                            onDelete();
                                            onClose();
                                        }
                                    }}
                                    className="h-14 px-6 bg-rose-50 text-rose-500 border border-rose-100 rounded-[1.25rem] font-bold text-sm hover:bg-rose-100 transition-all active:scale-[0.98]"
                                >
                                    <Trash size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

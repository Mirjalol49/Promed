import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Bell } from 'lucide-react';
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

    // Footer Actions
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
                    <div className="flex items-center gap-2 text-blue-600">
                        <Bell size={20} className="fill-blue-600/20" />
                        <h3 className="font-bold text-lg">Set Reminder</h3>
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Date Input */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                            <Calendar size={14} className="text-slate-400" />
                            Date
                        </label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                        />
                    </div>

                    {/* Time Input */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                            <Clock size={14} className="text-slate-400" />
                            Time
                        </label>
                        <input
                            type="time"
                            required
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                        />
                    </div>

                    {/* Note Input */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Note (Optional)</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Checking regarding..."
                            rows={3}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 placeholder:text-slate-400 resize-none"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 flex gap-3">
                        {initialDate && onDelete && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm("Are you sure you want to delete this reminder?")) {
                                        onDelete();
                                    }
                                }}
                                className="px-4 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                            >
                                Delete
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 rounded-xl transition-all active:scale-[0.98]"
                        >
                            Set Reminder
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

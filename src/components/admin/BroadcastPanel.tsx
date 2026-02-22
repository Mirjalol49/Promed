import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { Megaphone, Send, Info, AlertTriangle, ShieldCheck, Bell, Users, User } from 'lucide-react';
import { createSystemAlert, sendTargetedNotifications } from '../../lib/notificationService';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface BroadcastPanelProps {
    users?: any[];
}

export const BroadcastPanel: React.FC<BroadcastPanelProps> = ({ users = [] }) => {
    const { t } = useLanguage();
    const { success, error: showError } = useToast();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'info' | 'warning' | 'danger' | 'success'>('info');
    const [loading, setLoading] = useState(false);

    // Targeted mode state
    const [targetMode, setTargetMode] = useState<'all' | 'specific'>('all');
    const [selectedUserId, setSelectedUserId] = useState('');

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;

        if (targetMode === 'specific' && !selectedUserId) {
            showError('Missing Recipient', 'Please select a user to send this message to.');
            return;
        }

        const confirmMsg = targetMode === 'all'
            ? "Are you sure you want to broadcast this message to ALL users?"
            : "Send this private notification to the selected user?";

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            if (targetMode === 'all') {
                await createSystemAlert({
                    title,
                    content: message,
                    type,
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
                });
                success(t('broadcast_success'), 'Message sent to all active sessions.');
            } else {
                // Find selected user for name in confirmation
                const targetUser = users.find(u => u.id === selectedUserId);
                await sendTargetedNotifications([selectedUserId], {
                    title,
                    content: message,
                    type,
                    category: 'message'
                });
                success('Message Sent', `Notification delivered to ${targetUser?.fullName || 'User'}`);
            }

            setTitle('');
            setMessage('');
            setType('info');
        } catch (err: any) {
            showError('Broadcast Failed', err.message);
        } finally {
            setLoading(false);
        }
    };

    const getTypeStyles = (t: string) => {
        switch (t) {
            case 'info': return 'bg-blue-100 text-blue-600 border-blue-200';
            case 'warning': return 'bg-amber-100 text-amber-600 border-amber-200';
            case 'danger': return 'bg-rose-100 text-rose-600 border-rose-200';
            case 'success': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Megaphone className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{t('megaphone_title')}</h2>
                    <p className="text-sm text-slate-500">{t('megaphone_desc')}</p>
                </div>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-6">

                {/* Recipient Toggle */}
                <div className="bg-slate-50 p-1 rounded-xl flex">
                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                        type="button"
                        onClick={() => setTargetMode('all')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${targetMode === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <Users size={16} />
                        <span>All Users</span>
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                        type="button"
                        onClick={() => setTargetMode('specific')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${targetMode === 'specific' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <User size={16} />
                        <span>Specific User</span>
                    </motion.button>
                </div>

                {targetMode === 'specific' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Recipient</label>
                        <select
                            value={selectedUserId}
                            onChange={e => setSelectedUserId(e.target.value)}
                            className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                            required={targetMode === 'specific'}
                        >
                            <option value="">-- Choose User --</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.fullName || u.name} ({u.role})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type</label>
                        <div className="flex gap-2">
                            {(['info', 'success', 'warning', 'danger'] as const).map(bt => (
                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                    key={bt}
                                    type="button"
                                    onClick={() => setType(bt)}
                                    className={`p-2 rounded-lg border-2 transition-all ${type === bt ? getTypeStyles(bt) + ' ring-2 ring-offset-1 ring-slate-200' : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100'
                                        }`}
                                >
                                    {bt === 'info' && <Info size={16} />}
                                    {bt === 'warning' && <AlertTriangle size={16} />}
                                    {bt === 'danger' && <ShieldCheck size={16} />}
                                    {bt === 'success' && <Bell size={16} />}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Headline</label>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        placeholder={targetMode === 'all' ? "System Maintenance..." : "Important Account Notice"}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message Content</label>
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[100px] resize-none transition-all"
                        placeholder="Type your message here..."
                        required
                    />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                        type="button"
                        onClick={() => { setTitle(''); setMessage(''); }}
                        className="px-4 py-3 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors"
                    >
                        {t('clear')}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                        type="submit"
                        disabled={loading}
                        className="btn-premium-blue px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-promed-primary/20"
                    >
                        <span>{loading ? 'Transmitting...' : t('transmit')}</span>
                        <Send className="w-4 h-4" />
                    </motion.button>
                </div>
            </form>
        </div>
    );
};

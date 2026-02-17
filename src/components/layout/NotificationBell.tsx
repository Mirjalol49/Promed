import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Info, AlertTriangle, ShieldCheck, Megaphone, Clock } from 'lucide-react';
import { useSystemAlert } from '../../contexts/SystemAlertContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { dismissNotification } from '../../lib/notificationService';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationBell: React.FC<{ className?: string }> = ({ className = 'text-slate-600 hover:bg-slate-100 hover:text-promed-primary' }) => {
    const { alerts, unreadCount, markAllAsRead } = useSystemAlert();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => {
        if (!isOpen) markAllAsRead();
        setIsOpen(!isOpen);
    };

    const getIcon = (alert: any) => {
        const text = ((alert.title || '') + ' ' + (alert.content || '')).toLowerCase();

        // 1. Billing / Payment / Finance
        if (text.match(/bill|payment|hisob|to'lov|invoice|narx|summa|cheque|receipt|pay|cost|price|subscription/)) {
            return <span className="text-lg">💳</span>;
        }

        // 2. Congratulations / Success / Welcome
        if (text.match(/congrat|tabrik|yutuq|sovg'a|bonus|welcome|xush kelibsiz|good job|great|muvaffaqiyat|winner|champion/)) {
            return <span className="text-lg">🎉</span>;
        }

        // 3. General Messages / Updates
        if (text.match(/xabar|message|sms|yangilik|news|update|read|info/)) {
            return <span className="text-lg">💬</span>;
        }

        // 4. Default Type-Based Fallback
        switch (alert.type) {
            case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
            case 'danger': return <ShieldCheck size={16} className="text-rose-500" />;
            case 'success': return <span className="text-lg">✅</span>; // User likes emojis
            default: return <Info size={16} className="text-promed-primary" />;
        }
    };

    const getTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

        if (diffInMinutes < 1) return t('time_just_now');
        if (diffInMinutes < 60) return t('time_minute_ago').replace('{m}', diffInMinutes.toString());
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return t('time_hour_ago').replace('{h}', diffInHours.toString());
        return date.toLocaleDateString();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleDropdown}
                className={`relative p-2.5 rounded-xl transition-all duration-300 ${isOpen ? 'bg-promed-light text-promed-primary shadow-inner' : className
                    }`}
            >
                <style>
                    {`
                    @keyframes ring {
                        0% { transform: rotate(0); }
                        10% { transform: rotate(15deg); }
                        20% { transform: rotate(-10deg); }
                        30% { transform: rotate(5deg); }
                        40% { transform: rotate(-5deg); }
                        50% { transform: rotate(0); }
                        100% { transform: rotate(0); }
                    }
                    .bell-ringing {
                        animation: ring 2s ease-in-out infinite;
                        transform-origin: top center;
                    }
                    `}
                </style>
                <div className="relative">
                    <div className={`${unreadCount > 0 ? 'bell-ringing' : ''}`}>
                        <Bell size={24} className={`transition-colors ${isOpen ? 'text-promed-primary fill-current' : 'text-current'}`} />
                    </div>
                    {unreadCount > 0 && (
                        <div className="absolute -top-1.5 -right-1.5">
                            <span className="relative flex h-5 w-5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-[10px] font-bold text-white items-center justify-center border-[2px] border-white shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            </span>
                        </div>
                    )}
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="fixed inset-x-4 top-20 md:absolute md:inset-auto md:top-full md:right-0 md:mt-3 md:w-80 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden"
                    >
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <h3 className="font-black text-xs uppercase tracking-widest text-slate-900">{t('notifications')}</h3>
                                <span className="px-2 py-0.5 bg-promed-light text-promed-primary rounded-lg text-[10px] font-black">{alerts.length}</span>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                            {alerts.length === 0 ? (
                                <div className="p-10 text-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 grayscale opacity-50">
                                        <Megaphone size={24} className="text-slate-400" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">{t('no_notifications_yet')}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {alerts.map((alert) => (
                                        <div key={alert.id} className={`p-4 hover:bg-slate-50 transition-colors group cursor-default ${alert.is_active ? 'bg-blue-50/20' : ''}`}>
                                            <div className="flex gap-4">
                                                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 flex-shrink-0 self-start group-hover:scale-110 transition-transform">
                                                    {getIcon(alert)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className="font-bold text-sm text-slate-900 mb-0.5 leading-tight">{alert.title}</h4>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                dismissNotification(alert.id);
                                                            }}
                                                            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-slate-500 leading-relaxed break-words">{alert.content}</p>
                                                    <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-slate-400">
                                                        <Clock size={10} />
                                                        <span>{getTimeAgo(alert.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

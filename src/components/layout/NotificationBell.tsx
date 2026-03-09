import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Info, AlertTriangle, ShieldCheck, Megaphone, Clock, CheckCircle2, CreditCard, MessageSquare, Sparkles, CheckCheck } from 'lucide-react';
import { useSystemAlert } from '../../contexts/SystemAlertContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { dismissNotification } from '../../lib/notificationService';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationBell: React.FC<{ className?: string, onPatientSelect?: (id: string) => void }> = ({ className = 'text-slate-600 hover:bg-slate-100 hover:text-promed-primary', onPatientSelect }) => {
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
        // 0. Patient Image Support
        if (alert.patientImage) {
            return (
                <img
                    src={alert.patientImage}
                    alt={alert.patientName || 'Patient'}
                    className="w-full h-full object-cover rounded-xl"
                />
            );
        }

        const text = ((alert.title || '') + ' ' + (alert.content || '')).toLowerCase();

        // 1. Billing / Payment / Finance
        if (text.match(/bill|payment|hisob|to'lov|invoice|narx|summa|cheque|receipt|pay|cost|price|subscription/)) {
            return <CreditCard strokeWidth={1.5} size={20} className="text-emerald-500" />;
        }

        // 2. Congratulations / Success / Welcome
        if (text.match(/congrat|tabrik|yutuq|sovg'a|bonus|welcome|xush kelibsiz|good job|great|muvaffaqiyat|winner|champion/)) {
            return <Sparkles strokeWidth={1.5} size={20} className="text-amber-500" />;
        }

        // 3. General Messages / Updates
        if (text.match(/xabar|message|sms|yangilik|news|update|read|info/)) {
            return <MessageSquare strokeWidth={1.5} size={20} className="text-blue-500" />;
        }

        // 4. Default Type-Based Fallback
        switch (alert.type) {
            case 'warning': return <AlertTriangle strokeWidth={1.5} size={20} className="text-amber-500" />;
            case 'danger': return <ShieldCheck strokeWidth={1.5} size={20} className="text-rose-500" />;
            case 'success': return <CheckCircle2 strokeWidth={1.5} size={20} className="text-emerald-500" />;
            default: return <Info strokeWidth={1.5} size={20} className="text-promed-primary" />;
        }
    };

    const getTimeAgo = (dateStr: string) => {
        if (!dateStr) return '';
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
            <motion.button
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 800, damping: 35 }}
                onClick={toggleDropdown}
                className={`relative p-2.5 rounded-2xl transition-all duration-300 isolate group ${isOpen ? 'bg-slate-100 text-promed-primary shadow-inner' : className
                    }`}
                aria-label={t('notifications')}
                aria-expanded={isOpen}
            >
                <style>
                    {`
                    @keyframes gentleRinging {
                        0% { transform: rotate(0); }
                        15% { transform: rotate(10deg); }
                        30% { transform: rotate(-8deg); }
                        45% { transform: rotate(6deg); }
                        60% { transform: rotate(-4deg); }
                        75% { transform: rotate(2deg); }
                        85% { transform: rotate(-1deg); }
                        100% { transform: rotate(0); }
                    }
                    .custom-bell-ringing {
                        animation: gentleRinging 2.5s ease-in-out infinite;
                        transform-origin: top center;
                    }
                    `}
                </style>
                <div className="relative flex items-center justify-center">
                    <div className={unreadCount > 0 ? 'custom-bell-ringing' : 'group-hover:scale-110 transition-transform duration-300'}>
                        <Bell strokeWidth={2} size={22} className={`transition-colors duration-300 ${isOpen ? 'text-promed-primary fill-promed-light' : 'text-current'}`} />
                    </div>
                    {unreadCount > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center">
                            <span className="relative flex h-5 w-5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60"></span>
                                <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-[9px] font-black text-white items-center justify-center shadow-sm ring-2 ring-white header-badge-pop">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            </span>
                        </div>
                    )}
                </div>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 8 }}
                        transition={{ type: "spring", stiffness: 600, damping: 40 }}
                        className="fixed inset-x-4 top-20 md:absolute md:inset-auto md:top-full md:right-0 md:mt-3 md:w-[380px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-200/60 z-50 overflow-hidden"
                    >
                        <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-white/80">
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-sm text-slate-900">{t('notifications')}</h3>
                                {alerts.length > 0 && (
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-extrabold shadow-inner">
                                        {alerts.length}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            markAllAsRead();
                                        }}
                                        className="text-[10px] font-bold text-promed-primary hover:text-promed-primary/80 transition-colors flex items-center gap-1 bg-promed-light/50 hover:bg-promed-light px-2 py-1 rounded-lg"
                                    >
                                        <CheckCheck size={12} />
                                        Mark read
                                    </button>
                                )}
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={14} strokeWidth={2.5} />
                                </motion.button>
                            </div>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto overflow-x-hidden nice-scrollbar bg-slate-50/30">
                            {alerts.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center justify-center h-[200px]">
                                    <div className="w-16 h-16 bg-slate-100/80 rounded-[2rem] flex items-center justify-center mb-4 text-slate-300 shadow-inner">
                                        <Megaphone size={28} strokeWidth={1.5} />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-500">{t('no_notifications_yet')}</p>
                                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                                        {t('notifications_caught_up')}
                                    </p>
                                </div>
                            ) : (
                                <div className="p-2 space-y-1">
                                    {alerts.map((alert) => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={alert.id}
                                            onClick={() => {
                                                if (alert.patientId && onPatientSelect) {
                                                    onPatientSelect(alert.patientId);
                                                    setIsOpen(false);
                                                }
                                            }}
                                            className={`relative p-3 rounded-2xl transition-all duration-300 group ${alert.patientId && onPatientSelect ? 'cursor-pointer' : 'cursor-default'
                                                } ${alert.is_active
                                                    ? 'bg-blue-50/50 hover:bg-blue-50/80 border border-blue-100/50 shadow-sm'
                                                    : 'bg-transparent hover:bg-white hover:shadow-sm border border-transparent'
                                                }`}
                                        >
                                            <div className="flex gap-3">
                                                <div className="w-[42px] h-[42px] bg-white rounded-xl flex items-center justify-center flex-shrink-0 self-start transition-transform duration-300 group-hover:scale-105 shadow-sm border border-slate-100 overflow-hidden relative">
                                                    {getIcon(alert)}
                                                    {/* Unread dot indicator on icon */}
                                                    {alert.is_active && (
                                                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full"></span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 py-0.5">
                                                    <div className="flex justify-between items-start gap-3">
                                                        <h4 className={`text-sm tracking-tight mb-0.5 leading-snug truncate ${alert.is_active ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                                                            }`}>
                                                            {alert.title}
                                                        </h4>
                                                        <motion.button
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                dismissNotification(alert.id);
                                                            }}
                                                            className="p-1 hover:bg-slate-200/70 rounded-lg text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 -mr-1"
                                                            title="Dismiss notification"
                                                        >
                                                            <X size={14} strokeWidth={2} />
                                                        </motion.button>
                                                    </div>
                                                    <p className={`text-[13px] leading-relaxed break-words line-clamp-3 pr-2 ${alert.is_active ? 'text-slate-600' : 'text-slate-500'
                                                        }`}>
                                                        {alert.content}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-2.5">
                                                        <Clock size={11} className={alert.is_active ? 'text-blue-400' : 'text-slate-400'} />
                                                        <span className={`text-[10px] font-medium tracking-wide ${alert.is_active ? 'text-blue-500' : 'text-slate-400'
                                                            }`}>
                                                            {getTimeAgo(alert.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
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


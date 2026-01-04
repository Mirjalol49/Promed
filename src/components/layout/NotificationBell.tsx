import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Info, AlertTriangle, ShieldCheck, Megaphone, Clock } from 'lucide-react';
import { useSystemAlert } from '../../contexts/SystemAlertContext';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationBell: React.FC = () => {
    const { alerts, unreadCount, markAllAsRead } = useSystemAlert();
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

    const getIcon = (type: string) => {
        switch (type) {
            case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
            case 'danger': return <ShieldCheck size={16} className="text-rose-500" />;
            case 'success': return <Bell size={16} className="text-emerald-500" />;
            default: return <Info size={16} className="text-promed-primary" />;
        }
    };

    const getTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

        if (diffInMinutes < 1) return 'Hozirgina';
        if (diffInMinutes < 60) return `${diffInMinutes} m avval`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} s avval`;
        return date.toLocaleDateString();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleDropdown}
                className={`relative p-2.5 rounded-xl transition-all duration-300 ${isOpen ? 'bg-promed-light text-promed-primary' : 'text-slate-400 hover:bg-slate-100'
                    }`}
            >
                <Bell size={24} className={unreadCount > 0 ? 'animate-bounce' : ''} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full" />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden"
                    >
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <h3 className="font-black text-xs uppercase tracking-widest text-slate-900">Bildirishnomalar</h3>
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
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Hozircha hech qanday bildirishnoma yo'q</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {alerts.map((alert) => (
                                        <div key={alert.id} className={`p-4 hover:bg-slate-50 transition-colors group cursor-default ${alert.is_active ? 'bg-blue-50/20' : ''}`}>
                                            <div className="flex gap-4">
                                                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 flex-shrink-0 self-start group-hover:scale-110 transition-transform">
                                                    {getIcon(alert.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-sm text-slate-900 mb-0.5 leading-tight">{alert.title}</h4>
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

                        {alerts.length > 0 && (
                            <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tizim yangilanishlari real-vaqtda keladi</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

import React from 'react';
import { Megaphone, X, AlertTriangle, Info, Bell, ShieldCheck } from 'lucide-react';
import { useSystemAlert } from '../contexts/SystemAlertContext';

export const SystemAlertBanner: React.FC = () => {
    const { activeAlert, dismissAlert } = useSystemAlert();

    if (!activeAlert) return null;

    const styles = {
        info: {
            bg: 'bg-blue-600',
            icon: Info,
            light: 'bg-blue-400/20',
            border: 'border-blue-400/30'
        },
        warning: {
            bg: 'bg-amber-500',
            icon: AlertTriangle,
            light: 'bg-amber-400/20',
            border: 'border-amber-400/30'
        },
        danger: {
            bg: 'bg-rose-600',
            icon: ShieldCheck, // Using ShieldCheck for "Security/Danger" alerts
            light: 'bg-rose-400/20',
            border: 'border-rose-400/30'
        },
        success: {
            bg: 'bg-emerald-600',
            icon: Bell,
            light: 'bg-emerald-400/20',
            border: 'border-emerald-400/30'
        }
    }[activeAlert.type || 'info'];

    const Icon = styles.icon;

    return (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-2xl animate-in slide-in-from-top-full duration-500`}>
            <div className={`${styles.bg} text-white p-1 rounded-[24px] shadow-2xl shadow-${activeAlert.type === 'danger' ? 'rose' : 'blue'}-500/20 border ${styles.border} backdrop-blur-md`}>
                <div className="flex items-center gap-4 px-4 py-3">
                    <div className={`p-3 rounded-2xl ${styles.light} flex-shrink-0`}>
                        <Icon size={20} className="text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black uppercase tracking-widest">{activeAlert.title}</h4>
                        <p className="text-xs font-medium text-white/90 truncate">{activeAlert.content}</p>
                    </div>

                    <button
                        onClick={dismissAlert}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors flex-shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

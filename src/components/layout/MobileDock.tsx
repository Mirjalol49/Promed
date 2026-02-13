import React from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    Shield,
    Settings,
    Lock,
    LayoutList,
    StickyNote,
    Briefcase,
    Wallet,
    MessageSquare
} from 'lucide-react';
import { PageView } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccount } from '../../contexts/AccountContext';

interface MobileDockProps {
    currentPage: PageView;
    onNavigate: (page: PageView) => void;
    onLock: () => void;
    isLockEnabled: boolean;
}

export const MobileDock: React.FC<MobileDockProps> = ({ currentPage, onNavigate, onLock, isLockEnabled }) => {
    const { t } = useLanguage();
    const { role } = useAccount();

    const dockItems = [
        { page: 'DASHBOARD' as PageView, icon: LayoutDashboard, label: t('dashboard') },
        { page: 'PATIENTS' as PageView, icon: Users, label: t('patients'), id: 'add-patient-btn-mobile' },
        { page: 'LEADS' as PageView, icon: LayoutList, label: t('leads') },
        { page: 'MESSAGES' as PageView, icon: MessageSquare, label: t('messages') },
        { page: 'NOTES' as PageView, icon: StickyNote, label: t('notes') },
        { page: 'STAFF' as PageView, icon: Briefcase, label: t('staff') },
        { page: 'FINANCE' as PageView, icon: Wallet, label: t('finance') },
        ...(role === 'admin' ? [{ page: 'ADMIN_DASHBOARD' as PageView, icon: Shield, label: t('admin_panel') }] : []),
        { page: 'SETTINGS' as PageView, icon: Settings, label: t('settings') },
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full px-4 max-w-[95%] sm:max-w-[800px] md:hidden pointer-events-none">
            {/* THE CONTAINER: Light Floating Dock */}
            <div className="pointer-events-auto bg-white/90 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-white/60 rounded-[2rem] p-2">
                <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
                    {dockItems.map((item) => {
                        const isActive = currentPage === item.page;

                        return (
                            <button
                                key={item.page}
                                onClick={() => onNavigate(item.page)}
                                className={`
                                    relative flex-1 min-w-[64px] h-[64px] flex flex-col items-center justify-center gap-1.5 transition-all duration-300 outline-none rounded-2xl
                                    ${isActive ? 'bg-blue-50 text-promed-primary ring-1 ring-blue-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'}
                                `}
                            >
                                <item.icon
                                    size={24}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-sm' : 'group-hover:scale-105'}`}
                                />
                                <span className={`text-[10px] font-bold tracking-tight ${isActive ? 'text-promed-primary' : 'text-slate-400'}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}

                    {/* Lock Button */}
                    {isLockEnabled && (
                        <>
                            <div className="w-px h-8 bg-slate-200 mx-1" />
                            <button
                                onClick={onLock}
                                className="relative flex-none w-[64px] h-[64px] flex flex-col items-center justify-center gap-1 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all duration-300"
                            >
                                <Lock size={22} strokeWidth={2} />
                                <span className="text-[9px] font-bold tracking-tight">Lock</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

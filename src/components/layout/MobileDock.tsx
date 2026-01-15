import React from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    Shield,
    Settings,
    Lock,
    LayoutList,
    StickyNote
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
        { page: 'NOTES' as PageView, icon: StickyNote, label: t('notes') },
        ...(role === 'admin' ? [{ page: 'ADMIN_DASHBOARD' as PageView, icon: Shield, label: t('admin_panel') }] : []),
        { page: 'SETTINGS' as PageView, icon: Settings, label: t('settings') },
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden w-full px-4 max-w-[420px]">
            {/* THE CONTAINER: Light Floating Dock */}
            <div className="flex items-center justify-between px-2 py-3 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-white/60 overflow-x-auto no-scrollbar">

                {dockItems.map((item) => {
                    const isActive = currentPage === item.page;

                    return (
                        <button
                            key={item.page}
                            id={item.id}
                            onClick={() => onNavigate(item.page)}
                            className="relative flex flex-col items-center justify-center min-w-[60px] gap-1 outline-none group"
                        >
                            {/* Icon Container with Active Squircle Background */}
                            <div className={`
                                relative p-2.5 rounded-2xl transition-all duration-300
                                ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-transparent text-slate-500 group-hover:bg-slate-100'}
                            `}>
                                {/* Active Indicator Animation */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabMobile"
                                        className="absolute inset-0 bg-blue-600 rounded-2xl z-0"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}

                                {/* Icon Itself */}
                                <div className="relative z-10">
                                    <item.icon
                                        size={22}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={`transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}
                                    />
                                </div>
                            </div>

                            {/* Label */}
                            <span className={`text-[10px] font-bold tracking-tight transition-colors duration-300 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}

                {/* Separator & Lock */}
                {isLockEnabled && (
                    <div className="flex items-center pl-2 ml-1 border-l border-slate-100">
                        <button
                            onClick={onLock}
                            className="flex flex-col items-center justify-center min-w-[48px] gap-1 outline-none group"
                        >
                            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 group-active:scale-95 transition-all">
                                <Lock size={20} className="text-slate-400 group-hover:text-slate-600" />
                            </div>
                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider group-hover:text-slate-400">Lock</span>
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

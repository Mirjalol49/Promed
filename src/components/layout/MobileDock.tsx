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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden w-full px-4 max-w-[400px]">
            {/* THE CONTAINER: Dark Floating Glass Dock */}
            <div className="flex items-center justify-between px-2 py-3 rounded-[2.5rem] bg-black/80 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.25)] ring-1 ring-white/10 overflow-x-auto no-scrollbar">

                {dockItems.map((item) => {
                    const isActive = currentPage === item.page;

                    return (
                        <button
                            key={item.page}
                            id={item.id}
                            onClick={() => onNavigate(item.page)}
                            className="relative flex flex-col items-center justify-center min-w-[64px] gap-1 outline-none group"
                        >
                            {/* Icon Container with Active Squircle Background */}
                            <div className={`
                                relative p-2 rounded-2xl transition-all duration-300
                                ${isActive ? 'bg-blue-500/20' : 'bg-transparent'}
                            `}>
                                {/* Active Indicator Glow (Background) */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-blue-500 rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}

                                {/* Icon Itself */}
                                <div className="relative z-10">
                                    <item.icon
                                        size={24}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={`transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}
                                    />
                                </div>
                            </div>

                            {/* Label */}
                            <span className={`text-[10px] font-medium tracking-wide transition-colors duration-300 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}

                {/* Lock Button (Separated) */}
                {isLockEnabled && (
                    <div className="flex items-center pl-2 ml-2 border-l border-white/10">
                        <button
                            onClick={onLock}
                            className="flex flex-col items-center justify-center min-w-[50px] gap-1 outline-none"
                        >
                            <div className="p-2 rounded-2xl bg-white/5 border border-white/5 active:scale-95 transition-all">
                                <Lock size={20} className="text-slate-400" />
                            </div>
                            <span className="text-[10px] font-medium text-slate-500">Lock</span>
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

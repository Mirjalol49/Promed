import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden w-auto max-w-[95vw]">
            {/* THE CONTAINER: Floating Glass Dock */}
            <div className="flex items-center gap-2 p-2 rounded-[2rem] bg-white/80 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] ring-1 ring-white/50">

                <div className="flex items-center gap-1">
                    {dockItems.map((item) => {
                        const isActive = currentPage === item.page;

                        return (
                            <motion.button
                                key={item.page}
                                id={item.id}
                                onClick={() => onNavigate(item.page)}
                                layout
                                initial={false}
                                className={`relative flex items-center justify-center h-12 rounded-[1.5rem] outline-none transition-colors ${isActive ? 'bg-indigo-600 px-4' : 'w-12 hover:bg-black/5'
                                    }`}
                            >
                                <motion.div
                                    layout
                                    className="flex items-center gap-2"
                                >
                                    {/* ICON */}
                                    <span className={`${isActive ? 'text-white' : 'text-slate-500'}`}>
                                        <item.icon size={22} strokeWidth={2} />
                                    </span>

                                    {/* LABEL (Only visible when active) */}
                                    <AnimatePresence initial={false}>
                                        {isActive && (
                                            <motion.span
                                                initial={{ opacity: 0, width: 0 }}
                                                animate={{ opacity: 1, width: 'auto' }}
                                                exit={{ opacity: 0, width: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="text-[13px] font-semibold text-white whitespace-nowrap overflow-hidden"
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Separator / Lock Button */}
                {isLockEnabled && (
                    <>
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <motion.button
                            onClick={onLock}
                            whileTap={{ scale: 0.9 }}
                            className="w-12 h-12 flex items-center justify-center rounded-[1.5rem] hover:bg-rose-50 border border-transparent hover:border-rose-100"
                        >
                            <Lock size={22} className="text-slate-400" />
                        </motion.button>
                    </>
                )}

            </div>
        </div>
    );
};

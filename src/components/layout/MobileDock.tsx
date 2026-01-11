import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    Shield,
    Settings,
    Lock,
    Plus,
    LayoutList
} from 'lucide-react';
import { PageView } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccount } from '../../contexts/AccountContext';

interface MobileDockProps {
    currentPage: PageView;
    onNavigate: (page: PageView) => void;
    onLock: () => void;
}

export const MobileDock: React.FC<MobileDockProps> = ({ currentPage, onNavigate, onLock }) => {
    const { t } = useLanguage();
    const { role } = useAccount();

    const dockItems = [
        { page: 'DASHBOARD' as PageView, icon: LayoutDashboard, label: t('dashboard') },
        { page: 'PATIENTS' as PageView, icon: Users, label: t('patients'), id: 'add-patient-btn-mobile' },
        { page: 'LEADS' as PageView, icon: LayoutList, label: 'Murojaatlar' },
        ...(role === 'admin' ? [{ page: 'ADMIN_DASHBOARD' as PageView, icon: Shield, label: t('admin_panel') }] : []),
        { page: 'SETTINGS' as PageView, icon: Settings, label: t('settings') },
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden w-[95vw] max-w-md">

            {/* THE CONTAINER: Apple VisionOS Liquid Glass */}
            {/* Shape: Pill | Material: Frosted Glass | Lighting: Top Highlight + Deep Shadow */}
            <div className="flex items-center justify-between px-6 py-3 rounded-full bg-white/70 backdrop-blur-2xl border border-white/20 border-t-white/60 shadow-[0_20px_40px_rgba(0,0,0,0.1)] ring-1 ring-white/40 ring-inset">

                {/* Navigation Items */}
                {dockItems.map((item) => {
                    const isActive = currentPage === item.page;

                    return (
                        <motion.button
                            key={item.page}
                            id={item.id}
                            onClick={() => onNavigate(item.page)}
                            whileTap={{ scale: 0.9 }}
                            className="relative w-12 h-12 flex items-center justify-center rounded-full outline-none"
                        >

                            {/* THE SLIDING "GLASSY PURPLE" LIGHT */}
                            {isActive && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-indigo-500/10 border border-indigo-500/20 rounded-full shadow-[inset_0_0_20px_rgba(99,102,241,0.2)]"
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                />
                            )}

                            {/* THE ICON */}
                            <span className={`relative z-10 transition-all duration-200 ${isActive ? 'text-indigo-600' : 'text-gray-500/80'}`}>
                                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            </span>

                        </motion.button>
                    );
                })}

                {/* Lock Button (Consistent Style) */}
                <motion.button
                    onClick={onLock}
                    whileTap={{ scale: 0.9 }}
                    className="relative w-12 h-12 flex items-center justify-center rounded-full outline-none group hover:bg-white/40 transition-colors"
                >
                    <span className="relative z-10 text-gray-500/80 group-hover:text-rose-500 transition-colors duration-200">
                        <Lock size={24} strokeWidth={2} />
                    </span>
                </motion.button>

            </div>
        </div>
    );
};

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    Shield,
    Settings,
    Lock,
    Plus
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
        ...(role === 'admin' ? [{ page: 'ADMIN_DASHBOARD' as PageView, icon: Shield, label: t('admin_panel') }] : []),
        { page: 'SETTINGS' as PageView, icon: Settings, label: t('settings') },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden w-full">

            {/* THE CONTAINER: Full Width Bottom Bar */}
            <div className="flex items-center justify-between px-8 py-4 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">

                {/* Navigation Items */}
                {dockItems.map((item) => {
                    const isActive = currentPage === item.page;

                    return (
                        <button
                            key={item.page}
                            id={item.id}
                            onClick={() => onNavigate(item.page)}
                            className="relative w-12 h-12 flex items-center justify-center rounded-2xl outline-none"
                        >

                            {/* THE SLIDING PASTEL BACKGROUND */}
                            {isActive && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-indigo-50 rounded-2xl"
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                />
                            )}

                            {/* THE ICON */}
                            <span className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                                <item.icon size={26} strokeWidth={isActive ? 2.5 : 2} />
                            </span>

                        </button>
                    );
                })}

                {/* Lock Button (Consistent Style) */}
                <button
                    onClick={onLock}
                    className="relative w-12 h-12 flex items-center justify-center rounded-2xl outline-none group"
                >
                    <span className="relative z-10 text-gray-400 group-hover:text-rose-500 transition-colors duration-200">
                        <Lock size={26} strokeWidth={2} />
                    </span>
                </button>

            </div>
        </div>
    );
};

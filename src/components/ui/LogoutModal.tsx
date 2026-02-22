import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from './Portal';
import { LogOut, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface LogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { t } = useLanguage();

    return (
        <Portal>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={onClose}
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
                        >
                            <div className="p-8 flex flex-col items-center text-center">
                                {/* Icon */}
                                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6 text-red-500">
                                    <LogOut size={32} />
                                </div>

                                {/* Text */}
                                <h3 className="text-xl font-bold text-slate-900 mb-2">
                                    {t('confirm_logout_title') || 'Log Out?'}
                                </h3>
                                <p className="text-slate-500 mb-8 font-medium leading-relaxed">
                                    {t('confirm_logout_desc') || 'Are you sure you want to sign out?'}
                                </p>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                        onClick={onClose}
                                        className="h-12 flex items-center justify-center rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                                    >
                                        {t('cancel') || 'Cancel'}
                                    </motion.button>
                                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                        onClick={onConfirm}
                                        className="h-12 flex items-center justify-center rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                                    >
                                        {t('logout') || 'Log Out'}
                                    </motion.button>
                                </div>
                            </div>

                            {/* Close Button X */}
                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-500 transition-colors rounded-full hover:bg-slate-50"
                            >
                                <X size={20} />
                            </motion.button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Portal>
    );
};

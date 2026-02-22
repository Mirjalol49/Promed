import { motion } from 'framer-motion';
import React from 'react';
import { LucideIcon, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import { Portal } from './Portal';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    icon: LucideIcon;
    variant?: 'danger' | 'primary' | 'warning';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText,
    cancelText,
    icon: Icon,
    variant = 'primary'
}) => {
    const { t } = useLanguage();

    // Lock scroll when modal is open
    useScrollLock(isOpen);

    if (!isOpen) return null;

    const variants = {
        danger: {
            bar: 'bg-red-500',
            bg: 'bg-red-500/10',
            innerBg: 'bg-red-500/20',
            text: 'text-red-600',
            button: 'bg-red-500 hover:bg-red-600 shadow-red-500/10',
            pulse: 'animate-pulse'
        },
        primary: {
            bar: 'bg-promed-primary',
            bg: 'bg-promed-primary/5',
            innerBg: 'bg-promed-primary/10',
            text: 'text-promed-primary',
            button: 'bg-promed-primary hover:bg-promed-dark shadow-promed-primary/10',
            pulse: ''
        },
        warning: {
            bar: 'bg-amber-500',
            bg: 'bg-amber-50',
            innerBg: 'bg-amber-100',
            text: 'text-amber-600',
            button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200/20',
            pulse: ''
        }
    };

    const style = variants[variant];

    return (
        <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Backdrop with blur */}
                <div
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={onClose}
                />

                {/* Modal Content */}
                <div className="relative bg-white rounded-3xl w-full max-w-sm p-0 shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100 max-h-[85vh] overflow-y-auto flex flex-col">
                    {/* Header Decoration */}
                    <div className={`h-1.5 ${style.bar} w-full`} />

                    <div className="p-8 flex flex-col items-center text-center">
                        {/* Icon Circle */}
                        <div className={`w-20 h-20 ${style.bg} rounded-full flex items-center justify-center mb-6 shadow-inner`}>
                            <div className={`w-14 h-14 ${style.innerBg} rounded-full flex items-center justify-center ${style.text} ${style.pulse}`}>
                                <Icon size={32} />
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                            {title}
                        </h3>

                        <p className="text-slate-500 font-medium leading-relaxed mb-8">
                            {description}
                        </p>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                onClick={onClose}
                                className="btn-premium-white h-12 text-base"
                            >
                                {cancelText || t('cancel')}
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                onClick={onConfirm}
                                className={`h-12 flex items-center justify-center gap-2 transition-all active:scale-[0.98] 
                                    ${variant === 'primary' ? 'btn-premium-blue' :
                                        variant === 'danger' ? 'btn-premium-red' :
                                            'btn-premium-orange'}`}
                            >
                                <Icon size={18} className="relative z-10 opacity-90" />
                                <span>{confirmText || t('confirm')}</span>
                            </motion.button>
                        </div>
                    </div>

                    {/* Close Button */}
                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </motion.button>
                </div>
            </div>
        </Portal>
    );
};

export default ConfirmationModal;

import React from 'react';
import { LucideIcon, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useScrollLock } from '../../hooks/useScrollLock';

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-3xl w-full max-w-md p-8 shadow-premium animate-in zoom-in-95 duration-300 border border-slate-100">
                {/* Header Decoration */}
                <div className={`h-2 ${style.bar} w-full`} />

                <div className="p-8 flex flex-col items-center text-center">
                    {/* Icon Circle */}
                    <div className={`w-20 h-20 ${style.bg} rounded-full flex items-center justify-center mb-6 shadow-inner`}>
                        <div className={`w-14 h-14 ${style.innerBg} rounded-full flex items-center justify-center ${style.text} ${style.pulse}`}>
                            <Icon size={32} />
                        </div>
                    </div>

                    <h3 className="text-2xl font-bold text-slate-800 mb-2">
                        {title}
                    </h3>

                    <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        {description}
                    </p>

                    {/* Actions */}
                    <div className="w-full space-y-3">
                        <button
                            onClick={onConfirm}
                            className={`w-full ${variant === 'primary' ? 'btn-premium-blue !py-4' : `${style.button} py-4 text-white font-bold shadow-sm`} rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center space-x-2`}
                        >
                            <Icon size={20} className="relative z-10" />
                            <span>{confirmText || t('confirm')}</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl transition-all active:scale-[0.98]"
                        >
                            {cancelText || t('cancel')}
                        </button>
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export default ConfirmationModal;

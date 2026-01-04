import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useScrollLock } from '../../hooks/useScrollLock';
import trashIcon from '../../assets/images/trash.png';
import { useLanguage } from '../../contexts/LanguageContext';

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { t } = useLanguage();
    // Lock scroll when modal is open
    useScrollLock(isOpen);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    {/* Backdrop with blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", bounce: 0.4 }}
                        className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden p-8 flex flex-col items-center text-center border border-slate-100"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {/* Delete Icon */}
                        <div className="relative mb-6 pt-4">
                            <img
                                src={trashIcon}
                                alt="Delete"
                                className="w-24 h-24 object-contain drop-shadow-xl"
                            />
                        </div>

                        {/* Translated Copy Content */}
                        <h3 className="text-xl font-bold text-slate-800 mb-3 tracking-tight">
                            {t('delete_modal_headline')}
                        </h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-10 px-2">
                            {t('delete_modal_subtext')}
                        </p>

                        {/* Modern Tactile Buttons */}
                        <div className="w-full space-y-3">
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm"
                            >
                                {t('delete_modal_cancel')}
                            </button>
                            <button
                                onClick={onConfirm}
                                className="w-full py-4 bg-rose-50 text-rose-600 border border-rose-100 font-black rounded-2xl transition-all hover:bg-rose-600 hover:text-white hover:border-rose-600 active:scale-[0.98] shadow-sm shadow-rose-200/20"
                            >
                                {t('delete_modal_confirm')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DeleteModal;

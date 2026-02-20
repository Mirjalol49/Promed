import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useScrollLock } from '../../hooks/useScrollLock';
import Lottie from 'lottie-react';
import deleteAnimation from '../../assets/images/mascots/delete.json';
import { useLanguage } from '../../contexts/LanguageContext';
import { Portal } from './Portal';

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, onClose, onConfirm, title, description }) => {
    const { t } = useLanguage();
    // Lock scroll when modal is open
    useScrollLock(isOpen);

    return (
        <Portal>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        {/* Backdrop with blur */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />

                        {/* Modal Content */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0, transition: { duration: 0.15 } }}
                            transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
                            className="relative bg-white rounded-[32px] shadow-apple w-full max-w-sm overflow-hidden p-6 md:p-8 flex flex-col items-center text-center border border-slate-100 max-h-[85vh] overflow-y-auto"
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>

                            {/* Delete Icon */}
                            <div className="relative mb-4 pt-2 w-24 h-24 md:w-32 md:h-32">
                                <Lottie
                                    animationData={deleteAnimation}
                                    loop={true}
                                    autoplay={true}
                                />
                            </div>

                            {/* Translated Copy Content */}
                            <h3 className="text-lg font-bold text-slate-800 mb-2 tracking-tight px-4">
                                {title || t('delete_modal_headline')}
                            </h3>
                            {description && (
                                <p className="text-slate-500 mb-6 px-4">
                                    {description}
                                </p>
                            )}

                            {/* Modern Tactile Buttons */}
                            <div className="w-full grid grid-cols-2 gap-2">
                                <button
                                    onClick={onClose}
                                    className="h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-700 text-[15px] font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm whitespace-nowrap px-1"
                                >
                                    {t('delete_modal_cancel')}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className="h-12 flex items-center justify-center bg-red-500 text-white text-[15px] font-bold rounded-xl transition-all hover:bg-red-600 active:scale-[0.98] shadow-md shadow-red-500/20 whitespace-nowrap px-1"
                                >
                                    {t('delete_modal_confirm')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Portal>
    );
};

export default DeleteModal;

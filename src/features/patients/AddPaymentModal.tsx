import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Plus, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Patient, TransactionCategory } from '../../types';
import { addTransaction } from '../../lib/financeService';
import { useToast } from '../../contexts/ToastContext';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { CustomDatePicker } from '../../components/ui/CustomDatePicker';
import { Portal } from '../../components/ui/Portal';
import { formatWithSpaces } from '../../lib/formatters';

interface AddPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: Patient;
    accountId: string;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({ isOpen, onClose, patient, accountId }) => {
    const { t } = useLanguage();
    const { success, error: toastError } = useToast();
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState<Date>(new Date());
    const [note, setNote] = useState('');
    const [category, setCategory] = useState<TransactionCategory>('surgery');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // strip spaces from amount
            const rawAmount = amount.replace(/\s/g, '');
            if (!rawAmount || isNaN(Number(rawAmount))) {
                throw new Error("Invalid amount");
            }

            // Get current device time in HH:mm format
            const now = new Date();
            const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            await addTransaction({
                accountId,
                patientId: patient.id,
                amount: parseFloat(rawAmount),
                currency: 'UZS',
                type: 'income',
                category,
                description: note,
                date: date.toISOString().split('T')[0],
                time: time
            });

            success(t('payment_added'), `${formatWithSpaces(rawAmount)} UZS received for ${patient.fullName}`);
            onClose();
            // Reset form
            setAmount('');
            setNote('');
            setCategory('surgery');
            setDate(new Date());
        } catch (err: any) {
            toastError("Error", err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\s/g, '');
        if (val === '' || !isNaN(Number(val))) {
            setAmount(formatWithSpaces(val));
        }
    };

    const categoryOptions = [
        { value: 'surgery', label: t('surgery') },
        { value: 'injection', label: t('injection') },
        { value: 'consultation', label: t('consultation') },
        { value: 'other', label: t('other') }
    ];

    if (!isOpen) return null;

    return (
        <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">{t('add_payment')}</h3>
                            <p className="text-sm text-slate-400 font-bold">{patient.fullName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                        >
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {/* Amount */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('amount')}</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-emerald-600">UZS</div>
                                <input
                                    type="text"
                                    required
                                    value={amount}
                                    onChange={handleAmountChange}
                                    className="w-full pl-16 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 text-xl transition-all"
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Category */}
                            <CustomSelect
                                label={t('category')}
                                options={categoryOptions}
                                value={category}
                                onChange={(val) => setCategory(val as TransactionCategory)}
                            />

                            {/* Date */}
                            <CustomDatePicker
                                label={t('date')}
                                value={date}
                                onChange={setDate}
                            />
                        </div>

                        {/* Note */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('note')}</label>
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-800 min-h-[100px] resize-none transition-all"
                                placeholder={t('add_note_details')}
                            />
                        </div>

                        {/* Submit */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Plus size={20} strokeWidth={3} />
                                        {t('save_payment')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </Portal>
    );
};

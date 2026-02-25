import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, AlignLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccount } from '../../contexts/AccountContext';
import { addTransaction } from '../../lib/financeService';
import { useToast } from '../../contexts/ToastContext';
import { TransactionCategory } from '../../types';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { format } from 'date-fns';

interface AddStaffExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffId: string;
    staffName: string;
}

export const AddStaffExpenseModal: React.FC<AddStaffExpenseModalProps> = ({ isOpen, onClose, staffId, staffName }) => {
    const { t } = useLanguage();
    const { accountId } = useAccount();
    const { success, error: toastError } = useToast();

    const [amount, setAmount] = useState<string>('');
    const [category, setCategory] = useState<TransactionCategory>('food');

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '');
        setAmount(raw);
    };

    const formattedAmount = amount ? Number(amount).toLocaleString('en-US').replace(/,/g, ' ') : '';
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!amount || Number(amount) <= 0) return;
        setLoading(true);
        try {
            const now = new Date();
            const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const dateStr = format(now, 'yyyy-MM-dd');

            await addTransaction({
                accountId,
                amount: Number(amount),
                currency: 'UZS',
                type: 'expense',
                category,
                description: description || t(category) || category,
                date: dateStr,
                time,
                staffId
            });

            success(t('expense') || 'Expense', `${Number(amount).toLocaleString()} UZS - ${category}`);
            onClose();
            setAmount('');
            setDescription('');
        } catch (err: any) {
            toastError("Error", err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center px-2 py-4 sm:p-4 perspective-[2000px]">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                <motion.div initial={{ opacity: 0, y: 100, scale: 0.95, rotateX: 10 }} animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }} exit={{ opacity: 0, y: 100, scale: 0.95, rotateX: -10 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="relative w-full max-w-lg bg-white sm:rounded-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('expense') || 'Xarajat'}</h2>
                                <p className="text-sm font-bold text-rose-500 mt-0.5 tracking-wider uppercase">{staffName}</p>
                            </div>
                            <button onClick={onClose} className="p-2 -mr-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600 self-start">
                                <X size={24} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('amount') || 'Amount'}</label>
                                <div className="relative">
                                    <input type="text" inputMode="numeric" value={formattedAmount} onChange={handleAmountChange} placeholder="0" className="w-full pl-6 pr-16 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-2xl font-black text-slate-800 focus:bg-white focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 transition-all outline-none" />
                                    <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none text-slate-400 font-bold text-base tracking-widest">UZS</div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('category') || 'Category'}</label>
                                <div className="relative group bg-white border border-slate-200 shadow-sm rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all">
                                    <div className="font-bold text-slate-800 text-sm capitalize">{t(category) || category}</div>
                                    <div className="absolute inset-0 opacity-0">
                                        <CustomSelect options={[{ value: 'food', label: t('food') || 'Food/Lunch' }, { value: 'other', label: t('other') || 'Other' }, { value: 'salary', label: t('salary') || 'Salary' }]} value={category} onChange={(v) => setCategory(v as TransactionCategory)} minimal />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('description') || 'Description'}</label>
                                <div className="relative">
                                    <div className="absolute top-4 left-4 pointer-events-none">
                                        <AlignLeft size={20} className="text-slate-400" />
                                    </div>
                                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('add_description') || "Description..."} className="w-full min-h-[100px] pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none resize-none placeholder-slate-400 focus:bg-white focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 transition-all shadow-inner" />
                                </div>
                            </div>

                            <button onClick={handleSubmit} disabled={loading || !amount} className="w-full !py-4 text-base uppercase tracking-wide shadow-lg btn-glossy-red rounded-2xl font-bold text-white bg-rose-500 hover:bg-rose-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? (t('saving') || 'Saving...') : (t('add_transaction') || 'Add Transaction')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

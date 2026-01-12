
import React, { useState } from 'react';
import { X, Save, Instagram, Send, User, Users } from 'lucide-react';
import { Portal } from '../../components/ui/Portal';
import { Lead, LeadStatus, LeadSource } from '../../types';
import { leadService } from '../../services/leadService';
import { useLanguage } from '../../contexts/LanguageContext';

interface AddLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (leadId: string) => void;
    leadToEdit?: Lead | null;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose, onSuccess, leadToEdit }) => {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Lead>>({
        full_name: '',
        phone_number: '',
        source: 'Instagram',
    });

    React.useEffect(() => {
        if (isOpen && leadToEdit) {
            setFormData({
                full_name: leadToEdit.full_name,
                phone_number: leadToEdit.phone_number,
                source: leadToEdit.source,
                graft_estimate: leadToEdit.graft_estimate,
                price_quote: leadToEdit.price_quote,
                currency: leadToEdit.currency || 'USD',
            });
        } else if (isOpen && !leadToEdit) {
            setFormData({
                full_name: '',
                phone_number: '',
                source: 'Instagram',
            });
        }
    }, [isOpen, leadToEdit]);

    const sources: { id: LeadSource; icon: any; label: string }[] = [
        { id: 'Instagram', icon: Instagram, label: 'Instagram' },
        { id: 'Telegram', icon: Send, label: 'Telegram' },
        { id: 'Walk-in', icon: User, label: t('source_walkin') },
        { id: 'Referral', icon: Users, label: t('source_referral') },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submitting form", { leadToEdit, formData });

        // Validation with logging
        if (!formData.full_name || !formData.phone_number) {
            console.error("Validation Failed: Missing fields", formData);
            alert("To'ldirilmagan qatorlar bor!");
            return;
        }

        setIsLoading(true);
        try {
            // Remove undefined fields to prevent Firestore errors
            const cleanData = Object.fromEntries(
                Object.entries(formData).filter(([_, v]) => v !== undefined)
            );

            let id;
            if (leadToEdit) {
                console.log("Updating existing lead:", leadToEdit.id);
                await leadService.updateLead(leadToEdit.id, cleanData);
                id = leadToEdit.id;
            } else {
                console.log("Creating new lead");
                id = await leadService.createLead(cleanData as Omit<Lead, 'id' | 'status' | 'created_at' | 'updated_at'>);
            }
            console.log("Operation successful, ID:", id);
            onSuccess(id);
            onClose();
            // Reset form only if adding a new lead
            if (!leadToEdit) {
                setFormData({
                    full_name: '',
                    phone_number: '',
                    source: 'Instagram',
                });
            }
        } catch (error) {
            console.error("Failed to save lead", error);
            alert("Xatolik yuz berdi: " + (error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Portal>
            <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-900">
                            {leadToEdit ? t('edit_lead') : t('add_new_lead')}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ism Familiya *</label>
                            <input
                                type="text"
                                required
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-400 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                placeholder="Masalan: Mirjalol Shamsiddinov"
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Telefon Raqam *</label>
                            <input
                                type="tel"
                                required
                                value={formData.phone_number}
                                onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-400 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                placeholder="+998 90 123 45 67"
                            />
                        </div>

                        {/* Source */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Manba (Source)</label>
                            <div className="grid grid-cols-2 gap-2">
                                {sources.map(s => {
                                    const Icon = s.icon;
                                    const isSelected = formData.source === s.id;
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, source: s.id })}
                                            className={`
                                                flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-semibold transition-all border
                                                ${isSelected
                                                    ? 'bg-blue-50 text-blue-600 border-blue-500 ring-1 ring-blue-500 shadow-sm'
                                                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400 hover:bg-slate-50'}
                                            `}
                                        >
                                            <Icon size={16} />
                                            <span>{s.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>



                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full btn-premium-blue py-3 shadow-lg shadow-promed-primary/20"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Save size={18} className="relative z-10" />
                                        <span>Saqlash</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Portal>
    );
};

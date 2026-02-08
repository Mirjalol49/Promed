import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccount } from '../../contexts/AccountContext';
import { Staff, StaffRole } from '../../types';
import { subscribeToStaff, addStaff, updateStaff, deleteStaff } from '../../lib/staffService';
import { uploadImage, setOptimisticImage, getOptimisticImage } from '../../lib/imageService'; // Updated import
import { useToast } from '../../contexts/ToastContext';
import {
    Users, Plus, Search, Phone, Mail, DollarSign, Trash2, Edit2,
    MoreVertical, Calendar, Briefcase, User
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// --- Add/Edit Staff Modal ---
const StaffModal = ({
    isOpen,
    onClose,
    onSave,
    initialData
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any, image?: File) => Promise<void>;
    initialData?: Staff | null
}) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<Partial<Staff>>({
        fullName: '',
        role: 'doctor',
        phone: '',
        email: '',
        salary: 0,
        currency: 'USD',
        status: 'active',
        notes: ''
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewId, setPreviewId] = useState<string | null>(null); // Use ID for optimistic preview
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            setPreviewId(null); // Reset local preview
        } else {
            setFormData({
                fullName: '',
                role: 'doctor',
                phone: '',
                email: '',
                salary: 0,
                currency: 'USD',
                status: 'active',
                notes: ''
            });
            setPreviewId(null);
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData, imageFile || undefined);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const roles: StaffRole[] = ['doctor', 'assistant', 'receptionist', 'nurse', 'cleaner', 'admin', 'other'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">
                        {initialData ? t('edit_staff') || 'Edit Staff' : t('add_new_staff') || 'Add New Staff'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Users size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    {/* Image Upload */}
                    <div className="flex flex-col items-center mb-4">
                        <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-blue-500 transition-colors">
                            {(imageFile || initialData?.imageUrl) ? (
                                <img
                                    src={imageFile ? URL.createObjectURL(imageFile) : initialData?.imageUrl}
                                    className="w-full h-full object-cover"
                                    alt="Staff"
                                />
                            ) : (
                                <User className="text-slate-400 w-10 h-10" />
                            )}
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                        setImageFile(e.target.files[0]);
                                        // Generate temporary ID for preview if needed, or just use blob URL directly in img src
                                    }
                                }}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit2 className="text-white w-6 h-6" />
                            </div>
                        </div>
                        <span className="text-xs text-slate-500 mt-2">{t('upload_photo') || 'Upload Photo'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">{t('full_name')}</label>
                            <input
                                required
                                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                value={formData.fullName}
                                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">{t('role') || 'Role'}</label>
                            <select
                                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value as StaffRole })}
                            >
                                {roles.map(r => (
                                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">{t('phone')}</label>
                            <input
                                required
                                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+998..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">{t('salary') || 'Salary'}</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    value={formData.salary}
                                    onChange={e => setFormData({ ...formData, salary: Number(e.target.value) })}
                                />
                                <select
                                    className="w-20 p-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                                    value={formData.currency}
                                    onChange={e => setFormData({ ...formData, currency: e.target.value as any })}
                                >
                                    <option value="USD">USD</option>
                                    <option value="UZS">UZS</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">{t('status') || 'Status'}</label>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                <input type="radio" name="status" value="active" checked={formData.status === 'active'} onChange={() => setFormData({ ...formData, status: 'active' })} className="accent-blue-600" />
                                Active
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                <input type="radio" name="status" value="on_leave" checked={formData.status === 'on_leave'} onChange={() => setFormData({ ...formData, status: 'on_leave' })} className="accent-amber-500" />
                                On Leave
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                <input type="radio" name="status" value="terminated" checked={formData.status === 'terminated'} onChange={() => setFormData({ ...formData, status: 'terminated' })} className="accent-red-500" />
                                Terminated
                            </label>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">{t('notes')}</label>
                        <textarea
                            className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none"
                            rows={3}
                            value={formData.notes || ''}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Additional information..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {initialData ? <Edit2 size={18} /> : <Plus size={18} />}
                                {initialData ? t('update_staff') || 'Update Staff' : t('save_staff') || 'Save Staff'}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};


// --- Main Page ---
export const StaffPage = () => {
    const { t } = useLanguage();
    const { accountId } = useAccount();
    const { success, error: toastError } = useToast();

    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!accountId) return;
        const unsub = subscribeToStaff(accountId, (data) => {
            setStaffList(data);
            setLoading(false);
        });
        return () => unsub();
    }, [accountId]);

    const handleSave = async (data: Partial<Staff>, imageFile?: File) => {
        try {
            let imageUrl = data.imageUrl;

            if (imageFile) {
                // For simplicity, using a generic path or we can organize by staff ID after creation
                // If creating new, we don't have ID yet. Strategy: Upload with temp name or handle after ID creation?
                // Simpler: Just upload with timestamp-random name to 'staff-images' folder
                const path = `staff/${Date.now()}_${imageFile.name}`;
                imageUrl = await uploadImage(imageFile, path);
            }

            if (editingStaff) {
                await updateStaff(editingStaff.id, { ...data, imageUrl });
                success(t('staff_updated_title') || 'Updated', t('staff_updated_msg') || 'Staff member updated successfully');
            } else {
                await addStaff({
                    ...data as any,
                    accountId,
                    imageUrl,
                    joinDate: new Date().toISOString()
                });
                success(t('staff_added_title') || 'Added', t('staff_added_msg') || 'New staff member added');
            }
            setIsModalOpen(false);
            setEditingStaff(null);
        } catch (err: any) {
            toastError(t('error') || 'Error', err.message);
        }
    };

    const handleDelete = async (staff: Staff) => {
        if (window.confirm(t('delete_confirmation') || 'Are you sure you want to delete this staff member?')) {
            try {
                await deleteStaff(staff.id, staff.imageUrl);
                success(t('deleted') || 'Deleted', t('staff_deleted') || 'Staff member removed');
            } catch (err: any) {
                toastError(t('error'), err.message);
            }
        }
    };

    const filteredStaff = staffList.filter(s =>
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('staff_management') || 'Staff Management'}</h1>
                    <p className="text-slate-500 font-medium mt-1">{t('staff_subtitle') || 'Manage your team members and roles'}</p>
                </div>
                <button
                    onClick={() => { setEditingStaff(null); setIsModalOpen(true); }}
                    className="btn-glossy-blue flex items-center gap-2 shadow-blue-500/20 shadow-lg hover:shadow-blue-500/30 transition-all"
                >
                    <Plus size={20} className="stroke-[2.5]" />
                    <span>{t('add_staff') || 'Add Staff'}</span>
                </button>
            </div>

            {/* Stats/Filter Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder={t('search_staff') || "Search by name or role..."}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Active: {staffList.filter(s => s.status === 'active').length}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                        <span>Total: {staffList.length}</span>
                    </div>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="text-center py-20 text-slate-400">Loading staff...</div>
            ) : filteredStaff.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <Users size={32} className="opacity-50" />
                    </div>
                    <p className="text-lg font-medium">No staff members found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence>
                        {filteredStaff.map(staff => (
                            <motion.div
                                key={staff.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                layout
                                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative group"
                            >
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button onClick={() => { setEditingStaff(staff); setIsModalOpen(true); }} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(staff)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="flex flex-col items-center text-center">
                                    <div className="w-20 h-20 rounded-full bg-slate-100 overflow-hidden mb-3 border-2 border-white shadow-sm">
                                        {staff.imageUrl ? (
                                            <img src={staff.imageUrl} alt={staff.fullName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-500 font-bold text-2xl">
                                                {staff.fullName.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-lg">{staff.fullName}</h3>
                                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wide mt-1">
                                        {staff.role}
                                    </span>
                                </div>

                                <div className="mt-5 space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                        <Phone size={16} className="text-slate-400" />
                                        <span>{staff.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                        <DollarSign size={16} className="text-slate-400" />
                                        <span className="font-medium text-slate-900">
                                            {staff.salary.toLocaleString()} <span className="text-xs text-slate-400">{staff.currency}</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                        <div className={`w-2 h-2 rounded-full ${staff.status === 'active' ? 'bg-emerald-500' :
                                                staff.status === 'on_leave' ? 'bg-amber-500' : 'bg-red-500'
                                            }`} />
                                        <span className="capitalize">{staff.status.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Modal */}
            <StaffModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingStaff(null); }}
                onSave={handleSave}
                initialData={editingStaff}
            />
        </div>
    );
};

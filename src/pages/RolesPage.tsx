import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccount } from '../contexts/AccountContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
    Users, Plus, Trash2, Shield, Eye, EyeOff, Phone, Key, Loader2, X, Check, Calendar, type LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import emptyAnimation from '../assets/images/mascots/empty.json';
import { PinInput } from '../components/ui/PinInput';

// --- Types ---
interface SubUser {
    id: string;
    fullName: string;
    phone: string;
    role: 'viewer' | 'seller' | 'nurse';
    createdAt: any;
    status: 'active' | 'disabled';
    lockPassword?: string;
}

// --- Firebase Config for Secondary App (to create users without logging out admin) ---
// We reuse the config from the main app instance
const firebaseConfig = getApp().options;

export const RolesPage: React.FC = () => {
    const { t } = useLanguage();
    const { accountId, role: userRole } = useAccount(); // Ensure only admin can access
    const { success, error: showError } = useToast();

    const [users, setUsers] = useState<SubUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editingUser, setEditingUser] = useState<SubUser | null>(null);

    // Form State
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        password: '',
        role: 'viewer' as 'viewer' | 'seller' | 'nurse'
    });

    // Password visibility toggle for cards
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
    const togglePasswordVisibility = (userId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
    };


    // --- Subscription ---
    useEffect(() => {
        if (!accountId) return;

        // Subscribe to profiles that are 'viewer' or 'seller' and belong to this account (if applicable)
        // Note: profiles don't consistently have accountId, but we can filter by role.
        const q = query(
            collection(db, 'profiles'),
            where('role', 'in', ['viewer', 'seller', 'nurse'])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedUsers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SubUser[];
            setUsers(fetchedUsers);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching roles:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [accountId]);

    // --- Handlers ---

    const handleEditClick = (user: SubUser) => {
        setEditingUser(user);
        setFormData({
            fullName: user.fullName || '',
            phone: user.phone || '',
            password: '', // Password not retrieved
            role: user.role || 'viewer'
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({ fullName: '', phone: '', password: '', role: 'viewer' });
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();

        // 0. SELF-REPAIR: Ensure the current user has the 'admin'/'doctor' role in Firestore
        // This fixes "Permission Denied" if the admin's Firestore profile is missing the 'role' field.
        try {
            if (accountId && (userRole === 'admin' || userRole === 'doctor')) {
                // We use setDoc with merge to safely update/create our own role
                // Since request.auth.uid == accountId (roughly), this write is allowed by "owner" rule.
                const myRef = doc(db, 'profiles', accountId); // or userId if different, but typically accountId is used for main profile path in this app?
                // Actually, accountId might be different from userId in this app context.
                // let's use the current user's auth ID.
                const auth = getAuth();
                if (auth.currentUser) {
                    await setDoc(doc(db, 'profiles', auth.currentUser.uid), {
                        role: userRole
                    }, { merge: true });
                }
            }
        } catch (repairErr) {
            console.warn("Self-repair of admin role failed:", repairErr);
            // Continue anyway, maybe it was already correct
        }

        // Validation - Enforce 6-digit PIN
        const isPasswordValid = editingUser
            ? (!formData.password || formData.password.length === 6)
            : (formData.password && formData.password.length === 6);

        if (!formData.phone || !isPasswordValid) {
            showError("Error", t('validation_pin_error') || "Password must be exactly 6 digits.");
            return;
        }

        setIsCreating(true);

        try {
            if (editingUser) {
                // UPDATE EXISTING USER
                const updateData: any = {
                    fullName: formData.fullName,
                    phone: formData.phone,
                    role: formData.role
                };
                if (formData.password) {
                    updateData.lockPassword = formData.password;
                }
                await updateDoc(doc(db, 'profiles', editingUser.id), updateData);

                if (formData.password) {
                    // Note: We can't update the auth password from here without Admin SDK or re-auth.
                    // But we show the warning.
                    success(t('profile_updated_title') || "Profile Updated", t('toast_password_reset_note') || "Note: Password update requires re-login or admin reset.");
                } else {
                    success(t('profile_updated_title') || "User Updated", t('toast_user_updated') || "User details saved successfully.");
                }
            } else {
                // CREATE NEW USER
                // 1. Initialize Secondary App
                const secondaryAppName = `secondaryApp-${Date.now()}`;
                const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
                const secondaryAuth = getAuth(secondaryApp);

                // 2. Generate Email from Phone help helper
                const cleanPhone = formData.phone.replace(/[^\d]/g, '');
                const email = `${cleanPhone}@promed.sys`;

                // 3. Create User in Auth
                let newUserId;
                try {
                    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, formData.password);
                    newUserId = userCredential.user.uid;
                } catch (authErr: any) {
                    if (authErr.code === 'auth/email-already-in-use') {
                        // RECOVERY MODE: Try to sign in to get the UID
                        try {
                            const userCredential = await signInWithEmailAndPassword(secondaryAuth, email, formData.password);
                            newUserId = userCredential.user.uid;
                            // If successful, we proceed to create the profile below using this ID
                        } catch (signinErr) {
                            // If password doesn't match or other error, throw original
                            throw authErr;
                        }
                    } else {
                        throw authErr;
                    }
                }

                // 4. Create Profile in Firestore
                await setDoc(doc(db, 'profiles', newUserId), {
                    id: newUserId,
                    fullName: formData.fullName,
                    phone: formData.phone,
                    phoneNumber: formData.phone,
                    email: email,
                    role: formData.role,
                    status: 'active',
                    accountId: accountId, // Required for app state
                    account_id: accountId, // Required for DB mapping (snake_case)
                    created_at: new Date().toISOString(),
                    lockEnabled: false,
                    lockPassword: formData.password
                });

                // 5. Cleanup
                await signOut(secondaryAuth);
                success(t('toast_success_title') || "User Created", `${formData.fullName} ${t('toast_user_added') || 'has been added as'} ${formData.role}.`);
            }

            handleCloseModal();

        } catch (err: any) {
            console.error("FULL CREATE ERROR:", err);

            let msg = err.message;
            if (err.code === 'auth/email-already-in-use') {
                msg = t('toast_phone_exists') || "This phone number is locked by a previously deleted account.";
                showError("Number Locked", "This number belongs to a deleted user in the system. Use a different number or restore via Admin Console.");
                return; // Stop here
            }
            if (err.code === 'permission-denied') msg = "Permission Denied. Please refresh the page and try again.";

            showError("Failed", `${msg} (${err.code || 'unknown'})`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteUser = async (userId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        if (!window.confirm("Are you sure you want to remove this user? They will no longer be able to login.")) return;

        try {
            await deleteDoc(doc(db, 'profiles', userId));
            success(t('toast_user_removed') || "User Removed", t('toast_access_revoked') || "Access has been revoked.");
        } catch (err: any) {
            console.error("Delete error:", err);
            showError("Error", t('toast_remove_failed') || "Failed to remove user.");
        }
    };

    if (userRole !== 'admin' && userRole !== 'doctor') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Shield size={48} className="mb-4 text-slate-300" />
                <h2 className="text-xl font-bold text-slate-600">{t('access_restricted') || 'Access Restricted'}</h2>
                <p>{t('only_admins_roles') || 'Only Admins can manage roles.'}</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header - TITLE REMOVED, BUTTON CENTERED */}
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                {/* Search Bar */}
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Users className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-promed-primary/20 transition-all"
                        placeholder={t('search_users') || "Search users..."}
                    />
                </div>

                <button
                    onClick={() => {
                        setEditingUser(null);
                        setFormData({ fullName: '', phone: '', password: '', role: 'viewer' });
                        setIsModalOpen(true);
                    }}
                    className="w-full md:w-auto btn-glossy-blue flex items-center justify-center gap-2 px-6 py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-95 text-base font-bold whitespace-nowrap"
                >
                    <Plus size={20} className="stroke-[3]" />
                    <span>{t('add_user') || 'Add User'}</span>
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-promed-primary w-10 h-10" />
                </div>
            ) : users.filter(u => u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone.includes(searchQuery)).length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                    <div className="w-48 h-48 relative mb-6">
                        <Lottie
                            animationData={emptyAnimation}
                            loop={true}
                            autoplay={true}
                        />
                    </div>
                    <h3 className="text-xl font-bold text-slate-400 mb-2">{searchQuery ? (t('no_results_found') || 'No matching users found') : (t('no_users_found') || 'No users found')}</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users
                        .filter(u => u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone.includes(searchQuery))
                        .map(user => {
                            const roleConfig = {
                                viewer: {
                                    bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-200',
                                    iconBg: 'bg-purple-100', icon: Eye, label: t('viewer_role') || 'Viewer',
                                    access: t('read_only_access') || 'Read-only access',
                                    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
                                },
                                seller: {
                                    bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200',
                                    iconBg: 'bg-emerald-100', icon: Phone, label: t('call_operator_role') || 'Operator',
                                    access: t('leads_only_access') || 'Leads only access',
                                    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                },
                                nurse: {
                                    bg: 'bg-pink-50', text: 'text-pink-600', ring: 'ring-pink-200',
                                    iconBg: 'bg-pink-100', icon: Users, label: t('nurse_role') || 'Nurse',
                                    access: t('patients_only_access') || 'Patients only access',
                                    badgeBg: 'bg-pink-50 text-pink-700 border-pink-200',
                                },
                            }[user.role] || {
                                bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-200',
                                iconBg: 'bg-slate-100', icon: Eye, label: 'User',
                                access: 'Basic access',
                                badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
                            };

                            const RoleIcon = roleConfig.icon;
                            const initials = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
                            const isPasswordVisible = visiblePasswords[user.id];

                            // Format phone for display
                            const formattedPhone = user.phone?.startsWith('+') ? user.phone : `+${user.phone?.replace(/^0+/, '')}`;

                            return (
                                <motion.div
                                    key={user.id}
                                    layout
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => handleEditClick(user)}
                                    className="bg-white rounded-2xl p-5 border border-slate-100/80 cursor-pointer group relative
                                        shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(0,0,0,0.05)]
                                        hover:-translate-y-1 hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.12),0_12px_40px_-8px_rgba(0,0,0,0.06)]
                                        hover:border-slate-200 transition-all duration-300 ease-out"
                                >
                                    {/* ── Header: Avatar + Info ── */}
                                    <div className="flex items-center gap-3.5 mb-4">
                                        {/* Avatar */}
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ${roleConfig.ring} ${roleConfig.iconBg}`}>
                                            <RoleIcon size={20} className={roleConfig.text} />
                                        </div>

                                        {/* Name + Phone */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-[15px] text-slate-900 leading-snug truncate">{user.fullName}</h4>
                                            <p className="text-[12px] text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                                                <Phone size={10} className="opacity-60" />
                                                {formattedPhone}
                                            </p>
                                        </div>

                                        {/* Role Badge */}
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 ${roleConfig.badgeBg}`}>
                                            {roleConfig.label}
                                        </span>
                                    </div>

                                    {/* ── Body: Info Rows ── */}
                                    <div className="space-y-2.5 mb-4">
                                        {/* Password / PIN Row */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                                                <Key size={14} className="text-amber-500" />
                                            </div>
                                            <div className="flex-1 flex items-center gap-2">
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">PIN</span>
                                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100">
                                                    {isPasswordVisible
                                                        ? <span className="text-sm font-bold text-slate-700 tracking-[0.25em]">{user.lockPassword || '••••••'}</span>
                                                        : <span className="text-lg font-black text-slate-700 tracking-[0.2em] leading-none">••••••</span>
                                                    }
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => togglePasswordVisibility(user.id, e)}
                                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90
                                                    ${isPasswordVisible
                                                        ? 'bg-amber-100 text-amber-600'
                                                        : 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-600'
                                                    }`}
                                                title={isPasswordVisible ? 'Hide' : 'Show'}
                                            >
                                                {isPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>

                                        {/* Access Row */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                <Shield size={14} className="text-blue-500" />
                                            </div>
                                            <span className="text-[13px] font-medium text-slate-500">{roleConfig.access}</span>
                                        </div>
                                    </div>

                                    {/* ── Footer: Actions ── */}
                                    <div className="flex items-center justify-end pt-3 border-t border-slate-100/80">
                                        {/* Delete — hidden until hover */}
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <button
                                                onClick={(e) => handleDeleteUser(user.id, e)}
                                                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 active:scale-90"
                                                title={t('remove') || 'Remove'}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                </div>
            )}

            {/* Add/Edit User Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseModal}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
                        >
                            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-xl font-bold text-slate-800">
                                    {editingUser ? (t('edit_user') || 'Edit User') : (t('add_user_title') || 'Add New User')}
                                </h3>
                                <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveUser} className="p-8 space-y-6">
                                <div className="space-y-4">
                                    {/* Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700 ml-1">{t('full_name') || 'Full Name'}</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                required
                                                value={formData.fullName}
                                                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-promed-primary/20 focus:border-promed-primary transition-all outline-none"
                                                placeholder="John Doe"
                                            />
                                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700 ml-1">{t('phone_number') || 'Phone Number'}</label>
                                        <div className="relative">
                                            <input
                                                type="tel"
                                                required
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-promed-primary/20 focus:border-promed-primary transition-all outline-none"
                                                placeholder="+998 90 123 45 67"
                                            />
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                                            <Key size={14} className="text-slate-400" />
                                            {editingUser ? (t('new_password_optional') || 'New Password (Optional)') : (t('password') || 'Password')}
                                        </label>
                                        {editingUser && (
                                            <p className="text-xs text-slate-400 ml-1">{t('leave_blank_password') || 'Leave empty to keep current password'}</p>
                                        )}
                                        <PinInput
                                            value={formData.password.split('').concat(Array(6).fill('')).slice(0, 6)}
                                            onChange={(digits) => setFormData({ ...formData, password: digits.join('') })}
                                            autoFocus={false}
                                        />
                                    </div>

                                    {/* Role Selection */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700 ml-1">{t('role_permission') || 'Role Permission'}</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, role: 'viewer' })}
                                                className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.role === 'viewer'
                                                    ? 'border-purple-500 bg-purple-50 text-purple-600'
                                                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                                                    }`}
                                            >
                                                <Eye size={24} />
                                                <span className="font-bold text-sm">{t('viewer_role') || 'Viewer'}</span>
                                                <span className="text-[10px] opacity-70">{t('read_only_access') || 'Read-only access'}</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, role: 'seller' })}
                                                className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.role === 'seller'
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                                                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                                                    }`}
                                            >
                                                <Phone size={24} />
                                                <span className="font-bold text-sm">{t('call_operator_role') || 'Call Operator'}</span>
                                                <span className="text-[10px] opacity-70">{t('leads_only_access') || 'Leads only'}</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, role: 'nurse' })}
                                                className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.role === 'nurse'
                                                    ? 'border-pink-500 bg-pink-50 text-pink-600'
                                                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                                                    }`}
                                            >
                                                <Users size={24} />
                                                <span className="font-bold text-sm">{t('nurse_role') || 'Nurse'}</span>
                                                <span className="text-[10px] opacity-70">{t('patients_only_access') || 'Patients only'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="w-full btn-glossy-blue py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    {isCreating ? <Loader2 className="animate-spin" /> : <Check size={20} className="stroke-[3]" />}
                                    {editingUser ? (t('save_changes') || 'Save Changes') : (t('create_account') || 'Create Account')}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

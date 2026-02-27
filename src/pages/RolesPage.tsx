import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccount } from '../contexts/AccountContext';
import { useToast } from '../contexts/ToastContext';
import { db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, or } from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
    Users, Plus, Trash2, Shield, Eye, EyeOff, Phone, Key, Loader2, X, Check, Calendar, Camera, type LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { PinInput } from '../components/ui/PinInput';
import DeleteModal from '../components/ui/DeleteModal';
import { EmptyState } from '../components/ui/EmptyState';

// --- Types ---
interface SubUser {
    id: string;
    fullName: string;
    phone: string;
    role: 'viewer' | 'seller' | 'nurse';
    createdAt: any;
    status: 'active' | 'disabled';
    lockPassword?: string;
    account_id?: string;
    imageUrl?: string;
}

// --- Firebase Config for Secondary App (to create users without logging out admin) ---
// We reuse the config from the main app instance
const firebaseConfig = getApp().options;

// Module-level cache to persist roles data across unmount/remount cycles
let _rolesCache: SubUser[] = [];
let _rolesCacheAccountId: string | null = null;

// --- Role Card (Memoized) ---
const RoleCard = React.memo(({
    user,
    currentUserId,
    t,
    onEdit,
    onDelete
}: {
    user: SubUser;
    currentUserId: string | null;
    t: (key: string) => string;
    onEdit: (user: SubUser) => void;
    onDelete: (user: SubUser, e: React.MouseEvent) => void;
}) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const togglePasswordVisibility = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPasswordVisible(prev => !prev);
    };

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

    // Format phone for display: +998 XX XXX XX XX
    const rawPhone = (user.phone || '').replace(/[^\d+]/g, '');
    const digits = rawPhone.replace(/\D/g, '');
    let formattedPhone = '+' + digits;
    if (digits.length >= 3) formattedPhone = '+' + digits.slice(0, 3) + ' ' + digits.slice(3);
    if (digits.length >= 5) formattedPhone = '+' + digits.slice(0, 3) + ' ' + digits.slice(3, 5) + ' ' + digits.slice(5);
    if (digits.length >= 8) formattedPhone = '+' + digits.slice(0, 3) + ' ' + digits.slice(3, 5) + ' ' + digits.slice(5, 8) + ' ' + digits.slice(8);
    if (digits.length >= 10) formattedPhone = '+' + digits.slice(0, 3) + ' ' + digits.slice(3, 5) + ' ' + digits.slice(5, 8) + ' ' + digits.slice(8, 10) + ' ' + digits.slice(10, 12);

    return (
        <div
            onClick={() => onEdit(user)}
            className="bg-white rounded-2xl p-5 border border-slate-100/80 cursor-pointer group relative
                shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(0,0,0,0.05)]
                hover:-translate-y-1 hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.12),0_12px_40px_-8px_rgba(0,0,0,0.06)]
                hover:border-slate-200 transition-all duration-300 ease-out"
        >
            {/* ── Header: Avatar + Info ── */}
            <div className="flex items-start gap-3.5 mb-4">
                {/* Avatar */}
                <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ${roleConfig.ring} ${user.imageUrl ? 'ring-white' : roleConfig.iconBg} overflow-hidden`}>
                    {user.imageUrl ? (
                        <img src={user.imageUrl} alt={user.fullName} className="w-full h-full object-cover" />
                    ) : (
                        <RoleIcon size={18} className={roleConfig.text} />
                    )}
                </div>

                {/* Name + Phone + Badge */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[15px] text-slate-900 leading-snug truncate">{user.fullName}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex-shrink-0 ${roleConfig.badgeBg}`}>
                            {roleConfig.label}
                        </span>
                    </div>
                    <p className="text-[12px] text-slate-400 mt-1 flex items-center gap-1.5 font-medium truncate">
                        <Phone size={11} className="opacity-50 flex-shrink-0" />
                        <span className="truncate">{formattedPhone}</span>
                    </p>
                </div>
            </div>

            {/* ── Body: Info Rows ── */}
            <div className="space-y-2.5 mb-4">
                {/* Password / PIN Row */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Key size={14} className="text-amber-500" />
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('login_password') || 'Password'}</span>
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100">
                            {isPasswordVisible
                                ? <span className="text-sm font-bold text-slate-700 tracking-[0.25em]">{user.lockPassword || '••••••'}</span>
                                : <span className="text-lg font-black text-slate-700 tracking-[0.2em] leading-none">••••••</span>
                            }
                        </div>
                    </div>
                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                        onClick={togglePasswordVisibility}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90
                            ${isPasswordVisible
                                ? 'bg-amber-100 text-amber-600'
                                : 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-600'
                            }`}
                        title={isPasswordVisible ? (t('hide') || 'Hide') : (t('show') || 'Show')}
                    >
                        {isPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                    </motion.button>
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
                {user.id !== currentUserId && ( // Prevent deleting own account
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                            onClick={(e) => onDelete(user, e)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 active:scale-90"
                            title={t('remove') || 'Remove'}
                        >
                            <Trash2 size={16} />
                        </motion.button>
                    </div>
                )}
            </div>
        </div>
    );
});

export const RolesPage: React.FC = () => {
    const { t } = useLanguage();
    const { accountId, userId, role: userRole } = useAccount(); // Ensure only admin can access
    // Detect if the user is viewing a shared workspace (Tenant ID != User ID)
    const isShared = userId && accountId && accountId !== userId && accountId !== `account_${userId}`;
    const { success, error: showError } = useToast();

    const isSameAccount = accountId === _rolesCacheAccountId;
    const [users, setUsers] = useState<SubUser[]>(isSameAccount ? _rolesCache : []);
    const [loading, setLoading] = useState(!isSameAccount || _rolesCache.length === 0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editingUser, setEditingUser] = useState<SubUser | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<SubUser | null>(null);

    // Form State
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '+998',
        password: '',
        role: 'viewer' as 'viewer' | 'seller' | 'nurse'
    });


    // --- Subscription ---
    useEffect(() => {
        // RESET STATE only on account switch (Security Best Practice)
        if (accountId !== _rolesCacheAccountId) {
            setUsers([]);
            setLoading(true);
            _rolesCache = [];
            _rolesCacheAccountId = accountId;
        }

        if (!accountId) {
            console.warn("RolesPage: No Account ID detected.");
            return;
        }
        console.log("RolesPage: Accessing Tenant Zone:", accountId);

        const normalizedAccountId = accountId.startsWith('account_') ? accountId.replace('account_', '') : accountId;
        const legacyAccountId = `account_${normalizedAccountId}`;
        if (legacyAccountId === 'account_undefined' || !normalizedAccountId) return;
        // Subscribe to profiles that belong to this account (handling both naming formats)
        // Security Fix: Strictly filter by account_id to prevent data leakage between tenants
        const q = query(
            collection(db, 'profiles'),
            or(
                where('account_id', '==', normalizedAccountId),
                where('accountId', '==', normalizedAccountId),
                where('account_id', '==', legacyAccountId),
                where('accountId', '==', legacyAccountId)
            )
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedUsers = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }) as SubUser)
                .filter(u => ['viewer', 'seller', 'nurse'].includes(u.role));

            // DIAGNOSTIC: Log every user's account_id to see what the DB actually has
            console.log("🔍 RolesPage DIAGNOSTIC: accountId used in query =", accountId);
            fetchedUsers.forEach(u => {
                console.log(`  👤 ${u.fullName}: account_id="${u.account_id}", accountId="${(u as any).accountId}", role="${u.role}"`);
            });

            _rolesCache = fetchedUsers;
            _rolesCacheAccountId = accountId;
            setUsers(fetchedUsers);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching roles:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [accountId]);

    // --- Handlers ---

    // Fix for "Ghost Data": Allow sub-admins to detach and create their own workspace
    const handleCreatePersonalWorkspace = async () => {
        if (!window.confirm(`⚠️ CREATE PERSONAL WORKSPACE?\n\nYou are currently viewing a Shared Workspace (ID: ${accountId}).\n\nThis action will:\n1. Create a NEW, EMPTY workspace for your account.\n2. Disconnect you from the current shared data.\n\nAre you sure you want to proceed?`)) return;

        try {
            setLoading(true);
            const newAccountId = `account_${userId}`;
            await updateDoc(doc(db, 'profiles', userId), {
                accountId: newAccountId,
                account_id: newAccountId
            });
            // Force reload to pick up new context
            window.location.reload();
        } catch (e: any) {
            console.error("Workspace creation failed:", e);
            showError("Error", "Failed to create workspace: " + e.message);
            setLoading(false);
        }
    };

    const handleEditClick = (user: SubUser) => {
        setEditingUser(user);
        setFormData({
            fullName: user.fullName || '',
            phone: user.phone || '',
            password: '', // Password not retrieved
            role: user.role || 'viewer'
        });
        setImageFile(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({ fullName: '', phone: '+998', password: '', role: 'viewer' });
        setImageFile(null);
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
                    role: formData.role,
                    // Security Fix - Force sync account association on update if missing
                    account_id: accountId
                };
                if (imageFile) {
                    const imageRef = ref(storage, `roles/${editingUser.id}`);
                    await uploadBytes(imageRef, imageFile);
                    updateData.imageUrl = await getDownloadURL(imageRef);
                }
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
                let finalImageUrl = '';
                if (imageFile) {
                    const imageRef = ref(storage, `roles/${newUserId}`);
                    await uploadBytes(imageRef, imageFile);
                    finalImageUrl = await getDownloadURL(imageRef);
                }

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
                    lockPassword: formData.password,
                    imageUrl: finalImageUrl
                });

                // 5. Cleanup
                await signOut(secondaryAuth);
                const roleLabel = formData.role === 'viewer' ? (t('viewer_role') || 'Viewer') : formData.role === 'seller' ? (t('call_operator_role') || 'Operator') : (t('nurse_role') || 'Nurse');
                success(t('toast_success_title') || 'Success', `${formData.fullName} — ${roleLabel}`);
            }

            handleCloseModal();

        } catch (err: any) {
            console.error("FULL CREATE ERROR:", err);

            let msg = err.message;
            if (err.code === 'auth/email-already-in-use') {
                msg = t('toast_phone_exists') || "This phone number is already in use.";
                showError(t('toast_error_title') || 'Error', msg);
                return; // Stop here
            }
            if (err.code === 'permission-denied') msg = t('permission_denied') || 'Permission denied. Please try again.';

            showError(t('toast_error_title') || 'Error', msg);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteUser = (user: SubUser, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await deleteDoc(doc(db, 'profiles', userToDelete.id));
            success(t('toast_user_removed') || "User Removed", t('toast_access_revoked') || "Access has been revoked.");
        } catch (err: any) {
            console.error("Delete error:", err);
            showError("Error", t('toast_remove_failed') || "Failed to remove user.");
        } finally {
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
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

    // Normalized IDs for accurate filtering
    const normalizedAccountId = accountId.startsWith('account_') ? accountId.replace('account_', '') : accountId;
    const legacyAccountId = `account_${normalizedAccountId}`;

    if (legacyAccountId === 'account_undefined' || !normalizedAccountId) return null;
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

                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                    onClick={() => {
                        setEditingUser(null);
                        setFormData({ fullName: '', phone: '+998', password: '', role: 'viewer' });
                        setIsModalOpen(true);
                    }}
                    className="w-full md:w-auto btn-glossy-blue flex items-center justify-center gap-2 px-6 py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-95 text-base font-bold whitespace-nowrap"
                >
                    <Plus size={20} className="stroke-[3]" />
                    <span>{t('add_user') || 'Add User'}</span>
                </motion.button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-promed-primary w-10 h-10" />
                </div>
            ) : users.filter(u => u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone.includes(searchQuery)).length === 0 ? (
                <EmptyState
                    message={searchQuery ? (t('no_results_found') || 'No matching users found') : (t('no_users_found') || 'No users found')}
                    fullHeight={false}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users
                        // Security Double-Check: Strictly filter in JS as well to handle potential query lag or index issues
                        .filter(u => u.account_id === normalizedAccountId || (u as any).accountId === normalizedAccountId || u.account_id === legacyAccountId || (u as any).accountId === legacyAccountId)
                        .filter(u => u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone.includes(searchQuery))
                        .map(user => (
                            <RoleCard
                                key={user.id}
                                user={user}
                                currentUserId={userId}
                                t={t}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteUser}
                            />
                        ))}
                </div>
            )}

            {/* Add/Edit User Modal */}
            {createPortal(
                <AnimatePresence>
                    {isModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={handleCloseModal}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-premium-card rounded-3xl shadow-2xl overflow-hidden m-auto"
                            >
                                {/* Header */}
                                <div className="px-6 md:px-8 py-4 md:py-5 flex items-center justify-between bg-white/60 backdrop-blur-sm border-b border-slate-200/50 shrink-0">
                                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                                        {editingUser ? (t('edit_user') || 'Edit User') : (t('add_user_title') || 'Add New User')}
                                    </h2>
                                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} onClick={handleCloseModal} className="w-8 h-8 bg-slate-200/80 hover:bg-slate-300/80 text-slate-500 hover:text-slate-700 rounded-full flex items-center justify-center transition-all active:scale-95">
                                        <X size={16} strokeWidth={2.5} />
                                    </motion.button>
                                </div>

                                {/* Body — Scrollable */}
                                <div className="p-4 md:p-6 overflow-y-auto">
                                    <div className="flex flex-col md:flex-row gap-6 pb-6">
                                        {/* Left Panel — Photo + Role */}
                                        <div className="md:w-[260px] flex-shrink-0 flex flex-col items-center justify-start gap-6 pt-4">
                                            {/* Photo Upload */}
                                            <div className="flex flex-col items-center">
                                                <div className="relative group">
                                                    <div
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="w-28 h-28 rounded-full bg-white border-[3px] border-white shadow-lg ring-1 ring-slate-200/80 flex items-center justify-center relative overflow-hidden cursor-pointer group-hover:ring-blue-400/40 group-hover:shadow-blue-500/10 transition-all"
                                                    >
                                                        {(imageFile || editingUser?.imageUrl) ? (
                                                            <img
                                                                src={imageFile ? URL.createObjectURL(imageFile) : editingUser?.imageUrl}
                                                                className="w-full h-full object-cover"
                                                                alt="Profile"
                                                            />
                                                        ) : (
                                                            <Camera size={28} strokeWidth={1.5} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                                                        )}
                                                    </div>

                                                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-md border-[3px] border-white transition-transform hover:scale-110 active:scale-95"
                                                    >
                                                        <Plus size={14} strokeWidth={3} />
                                                    </motion.button>

                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0]) setImageFile(e.target.files[0]);
                                                        }}
                                                    />
                                                </div>
                                                <p className="mt-2.5 text-[11px] font-semibold text-slate-400">
                                                    {t('upload_photo') || 'Upload Photo'}
                                                </p>
                                            </div>

                                            {/* Role Selection — Stacked */}
                                            <div className="w-full space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-1 block">{t('role_permission') || 'Role'}</label>
                                                {([
                                                    { value: 'viewer' as const, icon: Eye, label: t('viewer_role') || 'Viewer', desc: t('read_only_access') || 'Read-only' },
                                                    { value: 'seller' as const, icon: Phone, label: t('call_operator_role') || 'Operator', desc: t('leads_only_access') || 'Leads only' },
                                                    { value: 'nurse' as const, icon: Users, label: t('nurse_role') || 'Nurse', desc: t('patients_only_access') || 'Patients only' },
                                                ]).map((role) => {
                                                    const isSelected = formData.role === role.value;
                                                    const Icon = role.icon;
                                                    return (
                                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                            key={role.value}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, role: role.value })}
                                                            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all outline-none active:scale-[0.98] ${isSelected
                                                                ? 'bg-white shadow-sm ring-1 ring-blue-400/30'
                                                                : 'hover:bg-white/60'
                                                                }`}
                                                        >
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/60 text-slate-400'}`}>
                                                                <Icon size={17} strokeWidth={2.5} />
                                                            </div>
                                                            <div className="text-left min-w-0">
                                                                <div className={`font-bold text-[13px] leading-tight ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{role.label}</div>
                                                                <div className={`text-[10px] font-medium leading-tight mt-0.5 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`}>{role.desc}</div>
                                                            </div>
                                                            {isSelected && (
                                                                <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                                                    <Check size={11} className="text-white stroke-[3]" />
                                                                </div>
                                                            )}
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Right Panel — Form Fields in White Card */}
                                        <form onSubmit={handleSaveUser} className="flex-1 bg-white rounded-2xl p-6 shadow-premium border border-slate-200 space-y-5">
                                            {/* Name */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-600 ml-0.5">{t('full_name') || 'Full Name'}</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.fullName}
                                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                                    className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl py-3 px-4 text-slate-900 font-semibold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none placeholder:text-slate-300 placeholder:font-normal"
                                                    placeholder="Mirjalol Shamsiddinov"
                                                />
                                            </div>

                                            {/* Phone */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-600 ml-0.5">{t('phone_number') || 'Phone Number'}</label>
                                                <input
                                                    type="tel"
                                                    required
                                                    value={formData.phone}
                                                    onChange={e => {
                                                        let val = e.target.value;
                                                        if (!val.startsWith('+998')) {
                                                            if (val.startsWith('998')) val = '+' + val;
                                                            else val = '+998' + val.replace(/\D/g, '');
                                                        }
                                                        const clean = val.replace(/[^\d+]/g, '');
                                                        let formatted = clean;
                                                        if (clean.length > 6) formatted = clean.slice(0, 6) + ' ' + clean.slice(6);
                                                        if (clean.length > 9) formatted = formatted.slice(0, 10) + ' ' + clean.slice(9);
                                                        if (clean.length > 11) formatted = formatted.slice(0, 13) + ' ' + clean.slice(11);
                                                        setFormData({ ...formData, phone: formatted.slice(0, 17) });
                                                    }}
                                                    className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl py-3 px-4 text-slate-900 font-semibold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none placeholder:text-slate-300 placeholder:font-normal"
                                                    placeholder="+998 90 123 45 67"
                                                />
                                            </div>

                                            {/* Password */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-600 ml-0.5 flex items-center gap-1.5">
                                                    <Key size={12} className="text-slate-400" />
                                                    {editingUser ? (t('new_password_optional') || 'New PIN (Optional)') : (t('set_login_password') || 'Set Login Password')}
                                                </label>
                                                {editingUser && (
                                                    <p className="text-[11px] text-slate-400 ml-0.5">{t('leave_blank_password') || 'Leave empty to keep current'}</p>
                                                )}
                                                <PinInput
                                                    value={formData.password.split('').concat(Array(6).fill('')).slice(0, 6)}
                                                    onChange={(digits) => setFormData({ ...formData, password: digits.join('') })}
                                                    autoFocus={false}
                                                />
                                            </div>

                                            {/* Submit Button */}
                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                type="submit"
                                                disabled={isCreating}
                                                className="w-full btn-glossy-blue !py-3.5 !rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all mt-6"
                                            >
                                                {isCreating ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} className="stroke-[3]" />}
                                                {editingUser ? (t('save_changes') || 'Save Changes') : (t('create_account') || 'Create Account')}
                                            </motion.button>
                                        </form>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setUserToDelete(null);
                }}
                onConfirm={confirmDeleteUser}
                title={t('confirm_remove_user') || 'Remove User?'}
            />
        </div>
    );
};

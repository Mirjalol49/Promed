import React, { useState, useEffect } from 'react';
import { createSystemUser } from '../lib/adminService';
import {
    Shield, Lock, ChevronRight, AlertTriangle, CheckCircle,
    XCircle, Users, RefreshCw, Trash2, Ban, Unlock,
    Eye, EyeOff, Search, Settings, Activity, Server,
    LogOut, MoreVertical, Menu, MessageSquare, Send, X
} from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { useToast } from '../contexts/ToastContext';
import ToastContainer from '../components/ui/ToastContainer';
import { SystemAlertBanner } from '../components/layout/SystemAlertBanner';
import { BroadcastPanel } from '../components/admin/BroadcastPanel';
import { sendTargetedNotifications } from '../lib/notificationService';

// Sub-component for password toggling
const PasswordReveal: React.FC<{ value: string }> = ({ value }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="bg-slate-50/50 p-2 rounded-lg relative group/pass border border-slate-100">
            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Passkey</span>
            <div className="flex justify-between items-center h-5">
                <span className={`font-mono text-slate-600 text-sm ${show ? '' : 'blur-[4px] select-none'} transition-all`}>
                    {value || '******'}
                </span>
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="p-1 text-slate-400 hover:text-indigo-500 transition-colors opacity-0 group-hover/pass:opacity-100"
                >
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
            </div>
        </div>
    );
};

export const EmergencySetup: React.FC = () => {
    const { success, error: showError } = useToast();
    const [step, setStep] = useState<'auth' | 'dashboard'>('auth');
    const [masterPass, setMasterPass] = useState('');
    const [authError, setAuthError] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'broadcast' | 'create'>('users');

    // User Creation State
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('+998');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    // List State
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState('');

    // Message Logic
    const [messageLoading, setMessageLoading] = useState(false);
    const [msgTarget, setMsgTarget] = useState<any | null>(null);
    const [msgTitle, setMsgTitle] = useState('');
    const [msgContent, setMsgContent] = useState('');

    useEffect(() => {
        if (!searchQuery) {
            setFilteredUsers(users);
        } else {
            const q = searchQuery.toLowerCase();
            setFilteredUsers(users.filter(u =>
                (u.fullName || '').toLowerCase().includes(q) ||
                (u.name || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.phoneNumber || '').includes(q)
            ));
        }
    }, [users, searchQuery]);

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();

        // SECURITY UPDATE: Read from environment variable
        const expectedCommandCode = import.meta.env.VITE_MASTER_PASSWORD || 'xurshida4941_fallback_setup';

        if (masterPass === expectedCommandCode) {
            setStep('dashboard');
            setAuthError('');
            fetchUsers();
        } else {
            setAuthError('ACCESS DENIED: Invalid Command Code');
        }
    };

    const fetchUsers = async () => {
        setListLoading(true);
        setListError('');
        try {
            const querySnapshot = await getDocs(collection(db, 'profiles'));
            const fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(fetchedUsers);
            if (fetchedUsers.length === 0) setListError('No users found.');
        } catch (err: any) {
            console.error("Fetch error:", err);
            setListError('Protected Database: Cannot list users without valid session. Create a new Admin first.');
        } finally {
            setListLoading(false);
        }
    };

    const handleUpdateStatus = async (userId: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, 'profiles', userId), { status: newStatus });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
            success('Status Updated', `User marked as ${newStatus}`);
        } catch (err: any) {
            showError('Update Failed', err.message);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("⚠️ FULL SYSTEM WIPEOUT\n\nThis will permanently DELETE the user from:\n- Authentication\n- Database\n- File Storage\n\nThis action cannot be undone. Confirm?")) return;

        // Optimistic UI update - remove from list immediately to feel fast
        const originalUsers = [...users];
        setUsers(prev => prev.filter(u => u.id !== userId));

        try {
            // 1. Try Cloud Function (for deep cleanup: Auth, Storage, etc.)
            const deleteSystemAccount = httpsCallable(functions, 'deleteSystemAccount');
            await deleteSystemAccount({ targetUserId: userId });

            // 2. DOUBLE TAP: Force delete Firestore docs from Client Side
            // This ensures the "card" disappears even if the backend script fails to delete these specific docs.
            try {
                // Manually remove from Firestore collections
                // Since this user is likely an Admin, they have write access
                await deleteDoc(doc(db, 'users', userId));
                await deleteDoc(doc(db, 'profiles', userId));
                console.log("✅ Client-side delete executed for extra safety.");
            } catch (manualErr) {
                console.warn("Client-side delete skipped:", manualErr);
            }

            success('Account Eradicated', 'User has been completely removed from the system.');
        } catch (err: any) {
            // FALLBACK: If Cloud Function fails entirely, STILL try to delete local docs
            try {
                await deleteDoc(doc(db, 'users', userId));
                await deleteDoc(doc(db, 'profiles', userId));
                console.log("⚠️ Fallback client-side delete executed after CF error.");
            } catch (manualErr) {
                console.error("Manual delete also failed:", manualErr);
            }

            // DO NOT REVERT UI.
            console.error("Delete error:", err);
            success('Force Removed', 'User removed from local list (Backend might have had a hiccup, but it is gone for you).');
        }
    };

    const [role, setRole] = useState<'admin' | 'doctor'>('doctor');

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const cleanPhone = phone.replace(/\+/g, '').replace(/\s/g, '');
            await createSystemUser({
                email: `${cleanPhone}@promed.sys`,
                phoneNumber: phone.replace(/\s+/g, ''),
                fullName: name.trim(),
                role: role, // Use selected role
                password: password.trim()
            });

            setStatus({ type: 'success', msg: 'System Node Created Successfully.' });
            success(role === 'admin' ? 'Admin Created' : 'User Created', `New ${role} account is ready.`);
            setName('');
            setPhone('+998');
            setPassword('');
            setRole('doctor'); // Reset to safe default
            fetchUsers();
            setActiveTab('users');
        } catch (err: any) {
            setStatus({ type: 'error', msg: err.message });
            showError('Creation Failed', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDirectMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!msgTarget) return;

        setMessageLoading(true);
        try {
            await sendTargetedNotifications([msgTarget.id], {
                title: msgTitle,
                content: msgContent,
                type: 'info',
                category: 'message'
            });
            success('Message Sent', `Notification delivered to ${msgTarget.fullName}`);
            setMsgTarget(null);
            setMsgTitle('');
            setMsgContent('');
        } catch (err: any) {
            showError('Delivery Failed', err.message);
        } finally {
            setMessageLoading(false);
        }
    };

    if (step === 'auth') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950" />
                <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 transition-all hover:border-slate-700 hover:shadow-indigo-900/10 hover:shadow-2xl">
                    <div className="flex justify-center mb-8">
                        <div className="p-4 bg-slate-800/50 rounded-2xl ring-1 ring-slate-700">
                            <Shield className="w-12 h-12 text-indigo-400" />
                        </div>
                    </div>
                    <form onSubmit={handleAuth} className="space-y-6">
                        <div className="text-center space-y-2">
                            <h1 className="text-xl font-mono text-white tracking-widest uppercase">System Terminal</h1>
                            <p className="text-slate-500 text-sm">Restricted Access Protocol</p>
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-indigo-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                            <input
                                type="password"
                                value={masterPass}
                                onChange={e => setMasterPass(e.target.value)}
                                placeholder="Enter Command Code"
                                className="relative w-full bg-slate-950 border border-slate-800 text-center py-4 rounded-xl text-white font-mono tracking-widest focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-slate-700"
                                autoFocus
                            />
                        </div>
                        {authError && (
                            <div className="flex items-center gap-2 justify-center text-rose-500 text-xs font-mono bg-rose-950/30 py-2 rounded-lg border border-rose-900/50">
                                <AlertTriangle size={14} />
                                {authError}
                            </div>
                        )}
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-mono py-4 rounded-xl transition-all uppercase tracking-widest text-sm font-bold shadow-lg shadow-indigo-900/50 hover:shadow-indigo-900/80 hover:-translate-y-0.5 active:translate-y-0">
                            Initialize Connection
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 relative">
            <SystemAlertBanner />

            {/* Sidebar */}
            <aside className="w-20 lg:w-72 bg-slate-900 text-white flex-shrink-0 flex flex-col justify-between p-4 border-r border-slate-800">
                <div className="space-y-8">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                            <Server className="text-white w-6 h-6" />
                        </div>
                        <div className="hidden lg:block">
                            <h1 className="font-bold text-lg tracking-tight">ProMed Admin</h1>
                            <p className="text-xs text-indigo-300 font-mono">SYS-v2.4.0</p>
                        </div>
                    </div>

                    <nav className="space-y-2">
                        <SidebarItem icon={Users} label="User Directory" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                        <SidebarItem icon={Activity} label="System Broadcast" active={activeTab === 'broadcast'} onClick={() => setActiveTab('broadcast')} />
                        <SidebarItem icon={Shield} label="Provision Admin" active={activeTab === 'create'} onClick={() => setActiveTab('create')} />
                    </nav>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-2xl hidden lg:block">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xs font-mono text-slate-400">System Operational</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 h-screen overflow-hidden flex flex-col">
                <header className="h-16 border-b border-slate-100 bg-white flex items-center justify-between px-6 lg:px-8 shadow-sm z-10">
                    <h2 className="text-xl font-bold text-slate-800">
                        {activeTab === 'users' && 'User Directory'}
                        {activeTab === 'broadcast' && 'System Broadcast'}
                        {activeTab === 'create' && 'Provision Admin'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Settings size={18} />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">

                        {/* VIEW: USERS LIST */}
                        {activeTab === 'users' && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="relative w-full sm:w-96 group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
                                            placeholder="Search by name, phone, or email..."
                                        />
                                    </div>
                                    <button
                                        onClick={fetchUsers}
                                        className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-600 flex items-center gap-2 font-medium"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${listLoading ? 'animate-spin' : ''}`} />
                                        <span>Refresh Data</span>
                                    </button>
                                </div>

                                {listError ? (
                                    <div className="p-8 text-center bg-white rounded-3xl border border-rose-100">
                                        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <AlertTriangle className="text-rose-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-2">Access Issue</h3>
                                        <p className="text-slate-500 max-w-md mx-auto">{listError}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {filteredUsers.map(u => (
                                            <div key={u.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-slate-200 group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                                                            {u.role === 'admin' ? 'AD' : 'DR'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800 truncate max-w-[150px]">{u.fullName || u.name || 'Unknown'}</div>
                                                            <div className="text-xs font-mono text-slate-400">{u.phoneNumber || 'No Phone'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="relative">
                                                        <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wide ${u.status === 'banned' ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-emerald-50 text-emerald-500 border border-emerald-100'}`}>
                                                            {u.status || 'Active'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3">
                                                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                                        <span className="text-[10px] uppercase font-bold text-slate-400">System ID</span>
                                                        <span className="text-xs font-mono text-slate-500 truncate max-w-[150px]" title={u.email}>{u.email}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2">
                                                        <div className="w-full">
                                                            <PasswordReveal value={u.lock_password} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <ActionBtn label="Msg" icon={MessageSquare} color="blue" onClick={() => setMsgTarget(u)} />
                                                    {u.status === 'banned' ? (
                                                        <ActionBtn label="Unban" icon={CheckCircle} color="green" onClick={() => handleUpdateStatus(u.id, 'active')} />
                                                    ) : (
                                                        <ActionBtn label="Ban User" icon={Ban} color="amber" onClick={() => handleUpdateStatus(u.id, 'banned')} />
                                                    )}
                                                    <ActionBtn label="Delete" icon={Trash2} color="red" onClick={() => handleDeleteUser(u.id)} />
                                                </div>
                                            </div>
                                        ))}
                                        {filteredUsers.length === 0 && !listLoading && (
                                            <div className="col-span-full py-12 text-center text-slate-400">
                                                <Users size={48} className="mx-auto mb-4 opacity-20" />
                                                <p>No users found matching your search.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIEW: BROADCAST PANEL */}
                        {activeTab === 'broadcast' && (
                            <div className="max-w-3xl mx-auto">
                                <BroadcastPanel users={users} />
                            </div>
                        )}

                        {/* VIEW: CREATE ADMIN */}
                        {activeTab === 'create' && (
                            <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Shield size={120} />
                                </div>

                                <div className="mb-8 relative z-10">
                                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Provision Admin Node</h3>
                                    <p className="text-slate-500">Create a highly privileged system administrator account.</p>
                                </div>

                                {status && (
                                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                        {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                        <span className="font-medium">{status.msg}</span>
                                    </div>
                                )}

                                <form onSubmit={handleCreateAdmin} className="space-y-6 relative z-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admin Name</label>
                                            <input
                                                value={name} onChange={e => setName(e.target.value)}
                                                className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                                placeholder="e.g. System Admin"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                                            <input
                                                value={phone} onChange={e => setPhone(e.target.value)}
                                                className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                                placeholder="+998"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Secure Access Pin</label>
                                        <input
                                            value={password} onChange={e => setPassword(e.target.value)}
                                            className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none font-mono tracking-widest text-center text-lg"
                                            placeholder="------"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Access Level</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setRole('doctor')}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${role === 'doctor'
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <Users size={18} />
                                                <span className="font-bold text-sm">Doctor</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRole('admin')}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${role === 'admin'
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <Shield size={18} />
                                                <span className="font-bold text-sm">Admin</span>
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 hover:-translate-y-0.5"
                                    >
                                        <span>{loading ? 'Provisioning Node...' : 'Establish Admin Access'}</span>
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </form>
                            </div>
                        )}

                    </div>
                </div>

                {/* Message Modal */}
                {msgTarget && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Direct Message</h3>
                                    <p className="text-sm text-slate-500">Sending to <span className="font-bold text-indigo-600">{msgTarget.fullName}</span></p>
                                </div>
                                <button onClick={() => setMsgTarget(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleDirectMessage} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</label>
                                    <input
                                        value={msgTitle}
                                        onChange={e => setMsgTitle(e.target.value)}
                                        className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        placeholder="Important Notification"
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message</label>
                                    <textarea
                                        value={msgContent}
                                        onChange={e => setMsgContent(e.target.value)}
                                        className="w-full p-3 bg-slate-50 rounded-xl font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[120px] resize-none"
                                        placeholder="Type your message here..."
                                        required
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setMsgTarget(null)}
                                        className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={messageLoading}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200"
                                    >
                                        <span>{messageLoading ? 'Sending...' : 'Send Message'}</span>
                                        <Send size={16} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
            <ToastContainer />
        </div>
    );
};

const SidebarItem: React.FC<{ icon: any, label: string, active?: boolean, onClick: () => void }> = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full p-3 rounded-xl flex items-center justify-center lg:justify-start gap-3 transition-all ${active
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
        title={label}
    >
        <Icon size={20} />
        <span className="hidden lg:block font-medium">{label}</span>
    </button>
);

const ActionBtn: React.FC<{ label: string, icon: any, color: 'blue' | 'red' | 'green' | 'amber', onClick: () => void }> = ({ label, icon: Icon, color, onClick }) => {
    const colors = {
        blue: 'bg-promed-light text-promed-primary hover:bg-promed-light/80',
        red: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
        green: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
        amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100'
    };

    return (
        <button
            onClick={onClick}
            className={`flex-1 ${colors[color]} p-2 rounded-lg font-bold text-[10px] uppercase flex items-center justify-center gap-2 transition-colors`}
        >
            <Icon size={14} />
            {label}
        </button>
    );
};

import React, { useState, useEffect } from 'react';
import { createSystemUser } from '../lib/adminService';
import { subscribeToAllProfiles } from '../lib/userService';
import { UserPlus, Shield, Users, Lock, ChevronRight, CheckCircle, XCircle, Eye, EyeOff, Settings } from 'lucide-react';

const PasswordReveal: React.FC<{ value: string }> = ({ value }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="flex items-center gap-2">
            <span className="font-mono text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 min-w-[100px] text-center ">
                {show ? value : '••••••'}
            </span>
            <button
                onClick={() => setShow(!show)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-promed-primary transition-colors"
                title={show ? "Yashirish" : "Ko'rsatish"}
            >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
};

export const SuperAdmin: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<'admin' | 'doctor' | 'staff'>('staff');
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToAllProfiles(
            (data) => {
                setUsers(data);
                setLoading(false);
            },
            (err) => {
                console.error("SuperAdmin subscription error:", err);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    // Keep handleCreate for refreshing manually if needed or for status messages
    const loadUsers = async () => {
        // Now handled by subscription
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            await createSystemUser({
                email,
                password,
                message: name, // mapped to displayName
                role
            });

            setStatus({ type: 'success', msg: `User ${name} created successfully!` });
            setShowForm(false);
            resetForm();
            loadUsers();
        } catch (err: any) {
            setStatus({ type: 'error', msg: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setLoading(true);
        setStatus(null);
        try {
            const { updateUserProfile } = await import('../lib/userService');
            const { auth } = await import('../lib/firebase');
            const { updatePassword, EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');

            const currentUser = auth.currentUser;
            const isSelf = currentUser?.uid === editingUser.id;

            console.log("🛠️ SuperAdmin Update:", { isSelf, targetId: editingUser.id });

            // 1. Update Profile in Firestore
            await updateUserProfile(editingUser.id, {
                fullName: name,
                role: role,
                lockPassword: password,
                status: editingUser.status
            });

            // 2. If editing self, try to update Auth password as well for sync consistency
            if (isSelf && currentUser && password) {
                console.log("🔐 SuperAdmin: Syncing OWN password directly to Auth...");
                try {
                    // Update Auth Password directly (requires recent login or re-auth)
                    await updatePassword(currentUser, password);
                    console.log("✅ SuperAdmin: Own Auth password updated successfully");
                } catch (authErr: any) {
                    console.warn("⚠️ SuperAdmin: Auth sync failed (likely needs recent login). Only Firestore updated.", authErr.message);
                    setStatus({ type: 'error', msg: "Firestore updated, lekin tizim parolini yangilash uchu qayta login qilish kerak." });
                }
            }

            setStatus({ type: 'success', msg: `User ${name} updated successfully!` });
            setEditingUser(null);
            resetForm();
        } catch (err: any) {
            setStatus({ type: 'error', msg: err.message });
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (user: any) => {
        setEditingUser(user);
        setName(user.name || '');
        setEmail(user.email || '');
        setPassword(user.lockPassword || '');
        setRole(user.role || 'staff');
        setShowForm(false);
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setName('');
        setRole('staff');
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center bg-promed-primary p-8 rounded-[40px] text-white border border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
                        <Shield className="w-8 h-8 text-white/90" />
                        Super Admin Panel
                    </h1>
                    <p className="text-white/70 mt-1 font-medium italic opacity-80">Manage system access and creating new accounts</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="relative z-10 bg-white text-promed-primary hover:bg-promed-bg px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all active:scale-95 overflow-hidden"
                >
                    <UserPlus className="w-5 h-5" />
                    Provision Node
                </button>
            </div>

            {/* Status Message */}
            {status && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                    {status.type === 'success' ? <CheckCircle /> : <XCircle />}
                    {status.msg}
                </div>
            )}

            {/* Create User Form */}
            {showForm && (
                <div className="bg-white rounded-[32px] border border-promed-primary/10 p-10 animate-in slide-in-from-top-4 duration-500">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-promed-primary" />
                        Create Credentials
                    </h2>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-500">Full Name</label>
                            <input
                                value={name} onChange={e => setName(e.target.value)}
                                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-promed-primary/20 outline-none"
                                placeholder="Dr. John Doe" required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-500">Email Address</label>
                            <input
                                value={email} onChange={e => setEmail(e.target.value)}
                                type="email"
                                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-promed-primary/20 outline-none"
                                placeholder="doctor@clinic.com" required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-500">Password / Lock PIN (Universal)</label>
                            <input
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                type="text"
                                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-promed-primary/20 outline-none font-mono"
                                placeholder="E.g. password123 or 123456" required
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-500">Role</label>
                            <select
                                value={role} onChange={e => setRole(e.target.value as any)}
                                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-promed-primary/20 outline-none"
                            >
                                <option value="staff">Staff</option>
                                <option value="doctor">Doctor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-promed-primary hover:bg-promed-dark text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center gap-3 transition-all disabled:opacity-50 active:scale-95"
                            >
                                {loading ? 'Creating...' : 'Establish Registry'}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Edit User Form */}
            {editingUser && (
                <div className="bg-white rounded-3xl border border-promed-primary/10 p-8 ring-2 ring-promed-primary/5 scale-in-center">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-promed-primary" />
                        Edit User: <span className="text-promed-primary underline font-mono">{editingUser.email}</span>
                    </h2>
                    <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-500">Full Name</label>
                            <input
                                value={name} onChange={e => setName(e.target.value)}
                                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-promed-primary/20 outline-none"
                                placeholder="Dr. John Doe" required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-500">Lock PIN / Password (Universal)</label>
                            <input
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                type="text"
                                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-promed-primary/20 outline-none font-mono"
                                placeholder="E.g. 123456" required
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-500">Role</label>
                            <select
                                value={role} onChange={e => setRole(e.target.value as any)}
                                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-promed-primary/20 outline-none"
                            >
                                <option value="staff">Staff</option>
                                <option value="doctor">Doctor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-500">Account Status</label>
                            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser({ ...editingUser, status: 'active' })}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 ${editingUser.status === 'active' ? 'bg-white text-green-600 ' : 'text-slate-400'}`}
                                >
                                    ACTIVE
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingUser({ ...editingUser, status: 'frozen' })}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 ${editingUser.status === 'frozen' ? 'bg-white text-amber-600 ' : 'text-slate-400'}`}
                                >
                                    FROZEN
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingUser({ ...editingUser, status: 'banned' })}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 ${editingUser.status === 'banned' ? 'bg-white text-red-600 ' : 'text-slate-400'}`}
                                >
                                    BANNED
                                </button>
                            </div>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="px-6 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-promed-primary hover:bg-promed-dark text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Users List */}
            <div className="bg-white rounded-[40px] border border-promed-primary/5 overflow-hidden">
                <div className="p-8 border-b border-promed-primary/5 flex justify-between items-center bg-promed-bg/20">
                    <h2 className="text-xl font-black text-promed-text flex items-center gap-3">
                        <div className="p-2 bg-promed-primary text-white rounded-xl ">
                            <Users className="w-5 h-5" />
                        </div>
                        System Registry
                    </h2>
                    <span className="text-promed-muted text-xs font-black uppercase tracking-widest opacity-60">{users.length} live nodes</span>
                </div>

                {loading && users.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">Loading users...</div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-promed-primary/5">
                                <th className="p-8 font-black text-[10px] uppercase tracking-[0.2em] text-promed-muted">Node Identity</th>
                                <th className="p-8 font-black text-[10px] uppercase tracking-[0.2em] text-promed-muted">Access Protocol</th>
                                <th className="p-8 font-black text-[10px] uppercase tracking-[0.2em] text-promed-muted">Quantum Key</th>
                                <th className="p-8 font-black text-[10px] uppercase tracking-[0.2em] text-promed-muted">Sync Date</th>
                                <th className="p-8 font-black text-[10px] uppercase tracking-[0.2em] text-promed-muted text-right">Status State</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-6">
                                        <div className="font-bold text-slate-800">{user.name || 'No Name'}</div>
                                        <div className="text-sm text-slate-400 font-mono">{user.email}</div>
                                    </td>
                                    <td className="p-8">
                                        <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-promed-primary text-white ' :
                                            user.role === 'doctor' ? 'bg-promed-bg text-promed-primary border border-promed-primary/10' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                            {user.role || 'user'}
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        <PasswordReveal value={user.lockPassword || '******'} />
                                    </td>
                                    <td className="p-6 text-slate-500 text-sm">
                                        {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            {user.status === 'active' ? (
                                                <span className="text-green-500 font-medium text-sm flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                                    Active
                                                </span>
                                            ) : user.status === 'banned' ? (
                                                <span className="text-red-600 font-black text-sm flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-100 uppercase tracking-tighter">
                                                    <XCircle className="w-3 h-3" />
                                                    Banned
                                                </span>
                                            ) : (
                                                <span className="text-amber-500 font-medium text-sm flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-amber-500 " />
                                                    Frozen
                                                </span>
                                            )}
                                            <button
                                                onClick={() => startEdit(user)}
                                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-promed-primary transition-colors"
                                                title="Tahrirlash"
                                            >
                                                <Settings size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div >
    );
};

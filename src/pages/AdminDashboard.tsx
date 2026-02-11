import React, { useState, useEffect, useMemo } from 'react';
import {
    Users,
    ShieldAlert,
    Search,
    Unlock,
    Trash2,
    UserPlus,
    RefreshCw,
    ShieldCheck,
    Megaphone,
    Send,
    Trash,
    Lock
} from 'lucide-react';
import happyIcon from '../assets/images/patients.png';
import operationIcon from '../assets/images/operation.png';
import thinkingIcon from '../assets/images/patients.png'; // Fallback
import { subscribeToAllProfiles, updateUserProfile } from '../lib/userService';
import { createSystemAlert, sendTargetedNotifications, clearAlerts } from '../lib/notificationService';
import { Profile } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { createSystemUser } from '../lib/adminService';
import { auth } from '../lib/firebase';

export const AdminDashboard: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteForm, setInviteForm] = useState({
        name: '',
        email: '',
        phoneNumber: '', // Added phoneNumber
        password: '',
        role: 'user' as 'admin' | 'doctor' | 'staff' | 'user'
    });
    const [isCreating, setIsCreating] = useState(false);

    // Navigation State
    const [activeTab, setActiveTab] = useState<'registry' | 'broadcast'>('registry');
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

    // Megaphone State
    const [broadcastData, setBroadcastData] = useState({ title: '', content: '', type: 'info' as any });
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [targetAudience, setTargetAudience] = useState<'all' | 'specific'>('all');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [notificationCategory, setNotificationCategory] = useState<'billing' | 'congratulations' | 'message'>('message');

    // Mapped type based on category
    useEffect(() => {
        if (notificationCategory === 'billing') setBroadcastData(prev => ({ ...prev, type: 'warning' }));
        else if (notificationCategory === 'congratulations') setBroadcastData(prev => ({ ...prev, type: 'success' }));
        else setBroadcastData(prev => ({ ...prev, type: 'info' }));
    }, [notificationCategory]);

    const { success, error } = useToast();
    const { t } = useLanguage();

    useEffect(() => {
        console.log("🚀 AdminDashboard: Mounting & Subscribing...");
        setLoading(true);
        const unsubscribe = subscribeToAllProfiles(
            (data) => {
                console.log("📋 AdminDashboard: Received profiles:", data.length);
                setProfiles(data);
                setLoading(false);
            },
            (err) => {
                console.error('❌ AdminDashboard fetch error:', err);
                setLoading(false);
            }
        );
        return () => {
            console.log("AdminDashboard: Cleaning up...");
            unsubscribe();
        };
    }, []);


    const filteredProfiles = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return profiles.filter(p =>
            p.fullName?.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q) ||
            p.phoneNumber?.toLowerCase().includes(q) || // Filter by phone too
            p.accountId?.toLowerCase().includes(q)
        );
    }, [profiles, searchQuery]);

    const handleToggleFreeze = async (profile: Profile) => {
        const newStatus = profile.status === 'frozen' ? 'active' : 'frozen';
        try {
            await updateUserProfile(profile.id, { status: newStatus });
            success(t('status_updated_title'), newStatus === 'frozen' ? t('account_frozen_msg') : t('account_active_msg'), thinkingIcon);
        } catch (err) {
            error(t('toast_error_title'), t('toast_save_failed'));
        }
    };

    const handleBroadcast = async () => {
        if (!broadcastData.title || !broadcastData.content) {
            error(t('toast_error_title'), t('empty_fields_error') || "Iltimos, barcha maydonlarni to'ldiring.");
            return;
        }

        if (targetAudience === 'specific' && selectedUserIds.length === 0) {
            error(t('toast_error_title'), "Iltimos, foydalanuvchilarni tanlang.");
            return;
        }

        setIsBroadcasting(true);
        try {
            if (targetAudience === 'specific') {
                await sendTargetedNotifications(selectedUserIds, {
                    title: broadcastData.title,
                    content: broadcastData.content,
                    type: broadcastData.type, // Determined by category
                    category: notificationCategory
                });
            } else {
                await createSystemAlert({
                    ...broadcastData,
                    category: notificationCategory
                });
            }
            success(t('megaphone_title'), t('broadcast_success'), happyIcon);
            setBroadcastData({ title: '', content: '', type: 'info' });
            setSelectedUserIds([]);
            setTargetAudience('all');
        } catch (err: any) {
            console.error("Broadcast error detail:", err);
            const errMsg = err?.code || err?.message || "Unknown error";
            error(t('toast_error_title'), `Xatolik: ${errMsg}`);
        } finally {
            setIsBroadcasting(false);
        }
    };


    const handleCreateAccount = async () => {
        // Validation: Name + (Phone OR Email) + Password
        if (!inviteForm.name || !inviteForm.password || (!inviteForm.phoneNumber && !inviteForm.email)) {
            error(t('toast_error_title'), "Please enter Name, Phone Number, and Password.");
            return;
        }

        setIsCreating(true);
        try {
            // Auto-generate email if missing, using phone number
            let finalEmail = inviteForm.email;
            if (!finalEmail && inviteForm.phoneNumber) {
                const cleanPhone = inviteForm.phoneNumber.replace(/\+/g, '').replace(/\s/g, '');
                finalEmail = `${cleanPhone}@promed.sys`;
            }

            await createSystemUser({
                email: finalEmail,
                phoneNumber: inviteForm.phoneNumber,
                password: inviteForm.password,
                fullName: inviteForm.name,
                role: inviteForm.role
            });

            success(t('toast_info_title'), t('account_created'));
            setShowInviteModal(false);
            setInviteForm({ name: '', email: '', phoneNumber: '', password: '', role: 'user' });
        } catch (err: any) {
            console.error("Create account error:", err);
            error(t('toast_error_title'), err.message || "Xatolik yuz berdi.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleClearAlerts = async () => {
        try {
            await clearAlerts();
            success(t('clear'), t('photo_deleted_msg'));
        } catch (err) {
            error(t('toast_error_title'), t('toast_save_failed'));
        }
    };


    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20 relative">
            {/* Background Mesh Gradients */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-promed-bg">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-promed-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-promed-primary/5 rounded-full blur-[120px]" />
            </div>

            {/* Header Section */}
            <div className="group relative bg-white rounded-[40px] shadow-premium p-6 md:p-12 text-promed-text overflow-hidden border border-promed-primary/5 transition-all duration-500 ">
                {/* Glossy Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-promed-primary/5 via-transparent to-transparent opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-promed-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 animate-pulse" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-promed-bg backdrop-blur-md rounded-full border border-promed-primary/10 ">
                            <div className="w-2 h-2 bg-promed-primary rounded-full animate-pulse " />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-promed-primary">{t('god_mode')}</span>
                        </div>
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-3 text-promed-text">
                                {t('admin_control_center')}
                            </h2>
                            <p className="text-promed-muted font-medium tracking-wide text-sm md:text-lg max-w-lg leading-relaxed">
                                Orchestrating <span className="text-promed-primary font-bold">{profiles.length}</span> live healthcare instances with total sovereignty.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden lg:flex items-center gap-8 mr-8 border-r border-promed-primary/10 pr-8">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-promed-muted uppercase tracking-widest mb-1">Server Load</p>
                                <p className="text-xl font-mono font-bold text-promed-primary">12%</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-promed-muted uppercase tracking-widest mb-1">Uptime</p>
                                <p className="text-xl font-mono font-bold text-promed-primary">99.9%</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="btn-premium-blue !px-8 !py-4"
                        >
                            <UserPlus size={20} className="relative z-10" />
                            <span>Provision New Clinic</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex justify-center">
                <div className="bg-slate-100/50 backdrop-blur-md p-1.5 rounded-[24px] flex gap-1 border border-slate-200/50 ">
                    <button
                        onClick={() => setActiveTab('registry')}
                        className={`px-8 py-3 rounded-[18px] text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 flex items-center gap-2.5 ${activeTab === 'registry'
                            ? 'bg-promed-primary text-white scale-[1.02]'
                            : 'text-promed-muted hover:text-promed-text hover:bg-white/50'
                            }`}
                    >
                        <Users size={16} strokeWidth={2.5} />
                        System Registry
                    </button>
                    <button
                        onClick={() => setActiveTab('broadcast')}
                        className={`px-8 py-3 rounded-[18px] text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 flex items-center gap-2.5 ${activeTab === 'broadcast'
                            ? 'bg-promed-primary text-white scale-[1.02]'
                            : 'text-promed-muted hover:text-promed-text hover:bg-white/50'
                            }`}
                    >
                        <Megaphone size={16} strokeWidth={2.5} />
                        Global Broadcast
                    </button>
                </div>
            </div>

            {/* Invite Modal Placeholder */}
            {showInviteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="absolute inset-0" onClick={() => setShowInviteModal(false)} />
                    <div className="relative bg-promed-bg backdrop-blur-2xl rounded-[48px] p-6 md:p-12 w-full max-w-xl border border-promed-primary/10 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                        {/* Modal Glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-promed-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-promed-primary text-white rounded-2xl">
                                    <UserPlus size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-promed-text tracking-tight">Provision Clinic</h3>
                                    <p className="text-sm text-promed-muted font-bold uppercase tracking-widest mt-1">Registry Protocol 1.0</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-promed-muted ml-2">Clinic Identity</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Royal Clinic"
                                        value={inviteForm.name}
                                        onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                                        className="w-full px-7 py-4.5 bg-white border border-promed-primary/10 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-promed-primary/10 focus:border-promed-primary transition-all font-bold text-promed-text placeholder:text-promed-muted/30"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-promed-muted ml-2">Phone Number (Login ID)</label>
                                    <input
                                        type="tel"
                                        placeholder="+998 90 123 45 67"
                                        value={inviteForm.phoneNumber}
                                        onChange={(e) => setInviteForm({ ...inviteForm, phoneNumber: e.target.value })}
                                        className="w-full px-7 py-4.5 bg-white border border-promed-primary/10 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-promed-primary/10 focus:border-promed-primary transition-all font-bold text-promed-text placeholder:text-promed-muted/30"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-promed-muted ml-2">Email (Optional)</label>
                                    <input
                                        type="email"
                                        placeholder="Optional..."
                                        value={inviteForm.email}
                                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                        className="w-full px-7 py-4.5 bg-white border border-promed-primary/10 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-promed-primary/10 focus:border-promed-primary transition-all font-bold text-promed-text placeholder:text-promed-muted/30"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-promed-muted ml-2">Access Key (Password)</label>
                                    <input
                                        type="text"
                                        placeholder="Generate secure key..."
                                        value={inviteForm.password}
                                        onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                                        className="w-full px-7 py-4.5 bg-white border border-promed-primary/10 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-promed-primary/10 focus:border-promed-primary transition-all font-mono font-bold text-promed-text placeholder:font-sans placeholder:text-promed-muted/30"
                                    />
                                </div>

                                <div className="flex gap-4 pt-8">
                                    <button
                                        onClick={() => setShowInviteModal(false)}
                                        className="flex-1 py-5 bg-slate-100 text-promed-muted font-black uppercase tracking-widest text-[11px] rounded-[24px] hover:bg-slate-200 transition-all active:scale-95"
                                    >
                                        Abort
                                    </button>
                                    <button
                                        onClick={handleCreateAccount}
                                        disabled={isCreating}
                                        className="flex-[2] btn-premium-blue !py-5"
                                    >
                                        {isCreating ? (
                                            <RefreshCw size={20} className="animate-spin" />
                                        ) : (
                                            <>
                                                <ShieldCheck size={20} className="relative z-10" />
                                                <span>Finalize Provisioning</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'registry' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-white/70 backdrop-blur-3xl rounded-[40px] shadow-premium border border-white/40 overflow-hidden group/table transition-all duration-500 max-w-6xl mx-auto">
                        <div className="p-6 md:p-10 border-b border-slate-100/50 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-gradient-to-b from-slate-50/50 to-transparent">
                            <div>
                                <h3 className="text-2xl font-black text-promed-text tracking-tight flex items-center gap-3">
                                    {t('system_accounts') || 'System Registry'}
                                    <span className="w-2 h-2 bg-promed-primary rounded-full animate-ping" />
                                </h3>
                                <p className="text-sm text-promed-muted mt-1.5 font-bold uppercase tracking-widest opacity-80">Synchronized via Realtime Protocol</p>
                            </div>

                            <div className="relative group/search flex-1 max-w-md">
                                <div className="absolute inset-0 bg-promed-primary/5 blur-xl group-focus-within/search:opacity-100 opacity-0 transition-opacity" />
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-promed-muted/40 group-focus-within/search:text-promed-primary transition-all duration-300 group-focus-within/search:scale-110" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search registry by SID, identity, or node..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-14 pr-7 py-4.5 bg-white border border-promed-primary/10 rounded-[22px] w-full text-base focus:outline-none focus:ring-4 focus:ring-promed-primary/10 focus:border-promed-primary transition-all font-bold text-promed-text placeholder:text-promed-muted/30"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-promed-primary/5">
                                        <th className="px-8 py-5 text-[10px] font-black text-promed-muted uppercase tracking-widest">Clinic / User</th>

                                        <th className="px-6 py-5 text-[10px] font-black text-promed-muted uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-12 h-12 border-4 border-promed-bg border-t-promed-primary rounded-full animate-spin" />
                                                    <p className="text-promed-muted font-bold uppercase tracking-widest text-[10px] animate-pulse">Establishing secure link...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredProfiles.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-40">
                                                    <Search size={48} className="text-slate-200" />
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No records match your query</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredProfiles.map((profile) => (
                                        <tr
                                            key={profile.id}
                                            onClick={() => setSelectedProfile(profile)}
                                            className="hover:bg-promed-bg transition-colors group cursor-pointer"
                                        >
                                            <td className="px-10 py-6">
                                                <div className="flex items-center space-x-6">
                                                    <div className="relative isolate">
                                                        <div className="absolute inset-0 bg-promed-primary/10 blur-lg rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        {profile.profileImage ? (
                                                            <img src={profile.profileImage} alt="" className="w-14 h-14 rounded-2xl object-cover border border-white group-hover:scale-110 transition-transform duration-500 ring-4 ring-promed-primary/0 group-hover:ring-promed-primary/10" />
                                                        ) : (
                                                            <div className="w-14 h-14 rounded-2xl bg-promed-bg flex items-center justify-center text-promed-muted font-black text-xl border border-promed-primary/10 transition-all">
                                                                {profile.fullName?.charAt(0) || '?'}
                                                            </div>
                                                        )}
                                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white  ${profile.status === 'frozen' ? 'bg-rose-500' : 'bg-promed-primary'}`} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-promed-text text-lg group-hover:text-promed-primary transition-colors tracking-tight leading-tight">{profile.fullName || 'Unnamed Account'}</p>
                                                        <div className="flex items-center gap-2 mt-1.5 px-3 py-1 bg-promed-bg rounded-lg w-fit border border-promed-primary/5">
                                                            <span className="text-[10px] text-promed-muted font-black uppercase tracking-widest">{profile.email || 'no-identity@node.sys'}</span>
                                                            <span className="w-1 h-1 bg-promed-primary/20 rounded-full" />
                                                            <span className="text-[10px] text-promed-muted font-mono font-bold uppercase tracking-tighter">SID-{profile.id.slice(0, 8).toUpperCase()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">

                                                    <button
                                                        onClick={() => handleToggleFreeze(profile)}
                                                        className={`p-2.5 rounded-xl transition-all duration-200 ${profile.status === 'frozen'
                                                            ? 'bg-promed-bg text-promed-primary hover:bg-promed-primary hover:text-white'
                                                            : 'bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white'
                                                            } active:scale-95 border border-transparent hover:border-promed-primary/20`}
                                                        title={profile.status === 'frozen' ? 'Unfreeze Account' : 'Freeze Account/Access'}
                                                    >
                                                        {profile.status === 'frozen' ? <Unlock size={18} /> : <ShieldAlert size={18} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-8 bg-white border-t border-promed-primary/5 flex flex-wrap items-center justify-between gap-4">
                            <div className="text-[10px] font-black text-promed-muted uppercase tracking-[0.2em] flex items-center gap-3">
                                <div className="p-1.5 bg-promed-primary/10 text-promed-primary rounded-lg border border-promed-primary/20">
                                    <ShieldCheck size={16} />
                                </div>
                                <span className="opacity-60">Quantum Security Protocol Active</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => window.location.reload()} className="group/sync px-4 py-2 bg-promed-bg hover:bg-promed-light text-promed-muted hover:text-promed-primary rounded-xl border border-promed-primary/10 transition-all flex items-center gap-3 active:scale-95 ">
                                    <RefreshCw size={14} className={`${loading ? 'animate-spin' : 'group-hover/sync:rotate-180'} transition-transform duration-500`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Protocol Re-Sync</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto space-y-8 animate-in mt-10 fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-white/80 backdrop-blur-3xl rounded-[40px] shadow-premium border border-white/40 overflow-hidden relative group/mega transition-all duration-500">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/[0.03] rounded-full blur-[80px] -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-1000" />
                        <div className="p-6 md:p-10 border-b border-slate-100/50 bg-gradient-to-b from-rose-500/[0.02] to-transparent">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3.5 bg-promed-primary text-white rounded-2xl group-hover:rotate-[15deg] transition-transform duration-500 group-hover:scale-110">
                                    <Megaphone size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-promed-text tracking-tight">{t('megaphone_title')}</h3>
                                    <p className="text-[10px] font-black text-promed-primary/60 uppercase tracking-widest">Global Broadcast Node</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400 font-bold tracking-wide mt-4 opacity-70 italic">{t('megaphone_desc')}</p>
                        </div>

                        <div className="p-8 space-y-6">


                            {/* Target Audience & Category Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Audience */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Target Audience</label>
                                    <div className="flex bg-promed-bg p-1 rounded-xl border border-promed-primary/10">
                                        <button
                                            onClick={() => setTargetAudience('all')}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${targetAudience === 'all' ? 'bg-white shadow-sm text-promed-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            All Users
                                        </button>
                                        <button
                                            onClick={() => setTargetAudience('specific')}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${targetAudience === 'specific' ? 'bg-white shadow-sm text-promed-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Specific Users
                                        </button>
                                    </div>

                                    {targetAudience === 'specific' && (
                                        <div className="mt-3 bg-white border border-slate-200 rounded-xl max-h-40 overflow-y-auto p-2 custom-scrollbar">
                                            {profiles.map(p => (
                                                <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUserIds.includes(p.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedUserIds([...selectedUserIds, p.id]);
                                                            else setSelectedUserIds(selectedUserIds.filter(id => id !== p.id));
                                                        }}
                                                        className="w-4 h-4 rounded border-slate-300 text-promed-primary focus:ring-promed-primary"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                            {(p.fullName || p.email)?.charAt(0) || '?'}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{p.fullName || p.email || 'Unknown'}</span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Notification Type</label>
                                    <div className="space-y-2">
                                        {[
                                            { id: 'billing', label: 'Billing / Invoice', color: 'bg-amber-500' },
                                            { id: 'congratulations', label: 'Congratulations', color: 'bg-emerald-500' },
                                            { id: 'message', label: 'General Message', color: 'bg-promed-primary' }
                                        ].map(cat => (
                                            <button
                                                key={cat.id}
                                                // @ts-ignore
                                                onClick={() => setNotificationCategory(cat.id)}
                                                className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all ${notificationCategory === cat.id
                                                    ? 'bg-white border-promed-primary ring-1 ring-promed-primary/20 shadow-sm'
                                                    : 'bg-promed-bg border-transparent hover:bg-white hover:border-slate-200'}`}
                                            >
                                                <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                                                <span className={`text-xs font-bold ${notificationCategory === cat.id ? 'text-promed-text' : 'text-slate-500'}`}>{cat.label}</span>
                                                {notificationCategory === cat.id && <div className="ml-auto w-2 h-2 rounded-full bg-promed-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Short Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. System Maintenance"
                                        value={broadcastData.title}
                                        onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                                        className="w-full px-5 py-4 bg-promed-bg border border-promed-primary/10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-promed-primary/10 focus:border-promed-primary transition-all font-bold text-promed-text"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Message Content</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Describe the alert..."
                                        value={broadcastData.content}
                                        onChange={(e) => setBroadcastData({ ...broadcastData, content: e.target.value })}
                                        className="w-full px-5 py-4 bg-promed-bg border border-promed-primary/10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-promed-primary/10 focus:border-promed-primary transition-all font-medium text-promed-text resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleClearAlerts}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Trash size={16} />
                                    <span>Clear</span>
                                </button>
                                <button
                                    onClick={handleBroadcast}
                                    disabled={isBroadcasting}
                                    className="flex-[2] btn-premium-blue !py-4"
                                >
                                    {isBroadcasting ? (
                                        <RefreshCw size={18} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Send size={18} className="relative z-10" />
                                            <span>{t('transmit')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-promed-primary/5 border border-promed-primary/10 rounded-[32px] p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldCheck className="text-promed-primary" size={20} />
                            <h4 className="font-black text-[10px] uppercase tracking-widest text-promed-text">Admin Protocol</h4>
                        </div>
                        <ul className="space-y-3 text-xs font-medium text-promed-muted leading-relaxed">
                            <li className="flex gap-2">
                                <span className="w-1.5 h-1.5 bg-promed-primary rounded-full mt-1 flex-shrink-0" />
                                Broadcasts reach all users in real-time.
                            </li>
                            <li className="flex gap-2">
                                <span className="w-1.5 h-1.5 bg-promed-primary rounded-full mt-1 flex-shrink-0" />
                                Freezing an account logs the user out instantly.
                            </li>
                            <li className="flex gap-2">
                                <span className="w-1.5 h-1.5 bg-promed-primary rounded-full mt-1 flex-shrink-0" />
                                Only one active broadcast is allowed at a time.
                            </li>
                        </ul>
                    </div>
                </div >
            )}
            {/* Account Details Modal */}
            {
                selectedProfile && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500">
                        <div className="absolute inset-0" onClick={() => setSelectedProfile(null)} />
                        <div className="relative bg-white/90 backdrop-blur-2xl rounded-[48px] shadow-premium p-6 md:p-12 w-full max-w-xl border border-white overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-promed-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-promed-primary text-white rounded-2xl ">
                                        <Lock size={24} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-promed-text tracking-tight">Account Credentials</h3>
                                        <p className="text-sm text-promed-muted font-bold uppercase tracking-widest mt-1">Registry Data Node</p>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="flex items-center space-x-6 p-4 bg-white rounded-3xl border border-promed-primary/10 ">
                                        {selectedProfile.profileImage ? (
                                            <img src={selectedProfile.profileImage} alt="" className="w-16 h-16 rounded-2xl object-cover " />
                                        ) : (
                                            <div className="w-16 h-16 rounded-2xl bg-promed-bg flex items-center justify-center text-promed-muted font-black text-xl border border-promed-primary/10">
                                                {selectedProfile.fullName?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-black text-promed-text text-xl tracking-tight leading-none">{selectedProfile.fullName || 'Unnamed Account'}</p>
                                            <p className="text-[10px] text-promed-muted font-black uppercase tracking-widest leading-none mt-2">Node SID-{selectedProfile.id.slice(0, 8).toUpperCase()}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="group/field space-y-2">
                                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-promed-muted ml-2 group-hover/field:text-promed-primary transition-colors">Identity (Email)</label>
                                            <div className="w-full px-7 py-5 bg-white border border-promed-primary/10 rounded-[24px] font-bold text-promed-text transition-all group-hover/field:border-promed-primary/20 ">
                                                {selectedProfile.email || 'no-identity@node.sys'}
                                            </div>
                                        </div>

                                        <div className="group/pass space-y-2">
                                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-promed-primary ml-2 group-hover/pass:animate-pulse">Secure Access Key (Password)</label>
                                            <div className="w-full px-7 py-5 bg-promed-bg text-promed-text border-2 border-dashed border-promed-primary/20 rounded-[24px] font-mono font-black text-3xl tracking-[0.4em] text-center transition-all group-hover/pass:scale-[1.02] active:scale-95">
                                                {selectedProfile.lockPassword || '000000'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8">
                                        <button
                                            onClick={() => setSelectedProfile(null)}
                                            className="w-full py-5 bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[11px] rounded-[24px] hover:bg-slate-200 transition-all active:scale-95 border border-slate-200/50"
                                        >
                                            Close Registry Node
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminDashboard;

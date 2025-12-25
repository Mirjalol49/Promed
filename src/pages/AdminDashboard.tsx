import React, { useState, useEffect, useMemo } from 'react';
import {
    Users,
    ShieldAlert,
    DollarSign,
    Search,
    LayoutGrid,
    Unlock,
    Trash2,
    UserPlus,
    RefreshCw,
    ShieldCheck,
    CreditCard,
    Megaphone,
    Send,
    Trash,
    MoreHorizontal,
    Calendar
} from 'lucide-react';
import { subscribeToAllProfiles, updateUserProfile } from '../lib/userService';
import { broadcastAlert, clearAlerts } from '../lib/notificationService';
import { Profile } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';

export const AdminDashboard: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Megaphone State
    const [broadcastData, setBroadcastData] = useState({ title: '', content: '', type: 'info' as any });
    const [isBroadcasting, setIsBroadcasting] = useState(false);

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

    const stats = useMemo(() => {
        const active = profiles.filter(p => p.status === 'active').length;
        const frozen = profiles.filter(p => p.status === 'frozen').length;
        // Mock revenue: $199 per active clinic
        return { active, frozen };
    }, [profiles]);

    const filteredProfiles = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return profiles.filter(p =>
            p.fullName?.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q) ||
            p.accountId?.toLowerCase().includes(q)
        );
    }, [profiles, searchQuery]);

    const handleToggleFreeze = async (profile: Profile) => {
        const newStatus = profile.status === 'frozen' ? 'active' : 'frozen';
        try {
            await updateUserProfile(profile.id, { status: newStatus });
            success(t('status_updated_title'), `${t('account_id_label')} ${newStatus === 'frozen' ? 'muzlatildi' : 'faollashtirildi'}.`);
        } catch (err) {
            error(t('toast_error_title'), t('toast_save_failed'));
        }
    };

    const handleBroadcast = async () => {
        if (!broadcastData.title || !broadcastData.content) {
            error(t('toast_error_title'), t('empty_fields_error') || "Iltimos, barcha maydonlarni to'ldiring.");
            return;
        }
        setIsBroadcasting(true);
        try {
            await broadcastAlert(broadcastData);
            success(t('megaphone_title'), t('megaphone_desc'));
            setBroadcastData({ title: '', content: '', type: 'info' });
        } catch (err) {
            error(t('toast_error_title'), t('toast_save_failed'));
        } finally {
            setIsBroadcasting(false);
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

    const AdminStatCard = ({ label, value, icon: Icon, color, sublabel }: any) => (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center space-x-5 hover:shadow-md transition-all duration-300">
            <div className={`p-4 rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
                {sublabel && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{sublabel}</p>}
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20 flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">{t('god_mode')}</span>
                        </div>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight mb-2">{t('admin_control_center')}</h2>
                    <p className="text-slate-400 font-medium tracking-wide">Managing {profiles.length} clinics across the system.</p>
                </div>
                <div className="flex gap-3 relative z-10">
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition shadow-[0_10px_20px_rgba(16,185,129,0.3)] flex items-center gap-2 active:scale-95"
                    >
                        <UserPlus size={18} />
                        <span>Invite New Clinic</span>
                    </button>
                </div>
            </div>

            {/* Invite Modal Placeholder */}
            {showInviteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Invite Clinic</h3>
                        <p className="text-slate-500 mb-8 font-medium">Enter the clinic email to send an access link.</p>

                        <div className="space-y-6 text-slate-900">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Clinic Email Address</label>
                                <input
                                    type="email"
                                    placeholder="clinic@example.com"
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        success(t('toast_info_title'), "Taklifnoma yuborildi.");
                                        setShowInviteModal(false);
                                    }}
                                    className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition shadow-lg active:scale-95"
                                >
                                    {t('transmit')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Accounts Table */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Stats row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <AdminStatCard
                            label="Active Clinics"
                            value={stats.active}
                            icon={Users}
                            color="bg-emerald-500"
                            sublabel="Running instances"
                        />

                        <AdminStatCard
                            label="Frozen Accounts"
                            value={stats.frozen}
                            icon={ShieldAlert}
                            color="bg-rose-500"
                            sublabel="Restricted access"
                        />
                    </div>

                    {/* Main Table Container */}
                    <div className="bg-white rounded-[32px] shadow-soft border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">System Accounts</h3>
                                <p className="text-sm text-slate-500 mt-1 font-medium italic">Synchronized with Supabase Realtime</p>
                            </div>

                            <div className="relative group flex-1 max-w-md">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by name, email or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl w-full text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinic / User</th>

                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
                                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">Establishing secure link...</p>
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
                                        <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center space-x-4">
                                                    <div className="relative">
                                                        {profile.profileImage ? (
                                                            <img src={profile.profileImage} alt="" className="w-11 h-11 rounded-xl object-cover shadow-sm border border-slate-200 group-hover:scale-105 transition-transform" />
                                                        ) : (
                                                            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-sm">
                                                                {profile.fullName?.charAt(0) || '?'}
                                                            </div>
                                                        )}

                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{profile.fullName || 'Unnamed Account'}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium group-hover:text-slate-500 transition-colors flex items-center gap-1.5 mt-0.5">
                                                            {profile.email || 'no-email@graft.local'}
                                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                            {profile.id.slice(0, 8).toUpperCase()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">

                                                    <button
                                                        onClick={() => handleToggleFreeze(profile)}
                                                        className={`p-2.5 rounded-xl transition-all duration-200 ${profile.status === 'frozen'
                                                            ? 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                                                            : 'bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white'
                                                            } active:scale-95`}
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

                        <div className="p-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck size={14} className="text-emerald-500" />
                                Full System Sovereignty Guaranteed
                            </p>
                            <button onClick={() => window.location.reload()} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-2">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Forced Sync</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Megaphone */}
                <div className="space-y-8">
                    <div className="bg-white rounded-[32px] shadow-soft border border-slate-100 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                        <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20">
                                    <Megaphone size={18} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">{t('megaphone_title')}</h3>
                            </div>
                            <p className="text-sm text-slate-500 font-medium">{t('megaphone_desc')}</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Alert Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['info', 'warning', 'danger', 'success'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setBroadcastData({ ...broadcastData, type: t })}
                                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${broadcastData.type === t
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                                : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
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
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-bold text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Message Content</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Describe the alert..."
                                        value={broadcastData.content}
                                        onChange={(e) => setBroadcastData({ ...broadcastData, content: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-medium text-slate-900 resize-none"
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
                                    className="flex-[2] py-4 bg-rose-500 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-rose-600 transition shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                >
                                    {isBroadcasting ? (
                                        <RefreshCw size={18} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            <span>{t('transmit')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Tips */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[32px] p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldCheck className="text-emerald-600" size={20} />
                            <h4 className="font-black text-[10px] uppercase tracking-widest text-emerald-800">Admin Protocol</h4>
                        </div>
                        <ul className="space-y-3 text-xs font-medium text-emerald-700/80 leading-relaxed">
                            <li className="flex gap-2">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1 flex-shrink-0" />
                                Broadcasts reach all users in real-time.
                            </li>
                            <li className="flex gap-2">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1 flex-shrink-0" />
                                Freezing an account logs the user out instantly.
                            </li>
                            <li className="flex gap-2">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1 flex-shrink-0" />
                                Only one active broadcast is allowed at a time.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

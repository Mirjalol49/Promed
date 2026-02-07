
import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Lead, LeadStatus, LeadColumn as ILeadColumn } from '../../types';
import { LeadCard } from './LeadCard';
import { leadService } from '../../services/leadService';
import { AddLeadModal } from './AddLeadModal';
import { ReminderModal } from './ReminderModal';
import { LeadDetail } from './LeadDetail';

import DeleteModal from '../../components/ui/DeleteModal';
import { CelebrationOverlay } from '../../components/ui/CelebrationOverlay';

import {
    Plus,
    PlusCircle,
    LayoutTemplate,
    Briefcase,
    Sparkles,
    Phone,
    Send,
    Banknote,
    Stethoscope,
    Archive,
    Search,
    Pencil,
    Trash,
    Calendar,
    Clock,
    Bell,
    Filter,
    X
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccount } from '../../contexts/AccountContext';



type QuickFilter = 'all' | 'today' | 'week' | 'has_reminder';

export const KanbanBoard: React.FC = () => {
    const { t } = useLanguage();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [activeTab, setActiveTab] = useState<LeadStatus>('NEW');
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter State
    const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter>('all');
    const [selectedSources, setSelectedSources] = useState<string[]>([]);

    // Edit/Delete State
    // Check for Stale Leads (Logic: Status 'PRICE_GIVEN' + updated > 3 days ago)
    const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
    const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
    const [leadToRemind, setLeadToRemind] = useState<Lead | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [celebrationId, setCelebrationId] = useState<number | null>(null);

    const { userId, isLoading: isAuthLoading } = useAccount();

    // Initial Fetch (Real-time Subscription)
    useEffect(() => {
        // 1. Wait for Auth to initialize
        if (isAuthLoading) return;

        // 2. If Auth done but no User (should be handled by ProtectedRoute, but safe-guard here)
        if (!userId) {
            setIsLoading(false);
            return;
        }

        // 3. User present -> Subscribe
        const unsubscribe = leadService.subscribeToLeads(
            userId,
            (data) => {
                setLeads(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Critical: Failed to load leads", error);
                setIsLoading(false); // Stop loop even on error
            }
        );
        return () => unsubscribe();
    }, [userId, isAuthLoading]);

    // Keep selectedLead in sync with latest lead data (for ANY changes)
    useEffect(() => {
        if (selectedLead) {
            const updatedLead = leads.find(l => l.id === selectedLead.id);
            if (updatedLead) {
                // Always update to reflect latest changes (name, phone, source, etc.)
                setSelectedLead(updatedLead);
            }
        }
    }, [leads, selectedLead?.id]); // Only depend on leads and the ID to avoid infinite loop

    const handleStatusChange = async (id: string, newStatus: LeadStatus) => {
        // Optimistic Update
        const leadIndex = leads.findIndex(l => l.id === id);
        if (leadIndex === -1) return;

        const originalLeads = [...leads];
        const updatedLeads = [...leads];
        updatedLeads[leadIndex] = { ...updatedLeads[leadIndex], status: newStatus, updated_at: { seconds: Date.now() / 1000 } };
        setLeads(updatedLeads);

        // 🎉 Trigger Celebration if moved to BOOKED (Operation)
        if (newStatus === 'BOOKED') {
            const newId = Date.now();
            console.log("Triggering celebration with ID:", newId);
            setCelebrationId(newId);
        }

        try {
            await leadService.updateLeadStatus(id, newStatus);
        } catch (error) {
            console.error("Failed to update status", error);
            setLeads(originalLeads); // Revert
        }
    };

    const handleEdit = (lead: Lead) => {
        setLeadToEdit(lead);
        setAddModalOpen(true);
        // Keep detail modal open - edit modal will appear on top
    };

    const handleDelete = (lead: Lead) => {
        setLeadToDelete(lead);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (leadToDelete) {
            try {
                await leadService.deleteLead(leadToDelete.id);
                // No need to reload, subscription handles it
                setIsDeleteModalOpen(false);
                setLeadToDelete(null);
                setSelectedLead(null); // Close detail modal if the deleted lead was selected
            } catch (error) {
                console.error("Failed to delete lead", error);
            }
        }
    };

    const TAB_CONFIG: { id: LeadStatus; label: string; icon: any; colorTheme: string }[] = [
        { id: 'NEW', label: t('status_new'), icon: Sparkles, colorTheme: 'blue' },
        { id: 'CONTACTED', label: t('status_contacted'), icon: Phone, colorTheme: 'orange' },
        { id: 'BOOKED', label: t('status_booked'), icon: Stethoscope, colorTheme: 'emerald' },
        { id: 'LOST', label: t('status_lost'), icon: Archive, colorTheme: 'red' },
    ];

    const getTabStyles = (id: string, isActive: boolean) => {
        if (!isActive) {
            // Inactive styles map
            switch (id) {
                case 'CONTACTED': return "bg-white text-slate-500 border-slate-200 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 hover:shadow-md";
                case 'BOOKED': return "bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 hover:shadow-md";
                case 'LOST': return "bg-white text-slate-500 border-slate-200 hover:border-red-300 hover:text-red-600 hover:bg-red-50 hover:shadow-md";
                case 'NEW': default: return "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 hover:shadow-md";
            }
        }

        // Active styles map (explicit strings for JIT)
        switch (id) {
            case 'CONTACTED': return "btn-premium-orange shadow-lg shadow-orange-500/20 ring-0 border-transparent";
            case 'BOOKED': return "btn-premium-emerald shadow-lg shadow-emerald-500/20 ring-0 border-transparent";
            case 'LOST': return "btn-premium-red shadow-lg shadow-red-500/20 ring-0 border-transparent";
            case 'NEW': default: return "btn-premium-blue shadow-lg shadow-blue-500/20 ring-0 border-transparent";
        }
    };

    const getCountStyles = (id: string, isActive: boolean) => {
        if (isActive) return 'bg-white/20 text-white backdrop-blur-sm';
        switch (id) {
            case 'CONTACTED': return "bg-orange-100 text-orange-700";
            case 'BOOKED': return "bg-emerald-100 text-emerald-700";
            case 'LOST': return "bg-red-100 text-red-700";
            case 'NEW': default: return "bg-blue-100 text-blue-700";
        }
    };

    const getIconClass = (id: string, isActive: boolean) => {
        if (isActive) return 'text-white';
        switch (id) {
            case 'CONTACTED': return "text-orange-500 group-hover:scale-110";
            case 'BOOKED': return "text-emerald-500 group-hover:scale-110";
            case 'LOST': return "text-red-500 group-hover:scale-110";
            case 'NEW': default: return "text-blue-500 group-hover:scale-110";
        }
    };

    const activeColor = TAB_CONFIG.find(t => t.id === activeTab)?.colorTheme || 'blue';

    // Helper function to check if reminder is today
    const isReminderToday = (reminder?: { date: string }) => {
        if (!reminder?.date) return false;
        const today = new Date();
        const reminderDate = new Date(reminder.date);
        return reminderDate.toDateString() === today.toDateString();
    };

    // Helper function to check if reminder is this week
    const isReminderThisWeek = (reminder?: { date: string }) => {
        if (!reminder?.date) return false;
        const today = new Date();
        const reminderDate = new Date(reminder.date);
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        return reminderDate >= today && reminderDate <= weekFromNow;
    };

    const activeLeads = leads
        .filter(l => l.status === activeTab)
        // Search filter
        .filter(l => {
            const query = searchQuery.toLowerCase();
            return !query ||
                l.full_name.toLowerCase().includes(query) ||
                l.phone_number.includes(query) ||
                (l.source && l.source.toLowerCase().includes(query));
        })
        // Quick filters
        .filter(l => {
            if (activeQuickFilter === 'all') return true;
            if (activeQuickFilter === 'today') return isReminderToday(l.reminder);
            if (activeQuickFilter === 'week') return isReminderThisWeek(l.reminder);
            if (activeQuickFilter === 'has_reminder') return !!l.reminder;
            return true;
        })
        // Source filter
        .filter(l => {
            if (selectedSources.length === 0) return true;
            return selectedSources.includes(l.source);
        });

    const toggleSourceFilter = (source: string) => {
        setSelectedSources(prev =>
            prev.includes(source)
                ? prev.filter(s => s !== source)
                : [...prev, source]
        );
    };

    const clearAllFilters = () => {
        setActiveQuickFilter('all');
        setSelectedSources([]);
    };

    const hasActiveFilters = activeQuickFilter !== 'all' || selectedSources.length > 0;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden p-1.5">
            {/* Header / Tabs */}
            <div className="p-5 bg-white rounded-3xl shadow-custom flex flex-col gap-4 flex-shrink-0">
                {/* Actions (Search + View Toggle + Add) - Top Row */}
                <div className="flex flex-col gap-3">

                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        <div className="flex space-x-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1 flex-1 hidden md:flex">
                            {/* Desktop Spacer or Tabs if we moved them back */}
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto ml-auto">
                            {/* Search */}
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder={t('search')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-400 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-promed-primary/20 focus:border-promed-primary/50 transition-all font-medium text-sm"
                                />
                            </div>

                            {/* Add Button */}
                            <button
                                onClick={() => {
                                    setLeadToEdit(null);
                                    setAddModalOpen(true);
                                }}
                                className="btn-premium-blue shadow-lg shadow-promed-primary/20 flex items-center justify-center gap-2 px-5 py-2.5 flex-shrink-0 whitespace-nowrap w-full md:w-auto"
                            >
                                <PlusCircle size={18} className="relative z-10" />
                                <span className="font-bold">{t('add_btn')}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="flex flex-col gap-3">
                    {/* Quick Filters Row */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <Filter size={14} />
                            <span>{t('filter_quick_filters')}</span>
                        </div>

                        <button
                            onClick={() => setActiveQuickFilter('today')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${activeQuickFilter === 'today'
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/30'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                }`}
                        >
                            <Calendar size={14} />
                            {t('filter_today_calls')}
                        </button>

                        <button
                            onClick={() => setActiveQuickFilter('week')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${activeQuickFilter === 'week'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/30'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                }`}
                        >
                            <Clock size={14} />
                            {t('filter_this_week')}
                        </button>

                        <button
                            onClick={() => setActiveQuickFilter('has_reminder')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${activeQuickFilter === 'has_reminder'
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/30'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                }`}
                        >
                            <Bell size={14} />
                            {t('filter_has_reminder')}
                        </button>

                        {hasActiveFilters && (
                            <button
                                onClick={clearAllFilters}
                                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 bg-red-100 text-red-700 hover:bg-red-200 border border-red-300"
                            >
                                <X size={14} />
                                {t('filter_clear_all')}
                            </button>
                        )}
                    </div>

                    {/* Source Filters Row */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <Send size={14} />
                            <span>{t('filter_source')}</span>
                        </div>

                        {[
                            { key: 'Instagram', label: t('filter_source_instagram') },
                            { key: 'Telegram', label: t('filter_source_telegram') },
                            { key: 'Walk-in', label: t('filter_source_walkin') },
                            { key: 'Referral', label: t('filter_source_referral') }
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => toggleSourceFilter(key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedSources.includes(key)
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pipeline Tabs - Bottom Row */}
                <div className="grid grid-cols-2 gap-2 md:flex md:space-x-2 md:overflow-x-auto md:no-scrollbar">
                    {TAB_CONFIG.map(tab => {
                        const count = leads.filter(l => l.status === tab.id).length;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    group flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 border whitespace-nowrap w-full md:w-auto
                                    ${getTabStyles(tab.id, isActive)}
                                `}
                            >
                                <tab.icon size={16} className={`relative z-10 transition-colors flex-shrink-0 ${getIconClass(tab.id, isActive)}`} />
                                <span className="relative z-10 truncate max-w-[100px] md:max-w-none">{tab.label}</span>
                                <span className={`
                                    relative z-10 px-2 py-0.5 rounded-lg text-xs font-extrabold flex-shrink-0 transition-all
                                    ${getCountStyles(tab.id, isActive)}
                                `}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto overflow-x-visible w-full px-4 pt-3">
                {
                    isLoading ? (
                        <div className="flex items-center justify-center h-40" >
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                        </div>
                    ) : activeLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className={`p-4 rounded-full bg-${activeColor}-50 text-${activeColor}-500 mb-3`}>
                                <LayoutTemplate size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">{t('no_leads')}</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in duration-300 pb-40 pt-4 overflow-visible">
                            {activeLeads.map(lead => (
                                <LeadCard
                                    key={lead.id}
                                    lead={lead}
                                    onStatusChange={handleStatusChange}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onRemind={(lead) => {
                                        setLeadToRemind(lead);
                                        setIsReminderModalOpen(true);
                                    }}
                                    onSelect={(lead) => setSelectedLead(lead)}
                                    layoutId={`lead-card-${lead.id}`}
                                />
                            ))}
                        </div>
                    )
                }
            </div >

            <AddLeadModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setAddModalOpen(false);
                    setLeadToEdit(null);
                }}
                onSuccess={() => { }}
                leadToEdit={leadToEdit}
            />

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setLeadToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
            />

            {/* Reminder Modal */}
            <ReminderModal
                isOpen={isReminderModalOpen}
                onClose={() => {
                    setIsReminderModalOpen(false);
                    setLeadToRemind(null);
                }}
                onSetReminder={async (date, note) => {
                    if (leadToRemind) {
                        try {
                            console.log('Setting reminder for lead:', leadToRemind.id);

                            // 1. Add to Timeline first
                            await leadService.addTimelineEvent(leadToRemind.id, {
                                type: 'reminder',
                                content: `Set reminder: ${note}`,
                                created_by: 'current-user', // Consistent with other parts
                                metadata: {
                                    reminderDate: date.toISOString(),
                                    reason: note
                                }
                            });

                            // 2. Update Lead status
                            const reminderData = {
                                date: date.toISOString(),
                                note,
                                created_at: new Date().toISOString()
                            };
                            await leadService.updateLead(leadToRemind.id, { reminder: reminderData });

                            console.log('Reminder set successfully (timeline + lead update)');
                        } catch (e) {
                            console.error("Failed to set reminder", e);
                            alert("Failed to set reminder. Please check console.");
                        }
                    }
                }}
                initialDate={leadToRemind?.reminder ? new Date(leadToRemind.reminder.date) : undefined}
                initialNote={leadToRemind?.reminder?.note}
                onDelete={async () => {
                    if (leadToRemind) {
                        try {
                            // 1. Add 'Deleted' event to Timeline
                            await leadService.addTimelineEvent(leadToRemind.id, {
                                type: 'reminder',
                                content: `Reminder deleted`,
                                created_by: 'current-user',
                                metadata: {
                                    action: 'deleted',
                                    previousDate: leadToRemind.reminder?.date
                                }
                            });

                            // 2. Remove reminder from Lead
                            await leadService.updateLead(leadToRemind.id, { reminder: null as any }); // Use null to remove field or check types

                            setIsReminderModalOpen(false);
                            setLeadToRemind(null);
                        } catch (e) {
                            console.error("Failed to delete reminder", e);
                        }
                    }
                }}
            />

            {/* Lead Detail View */}
            <AnimatePresence>
                {selectedLead && (
                    <LeadDetail
                        key="lead-detail"
                        lead={selectedLead}
                        onClose={() => setSelectedLead(null)}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                    />
                )}
            </AnimatePresence>

            {/* Celebration Overlay */}
            {celebrationId && (
                <CelebrationOverlay
                    key={celebrationId}
                    isVisible={true}
                    onComplete={() => setCelebrationId(null)}
                />
            )}
        </div >
    );
};


import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus, LeadColumn as ILeadColumn } from '../../types';
import { LeadCard } from './LeadCard';
import { leadService } from '../../services/leadService';
import { AddLeadModal } from './AddLeadModal';
import DeleteModal from '../../components/ui/DeleteModal';

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
    Trash
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';



export const KanbanBoard: React.FC = () => {
    const { t } = useLanguage();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [activeTab, setActiveTab] = useState<LeadStatus>('NEW');
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit/Delete State
    const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
    const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Initial Fetch (Real-time Subscription)
    useEffect(() => {
        const unsubscribe = leadService.subscribeToLeads((data) => {
            setLeads(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleStatusChange = async (id: string, newStatus: LeadStatus) => {
        // Optimistic Update
        const leadIndex = leads.findIndex(l => l.id === id);
        if (leadIndex === -1) return;

        const originalLeads = [...leads];
        const updatedLeads = [...leads];
        updatedLeads[leadIndex] = { ...updatedLeads[leadIndex], status: newStatus, updated_at: { seconds: Date.now() / 1000 } };
        setLeads(updatedLeads);

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
    const activeLeads = leads
        .filter(l => l.status === activeTab)
        .filter(l => {
            const query = searchQuery.toLowerCase();
            return !query ||
                l.full_name.toLowerCase().includes(query) ||
                l.phone_number.includes(query) ||
                (l.source && l.source.toLowerCase().includes(query));
        });

    return (
        <div className="h-full flex flex-col space-y-6 p-6 overflow-hidden">
            {/* Header / Tabs */}
            <div className="p-3 bg-white rounded-3xl shadow-custom flex flex-col gap-4 flex-shrink-0">
                {/* Actions (Search + View Toggle + Add) - Top Row */}
                <div className="flex items-center justify-between gap-3">
                    {/* View Toggle REMOVED */}

                    <div className="flex items-center gap-3 w-full justify-between">
                        {/* Pipeline Tabs - Moved to be inline or adjust layout? The design implies they are below. */}
                        {/* Actually, user layout had toggle on left, search/add on right? No, check original. */}
                        {/* Original: <div className="flex items-center justify-between gap-3"> <ViewToggle> <RightGroup>... */}
                        {/* To remove Toggle but keep alignment, we might need a spacer or just let it flow. */}
                        {/* Let's keep the Search+Add group on the right, and maybe put Tabs on left? */}
                        {/* Original Bottom Row was tabs. Top Row was Actions. */}
                        {/* If we remove toggle (left side of Top Row), we just have Right Group (Search+Add). */}
                        {/* Let's structure Top Row to justify-end then. */}

                        <div className="flex space-x-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1 flex-1">
                            {/* Moving Tabs to Top Row Left side? Or keeping them in separate row? */}
                            {/* User image shows Toggle next to Tabs? No, image shows Toggle in a top bar. */}
                            {/* Let's sticking to removing the toggle div. */}
                            {/* To keep the search on the right, we can use justify-end for the top row container if toggle is gone. */}
                        </div>

                        <div className="flex items-center gap-3 ml-auto">
                            {/* Search */}
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder={t('search')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-promed-primary/20 focus:border-promed-primary/50 transition-all font-medium text-sm"
                                />
                            </div>

                            {/* Add Button */}
                            <button
                                onClick={() => {
                                    setLeadToEdit(null);
                                    setAddModalOpen(true);
                                }}
                                className="btn-premium-blue shadow-lg shadow-promed-primary/20 flex items-center gap-2 px-5 py-2.5 flex-shrink-0 whitespace-nowrap"
                            >
                                <PlusCircle size={18} className="relative z-10" />
                                <span>Qo'shish</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Pipeline Tabs - Bottom Row */}
                <div className="flex space-x-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
                    {TAB_CONFIG.map(tab => {
                        const count = leads.filter(l => l.status === tab.id).length;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    group flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border whitespace-nowrap flex-shrink-0
                                    ${getTabStyles(tab.id, isActive)}
                                `}
                            >
                                <tab.icon size={18} className={`relative z-10 transition-colors ${getIconClass(tab.id, isActive)}`} />
                                <span className="relative z-10">{tab.label}</span>
                                <span className={`
                                    relative z-10 px-2 py-0.5 rounded-lg text-xs font-extrabold ml-1 transition-all
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
            <div className="flex-1 overflow-y-auto w-full pr-2">
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
                            <h3 className="text-lg font-medium text-slate-900">Murojaatlar yo'q</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in duration-300 pb-20">
                            {activeLeads.map(lead => (
                                <LeadCard
                                    key={lead.id}
                                    lead={lead}
                                    onStatusChange={handleStatusChange}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
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
        </div >
    );
};

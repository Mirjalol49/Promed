import React, { useState, useEffect, useRef } from 'react';
import {
    X, Phone, MessageCircle, Clock, Edit2, Trash2,
    Send, Plus, User, Activity, FileText, Bell, Check,
    ChevronDown, AlertCircle, ExternalLink, Calendar,
    Copy
} from 'lucide-react';
import { format } from 'date-fns';
import { uz, ru } from 'date-fns/locale';
import Lottie from 'lottie-react';

import { motion, AnimatePresence } from 'framer-motion';
import { Lead, LeadStatus, TimelineEvent } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { leadService } from '../../services/leadService';
import { Portal } from '../../components/ui/Portal';
import { ReminderPopover } from './ReminderPopover';
import DeleteModal from '../../components/ui/DeleteModal';
import { useReminder } from '../../hooks/useReminder';
import { Pagination } from '../../components/ui/Pagination';

// Status color configuration - only 4 statuses to match Kanban tabs
const STATUS_COLORS: Record<LeadStatus, { color: string; bg: string }> = {
    'NEW': { color: 'text-blue-700', bg: 'bg-blue-100' },
    'CONTACTED': { color: 'text-orange-700', bg: 'bg-orange-100' },
    'PHOTOS_SENT': { color: 'text-purple-700', bg: 'bg-purple-100' }, // Hidden in dropdown
    'PRICE_GIVEN': { color: 'text-amber-700', bg: 'bg-amber-100' }, // Hidden in dropdown
    'BOOKED': { color: 'text-emerald-700', bg: 'bg-emerald-100' },
    'LOST': { color: 'text-red-700', bg: 'bg-red-100' }
};

// Only these 4 statuses appear in the dropdown (matching Kanban tabs)
const VISIBLE_STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'BOOKED', 'LOST'];

interface LeadDetailProps {
    lead: Lead;
    onClose: () => void;
    onEdit: (lead: Lead) => void;
    onDelete: (lead: Lead) => void;
    onStatusChange: (id: string, newStatus: LeadStatus) => void;
    isViewer?: boolean;
}

export const LeadDetail: React.FC<LeadDetailProps> = ({
    lead, onClose, onEdit, onDelete, onStatusChange, isViewer
}) => {
    const { t, language } = useLanguage();
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isLoadingTimeline, setIsLoadingTimeline] = useState(true);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [statusDropdownPos, setStatusDropdownPos] = useState<'above' | 'below'>('below');
    const [isReminderOpen, setIsReminderOpen] = useState(false);
    const [showToast, setShowToast] = useState<string | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [reminderInitialState, setReminderInitialState] = useState<{ date?: Date, reason?: string }>({});
    const [reminderEditingId, setReminderEditingId] = useState<string | null>(null);
    const [completionEventId, setCompletionEventId] = useState<string | null>(null); // Changed from boolean to ID
    const [completionNote, setCompletionNote] = useState('');
    const [deleteModalEventId, setDeleteModalEventId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, eventId: string, type: 'note' | 'reminder', content?: string, date?: Date } | null>(null);

    const [timelinePage, setTimelinePage] = useState(1);
    const TIMELINE_ITEMS_PER_PAGE = 8;

    const scrollRef = useRef<HTMLDivElement>(null);
    const reminderButtonRef = useRef<HTMLButtonElement>(null);
    const statusRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { setReminder, clearReminder, isOverdue, hasReminder } = useReminder();

    // Global listener to close context menu
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // Status labels with translations to match Kanban tabs
    const getStatusLabel = (status: LeadStatus): string => {
        switch (status) {
            case 'NEW': return t('status_new') || 'Yangi';
            case 'CONTACTED': return t('status_contacted') || "Bog'lanildi";
            case 'PHOTOS_SENT': return t('status_photos_sent') || 'Rasm yuborildi';
            case 'PRICE_GIVEN': return t('status_price_given') || 'Narx berildi';
            case 'BOOKED': return t('status_booked') || 'Operatsiya';
            case 'LOST': return t('status_lost') || 'Bekor qilingan';
            default: return status;
        }
    };

    const statusColors = STATUS_COLORS[lead.status] || STATUS_COLORS['NEW'];

    // Subscribe to timeline events
    useEffect(() => {
        setIsLoadingTimeline(true);
        const unsubscribe = leadService.subscribeToTimeline(lead.id, (events) => {
            setTimeline([...events].reverse());
            setIsLoadingTimeline(false);
            setTimelinePage(1); // Reset page on new data
        });
        return () => unsubscribe();
    }, [lead.id]);

    // Close status dropdown on outside click
    useEffect(() => {
        if (!isStatusOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
                setIsStatusOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isStatusOpen]);

    // Track if it's the initial scroll for this lead
    const isInitialScroll = useRef(true);

    // Reset initial scroll when lead changes
    useEffect(() => {
        isInitialScroll.current = true;
    }, [lead.id]);

    // Auto-scroll to bottom when timeline updates (with delay for rendering)
    useEffect(() => {
        if (scrollRef.current) {
            setTimeout(() => {
                if (scrollRef.current) {
                    const behavior = isInitialScroll.current ? 'auto' : 'smooth';
                    scrollRef.current.scrollTo({
                        top: scrollRef.current.scrollHeight,
                        behavior: behavior
                    });

                    if (isInitialScroll.current) {
                        isInitialScroll.current = false;
                    }
                }
            }, 100);
        }
    }, [timeline.length, isStatusOpen, lead.id]); // Added lead.id to dependencies to ensure scroll runs on new lead

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        try {
            if (editingEventId) {
                await leadService.updateTimelineEvent(lead.id, editingEventId, newNote.trim());
                setEditingEventId(null);
                setNewNote('');
                setShowToast('Note updated successfully');
                setTimeout(() => setShowToast(null), 2000);
            } else {
                await leadService.addTimelineEvent(lead.id, {
                    type: 'note',
                    content: newNote.trim(),
                    created_by: 'current-user',
                    status: 'sent'
                });
                setNewNote('');
                // Force immediate scroll for better UX
                setTimeout(() => {
                    if (scrollRef.current) {
                        scrollRef.current.scrollTo({
                            top: scrollRef.current.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                }, 50);
            }
        } catch (error) {
            console.error('Error saving note:', error);
        }
    };

    const handleUpdateNote = async (eventId: string) => {
        if (!editContent.trim()) return;
        try {
            await leadService.updateTimelineEvent(lead.id, eventId, editContent.trim());
            setEditingEventId(null);
            setEditContent('');
        } catch (error) {
            console.error('Error updating note:', error);
        }
    };

    const handleDeleteNote = async (eventId: string) => {
        try {
            const eventToDelete = timeline.find(e => e.id === eventId);

            await leadService.deleteTimelineEvent(lead.id, eventId);

            // If the deleted event was the active reminder, clear it from the lead document
            if (eventToDelete?.type === 'reminder' && lead.reminder?.date) {
                const eventDate = eventToDelete.metadata?.reminderDate;
                // If dates match (or if checking against active reminder logic)
                if (eventDate === lead.reminder.date) {
                    await clearReminder(lead.id);
                }
            }
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, event: TimelineEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            x: e.pageX,
            y: e.pageY,
            eventId: event.id,
            type: event.type as 'note' | 'reminder',
            content: event.content,
            date: event.metadata?.reminderDate ? new Date(event.metadata.reminderDate) : undefined
        });
    };


    const handleReminderSave = async (date: Date, reason: string): Promise<boolean> => {
        const success = await setReminder(lead.id, date, reason, reminderEditingId || undefined);
        if (success) {
            setShowToast('Reminder set successfully!');
            setTimeout(() => setShowToast(null), 3000);
        }
        return success;
    };

    const handleStatusChange = (status: LeadStatus) => {
        onStatusChange(lead.id, status);
        setIsStatusOpen(false);
    };

    const formatDate = (dateVal: any): string => {
        if (!dateVal) return '';
        try {
            const date = dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleString([], {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch { return ''; }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getTimelineIcon = (event: TimelineEvent) => {
        if (event.metadata?.isCompletion) return <Check size={14} strokeWidth={3} />;
        switch (event.type) {
            case 'note': return <FileText size={14} />;
            case 'reminder': return <Bell size={14} />;
            case 'status_change': return <Activity size={14} />;
            default: return <Plus size={14} />;
        }
    };

    const getTimelineColor = (event: TimelineEvent) => {
        if (event.metadata?.isCompletion) return 'bg-blue-600';
        if (event.type === 'note' && event.created_by === 'current-user') return 'bg-blue-600';
        switch (event.type) {
            case 'note': return 'bg-slate-500';
            case 'reminder': return 'bg-blue-600';
            case 'status_change': return 'bg-amber-600';
            default: return 'bg-slate-500';
        }
    };

    const getTickIcon = (status?: 'sent' | 'delivered' | 'read') => {
        if (status === 'read') return <div className="flex"><Check size={14} /><Check size={14} className="-ml-1.5" /></div>;
        return <Check size={14} />;
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[55] flex items-end md:items-center justify-center p-0 md:p-12 md:pt-16">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full md:max-w-4xl h-full md:h-[80vh] md:max-h-[800px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Premium Glossy Blue Header */}
                    <div className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #4A85FF 0%, #0044FF 100%)' }}>
                        {/* Glossy reflection */}
                        <div className="absolute inset-x-0 top-0 h-[50%] pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)' }} />
                        <div className="relative z-10 flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
                            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                                {/* Avatar */}
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-white font-bold text-base md:text-lg shadow-lg flex-shrink-0">
                                    {getInitials(lead.full_name)}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-base md:text-lg font-bold text-white truncate" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}>{lead.full_name}</h2>
                                    <div className="flex items-center gap-2 text-xs md:text-sm text-blue-100 truncate">
                                        <span className="truncate">{lead.phone_number}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
                                {!isViewer && (
                                    <>
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            ref={reminderButtonRef}
                                            onClick={() => {
                                                setReminderEditingId(null);
                                                setReminderInitialState({
                                                    date: lead.reminder?.date ? new Date(lead.reminder.date) : undefined,
                                                    reason: lead.reminder?.note
                                                });
                                                setIsReminderOpen(true);
                                            }}
                                            className={`p-2 md:p-2.5 rounded-xl transition-all ${hasReminder(lead)
                                                ? isOverdue(lead)
                                                    ? 'text-white bg-rose-500/80 hover:bg-rose-500'
                                                    : 'text-white bg-white/20 hover:bg-white/30 ring-1 ring-white/30'
                                                : 'text-white/70 hover:text-white hover:bg-white/15'
                                                }`}
                                            title="Set Reminder"
                                        >
                                            <Clock size={18} className="md:w-5 md:h-5" />
                                        </motion.button>
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={() => onEdit(lead)}
                                            className="p-2 md:p-2.5 text-white/70 hover:text-white hover:bg-white/15 rounded-xl transition-all"
                                            title="Edit"
                                        >
                                            <Edit2 size={18} className="md:w-5 md:h-5" />
                                        </motion.button>
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={() => onDelete(lead)}
                                            className="p-2 md:p-2.5 text-white/70 hover:text-rose-200 hover:bg-rose-500/30 rounded-xl transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} className="md:w-5 md:h-5" />
                                        </motion.button>

                                        <div className="w-px h-6 md:h-8 bg-white/20 mx-1 md:mx-2" />
                                    </>
                                )}

                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                    onClick={onClose}
                                    className="p-1.5 md:p-2 text-white/50 hover:text-white hover:bg-white/15 rounded-xl transition-all"
                                >
                                    <X size={20} className="md:w-[22px] md:h-[22px]" />
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    {/* Content: Sidebar + Timeline */}
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

                        {/* Left Sidebar (Mobile: Horizontal Scroll, Desktop: Vertical Fixed) */}
                        <div className="w-full md:w-[320px] border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50 flex-shrink-0">
                            <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto md:overflow-x-visible p-4 md:p-6 gap-3 md:gap-6 items-center md:items-stretch no-scrollbar">

                                {/* Status Dropdown */}
                                <div className="flex-shrink-0 min-w-[200px] md:min-w-0 md:mb-6" ref={statusRef}>
                                    <label className="hidden md:block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('status')}</label>
                                    <div className="relative">
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={() => {
                                                if (isViewer) return;
                                                if (!isStatusOpen && statusRef.current) {
                                                    const rect = statusRef.current.getBoundingClientRect();
                                                    const spaceBelow = window.innerHeight - rect.bottom;
                                                    setStatusDropdownPos(spaceBelow < 250 ? 'above' : 'below');
                                                }
                                                setIsStatusOpen(!isStatusOpen);
                                            }}
                                            disabled={isViewer}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 shadow-sm ${statusColors.color} ${isStatusOpen ? 'border-blue-400 ring-2 ring-blue-400/20 bg-white' : 'border-slate-200 hover:border-slate-300 bg-white/80'} ${isViewer ? 'opacity-90 cursor-default' : 'cursor-pointer'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${statusColors.bg.replace('100', '500')}`} />
                                                <span className="font-semibold text-xs md:text-sm">{getStatusLabel(lead.status)}</span>
                                            </div>
                                            {!isViewer && <ChevronDown size={14} className={`md:w-4 md:h-4 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />}
                                        </motion.button>

                                        <AnimatePresence>
                                            {isStatusOpen && !isViewer && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: statusDropdownPos === 'above' ? 8 : -8, scale: 0.96 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.96 }}
                                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                                    className={`absolute left-0 right-0 bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] z-[60] overflow-hidden p-2 ${statusDropdownPos === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
                                                    role="menu"
                                                    aria-label={t('change_status')}
                                                >
                                                    <div className="text-[10px] font-bold text-slate-400/80 px-3 py-2 uppercase tracking-widest text-center border-b border-slate-100 mb-1 select-none">
                                                        {t('set_lead_status') || 'Statusni O\'zgartirish'}
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        {VISIBLE_STATUSES.map((key) => {
                                                            const colors = STATUS_COLORS[key];
                                                            const isActive = key === lead.status;
                                                            return (
                                                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                                    key={key}
                                                                    role="menuitem"
                                                                    onClick={() => handleStatusChange(key)}
                                                                    className={`
                                                                        w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden
                                                                        ${isActive
                                                                            ? `${colors.bg} ring-1 ring-inset ${colors.color.replace('text-', 'ring-').replace('700', '200')}`
                                                                            : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}
                                                                    `}
                                                                >
                                                                    <div className="flex items-center gap-3 relative z-10">
                                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-white/80' : 'bg-slate-100 group-hover:bg-white group-hover:shadow-sm'
                                                                            }`}>
                                                                            <div className={`w-2.5 h-2.5 rounded-full ${colors.bg.replace('100', '500')}`} />
                                                                        </div>
                                                                        <span className={`text-sm font-bold ${isActive ? colors.color : ''}`}>
                                                                            {getStatusLabel(key)}
                                                                        </span>
                                                                    </div>

                                                                    {isActive && (
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${colors.bg.replace('100', '500')} shadow-sm relative z-10`}>
                                                                            <Check size={10} className="text-white" strokeWidth={4} />
                                                                        </div>
                                                                    )}
                                                                </motion.button>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Divider for Mobile */}
                                <div className="w-px h-8 bg-slate-200 md:hidden flex-shrink-0" />

                                {/* Lead Details Group */}
                                <div className="flex md:flex-col gap-3 md:gap-5 flex-shrink-0 items-center md:items-stretch">
                                    <div className="flex-shrink-0">
                                        <label className="hidden md:block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('phone')}</label>
                                        <a href={`tel:${lead.phone_number}`} className="flex items-center gap-2 px-3 py-2 md:p-0 bg-white md:bg-transparent border md:border-0 border-slate-200 rounded-lg text-sm font-medium text-slate-800 hover:text-blue-600 transition-colors">
                                            <Phone size={14} className="md:hidden text-slate-400" />
                                            <span className="truncate max-w-[120px] md:max-w-none">{lead.phone_number}</span>
                                            <div className="bg-slate-100 p-1 rounded-full md:hidden">
                                                <ExternalLink size={10} className="text-slate-500" />
                                            </div>
                                        </a>
                                    </div>

                                    <div className="flex-shrink-0">
                                        <label className="hidden md:block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('source_label')}</label>
                                        <span className="inline-flex items-center gap-1.5 px-3 py-2 md:py-1.5 bg-white border border-slate-300 rounded-lg text-xs md:text-sm font-bold text-slate-700 shadow-sm whitespace-nowrap">
                                            {lead.source === 'Instagram' && <span className="text-pink-500 text-base md:text-sm">📸</span>}
                                            {lead.source === 'Telegram' && <span className="text-sky-500 text-base md:text-sm">✈️</span>}
                                            {lead.source === 'Walk-in' && <span className="text-base md:text-sm">🚶</span>}
                                            {lead.source === 'Referral' && <span className="text-base md:text-sm">👥</span>}
                                            {
                                                lead.source === 'Instagram' ? (t('source_instagram') || 'Instagram') :
                                                    lead.source === 'Telegram' ? (t('source_telegram') || 'Telegram') :
                                                        lead.source === 'Walk-in' ? (t('source_walkin') || 'Walk-in') :
                                                            lead.source === 'Referral' ? (t('source_referral') || 'Referral') :
                                                                lead.source
                                            }
                                        </span>
                                    </div>

                                    {/* Created Date */}
                                    <div className="flex-shrink-0 md:pt-4 md:mt-4 md:border-t border-slate-200">
                                        <div className="flex items-center gap-2 text-slate-500 md:mb-1">
                                            <Plus size={14} strokeWidth={2.5} className="hidden md:block" />
                                            <span className="hidden md:inline text-[11px] font-bold uppercase tracking-wide">{t('lead_created')}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-2 md:p-0 bg-white md:bg-transparent border md:border-0 border-slate-200 rounded-lg text-xs md:text-sm font-bold text-slate-800 whitespace-nowrap md:pl-6">
                                            <span className="md:hidden text-slate-400 font-normal mr-1">{t('created')}:</span>
                                            {formatDate(lead.created_at)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Timeline (70%) */}
                        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                            {/* Timeline Header */}
                            <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 flex items-center gap-2 md:gap-3 flex-shrink-0 bg-white z-10 shadow-sm md:shadow-none">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #4A85FF 0%, #0044FF 100%)' }}>
                                    <Activity size={14} className="md:w-4 md:h-4 text-white" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-base md:text-lg">{t('lead_activity')}</h3>
                                <span className="text-[10px] md:text-xs font-bold text-white px-2 py-0.5 md:px-2.5 md:py-1 rounded-full" style={{ background: 'linear-gradient(180deg, #4A85FF 0%, #0044FF 100%)' }}>
                                    {timeline.length}
                                </span>
                            </div>

                            {/* Timeline Content */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6" ref={scrollRef}>
                                <div className="space-y-4 md:space-y-6 relative max-w-2xl">
                                    {/* Vertical Line */}
                                    <div className="absolute left-[15px] md:left-[19px] top-2 bottom-2 w-[2px] md:w-[3px] bg-slate-200 rounded-full" />

                                    {/* Timeline Events */}
                                    {timeline.slice((timelinePage - 1) * TIMELINE_ITEMS_PER_PAGE, timelinePage * TIMELINE_ITEMS_PER_PAGE).map((event) => (
                                        <div key={event.id} className="flex gap-3 md:gap-4 relative group">
                                            {/* Icon/Avatar */}
                                            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white z-10 shrink-0 ring-4 ring-white ${getTimelineColor(event)}`}>
                                                {React.cloneElement(getTimelineIcon(event) as any, { size: 14, className: "md:w-5 md:h-5" })}
                                            </div>

                                            <div className="flex-1 min-w-0 pb-2 md:pb-6">
                                                {/* Header: Author & Time */}
                                                <div className="flex items-center gap-2 mb-1 md:mb-1.5">
                                                    {event.created_by !== 'current-user' && (
                                                        <span className="text-xs md:text-sm font-bold text-slate-900">
                                                            {t('system') || 'Tizim'}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] md:text-[11px] font-medium text-slate-400">
                                                        {formatDate(event.created_at)}
                                                    </span>
                                                </div>

                                                {/* Content Block */}
                                                <div className={`relative group/content ${event.type === 'note' ? 'bg-slate-50/80 hover:bg-slate-50 border border-slate-300' : ''} rounded-xl md:rounded-2xl ${event.type === 'note' ? 'p-3' : ''} transition-colors`}>
                                                    {event.type === 'reminder' ? (
                                                        <div
                                                            className="bg-white border text-left border-blue-200 rounded-xl overflow-hidden relative shadow-sm hover:shadow-md transition-all w-full select-none max-w-lg group-hover/content:border-blue-300"
                                                            onContextMenu={(e) => handleContextMenu(e, event)}
                                                        >
                                                            {/* Glossy Blue Header */}
                                                            <div className="px-3 py-2 md:px-4 md:py-2.5 flex items-center justify-between border-b border-blue-100" style={{ background: 'linear-gradient(135deg, rgba(74,133,255,0.08) 0%, rgba(0,68,255,0.05) 100%)' }}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4A85FF' }} />
                                                                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide" style={{ color: '#0044FF' }}>{t('reminder') || 'Eslatma'}</span>
                                                                </div>
                                                                {!completionEventId && !event.metadata?.isCompleted && (
                                                                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setCompletionEventId(event.id);
                                                                        }}
                                                                        className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all shadow-sm group/done text-white"
                                                                        style={{ background: 'linear-gradient(180deg, #4A85FF 0%, #0044FF 100%)' }}
                                                                    >
                                                                        <Check size={12} strokeWidth={3} className="md:w-[14px] md:h-[14px] group-hover/done:scale-110 transition-transform" />
                                                                        <span>{t('complete')}</span>
                                                                    </motion.button>
                                                                )}
                                                            </div>

                                                            <div className="p-3 md:p-4">
                                                                {completionEventId === event.id ? (
                                                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                        <div className="flex items-center justify-between">
                                                                            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('remind_result')}</h4>
                                                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                                                onClick={() => {
                                                                                    setCompletionEventId(null);
                                                                                    setCompletionNote('');
                                                                                }}
                                                                                className="text-slate-400 hover:text-slate-600 transition-colors"
                                                                            >
                                                                                <X size={14} />
                                                                            </motion.button>
                                                                        </div>
                                                                        <textarea
                                                                            value={completionNote}
                                                                            onChange={(e) => {
                                                                                setCompletionNote(e.target.value);
                                                                                e.target.style.height = 'auto';
                                                                                e.target.style.height = e.target.scrollHeight + 'px';
                                                                            }}
                                                                            placeholder={t('notes_placeholder')}
                                                                            className="w-full text-sm p-3 rounded-xl border border-blue-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition-all placeholder:text-slate-400 overflow-hidden"
                                                                            rows={2}
                                                                            autoFocus
                                                                        />
                                                                        <div className="pt-2">
                                                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                                                onClick={async () => {
                                                                                    await clearReminder(lead.id, completionNote);
                                                                                    await leadService.updateTimelineEvent(lead.id, event.id, {
                                                                                        metadata: { ...event.metadata, isCompleted: true }
                                                                                    });
                                                                                    setCompletionEventId(null);
                                                                                    setCompletionNote('');
                                                                                }}
                                                                                className="w-full btn-glossy-blue !py-3.5 !text-sm !font-bold !rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                                                                            >
                                                                                {t('confirm')}
                                                                            </motion.button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col gap-2 md:gap-3">
                                                                        <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                                                                            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                                                <Calendar size={12} className="md:w-[13px] md:h-[13px]" />
                                                                                <span className="font-medium">
                                                                                    {event.metadata?.reminderDate
                                                                                        ? format(new Date(event.metadata.reminderDate), 'd MMM, yyyy')
                                                                                        : 'No Date'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                                                <Clock size={12} className="md:w-[13px] md:h-[13px]" />
                                                                                <span className="font-medium">
                                                                                    {event.metadata?.reminderDate
                                                                                        ? format(new Date(event.metadata.reminderDate), 'HH:mm')
                                                                                        : '--:--'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-slate-800 text-sm md:text-base font-medium leading-relaxed">
                                                                            {event.metadata?.reason || event.content.split(': ').pop()}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onContextMenu={(e) => handleContextMenu(e, event)}
                                                            className={`text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap text-slate-700 ${event.metadata?.isCompletion ? 'italic text-slate-500' : ''}`}
                                                        >
                                                            {event.content}
                                                        </div>
                                                    )}

                                                    {/* Status Ticks for User Notes */}
                                                    {event.type === 'note' && event.created_by === 'current-user' && (
                                                        <div className="absolute bottom-2 right-2 opacity-100 md:opacity-0 md:group-hover/content:opacity-100 transition-opacity">
                                                            <span className={event.status === 'read' ? 'text-blue-500' : 'text-slate-300'}>
                                                                {React.cloneElement(getTickIcon(event.status || 'read') as any, { size: 14, className: "md:w-4 md:h-4" })}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {Math.ceil(timeline.length / Math.max(1, TIMELINE_ITEMS_PER_PAGE)) > 1 && (
                                    <Pagination
                                        currentPage={timelinePage}
                                        totalPages={Math.ceil(timeline.length / Math.max(1, TIMELINE_ITEMS_PER_PAGE))}
                                        onPageChange={setTimelinePage}
                                    />
                                )}
                            </div>

                            {/* Add Note Input - Sticky at Bottom */}
                            {!isViewer && (
                                <div className="bg-white border-t border-slate-100 sticky bottom-0 z-20 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                                    {editingEventId && (
                                        <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-blue-100 animate-in slide-in-from-bottom-2">
                                            <div className="flex items-center gap-2 text-blue-700">
                                                <Edit2 size={14} />
                                                <span className="text-xs font-bold uppercase tracking-wide">Editing message...</span>
                                            </div>
                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                onClick={() => {
                                                    setEditingEventId(null);
                                                    setNewNote('');
                                                }}
                                                className="p-1 hover:bg-blue-100 rounded-full text-blue-600 transition-colors"
                                            >
                                                <X size={16} />
                                            </motion.button>
                                        </div>
                                    )}
                                    <div className="p-3 md:p-4 pb-6 md:pb-4">
                                        <form onSubmit={handleAddNote} className="flex gap-2 md:gap-3 items-end">
                                            <textarea
                                                ref={textareaRef}
                                                value={newNote}
                                                onChange={(e) => {
                                                    setNewNote(e.target.value);
                                                    e.target.style.height = 'auto';
                                                    const newHeight = Math.min(e.target.scrollHeight, 150);
                                                    e.target.style.height = newHeight + 'px';
                                                    e.target.style.overflowY = e.target.scrollHeight > 150 ? 'auto' : 'hidden';
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        if (newNote.trim()) {
                                                            handleAddNote(e as unknown as React.FormEvent);
                                                        }
                                                    }
                                                }}
                                                placeholder={editingEventId ? "Edit note..." : t('add_note_placeholder')}
                                                rows={1}
                                                className={`flex-1 px-4 py-3 bg-slate-50 border-0 rounded-2xl text-slate-800 text-sm focus:bg-white focus:ring-2 transition-all resize-none min-h-[48px] max-h-[150px] placeholder:text-slate-400 font-medium ${editingEventId ? 'focus:ring-emerald-500/20' : 'focus:ring-blue-500/20'}`}
                                                style={{ height: '48px', overflowY: 'hidden' }}
                                            />
                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                type="submit"
                                                disabled={!newNote.trim()}
                                                className={`w-12 h-12 md:w-auto md:h-[48px] md:px-6 flex items-center justify-center text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 ${editingEventId ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95'}`}
                                            >
                                                {editingEventId ? <Check size={20} strokeWidth={2.5} /> : <Send size={20} strokeWidth={2.5} className="ml-0.5 md:ml-0" />}
                                            </motion.button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Context Menu */}
                    <AnimatePresence>
                        {contextMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                style={{ top: contextMenu.y, left: contextMenu.x }}
                                className="fixed z-[60] bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 min-w-[220px] flex flex-col gap-0.5"
                            >
                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                    onClick={() => {
                                        if (contextMenu.content) {
                                            navigator.clipboard.writeText(contextMenu.content);
                                            setShowToast('Copied to clipboard');
                                            setTimeout(() => setShowToast(null), 2000);
                                        }
                                        setContextMenu(null);
                                    }}
                                    className="flex items-center gap-3 px-3 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors w-full text-left"
                                >
                                    <Copy size={18} className="text-slate-400" />
                                    {t('copy') || 'Copy'}
                                </motion.button>

                                {!isViewer && (
                                    <>
                                        <div className="my-1.5 h-px bg-slate-100 w-full" />

                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={() => {
                                                if (contextMenu.type === 'reminder') {
                                                    setReminderEditingId(contextMenu.eventId);
                                                    setReminderInitialState({
                                                        date: contextMenu.date,
                                                        reason: contextMenu.content?.split(': ').pop()
                                                    });
                                                    setIsReminderOpen(true);
                                                } else {
                                                    setEditingEventId(contextMenu.eventId);
                                                    setNewNote(contextMenu.content || '');
                                                    setTimeout(() => {
                                                        textareaRef.current?.focus();
                                                        // Move cursor to end
                                                        if (textareaRef.current) {
                                                            textareaRef.current.selectionStart = textareaRef.current.value.length;
                                                            textareaRef.current.selectionEnd = textareaRef.current.value.length;
                                                        }
                                                    }, 50);
                                                }
                                                setContextMenu(null);
                                            }} // Context Menu Edit Button Logic Updated
                                            className="flex items-center gap-3 px-3 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors w-full text-left"
                                        >
                                            <Edit2 size={18} className="text-slate-400" />
                                            {t('edit') || 'Edit'}
                                        </motion.button>
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={() => {
                                                if (contextMenu.eventId) {
                                                    setDeleteModalEventId(contextMenu.eventId);
                                                }
                                                setContextMenu(null);
                                            }}
                                            className="flex items-center gap-3 px-3 py-2.5 text-[15px] font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full text-left"
                                        >
                                            {t('delete') || 'Delete'}
                                        </motion.button>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Reminder Popover */}
                    {isReminderOpen && (
                        <ReminderPopover
                            isOpen={isReminderOpen}
                            onClose={() => {
                                setIsReminderOpen(false);
                                setReminderEditingId(null);
                                setReminderInitialState({});
                            }}
                            onSave={handleReminderSave}
                            anchorRef={reminderButtonRef}
                            initialDate={reminderInitialState.date}
                            initialReason={reminderInitialState.reason}
                        />
                    )}

                    {/* Toast Notification */}
                    <AnimatePresence>
                        {showToast && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg shadow-lg flex items-center gap-2"
                            >
                                <Check size={16} className="text-green-400" />
                                {showToast}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
                <DeleteModal
                    isOpen={!!deleteModalEventId}
                    onClose={() => setDeleteModalEventId(null)}
                    onConfirm={() => {
                        if (deleteModalEventId) {
                            handleDeleteNote(deleteModalEventId);
                        }
                        setDeleteModalEventId(null);
                    }}
                    title={t('delete_modal_headline')}
                />
            </div >
        </Portal >
    );
};

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
import fireAnimation from '../../assets/images/fire.json';
import { motion, AnimatePresence } from 'framer-motion';
import { Lead, LeadStatus, TimelineEvent } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { leadService } from '../../services/leadService';
import { Portal } from '../../components/ui/Portal';
import { ReminderPopover } from './ReminderPopover';
import { useReminder } from '../../hooks/useReminder';

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
}

export const LeadDetail: React.FC<LeadDetailProps> = ({
    lead, onClose, onEdit, onDelete, onStatusChange
}) => {
    const { t, language } = useLanguage();
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isLoadingTimeline, setIsLoadingTimeline] = useState(true);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isReminderOpen, setIsReminderOpen] = useState(false);
    const [showToast, setShowToast] = useState<string | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [reminderInitialState, setReminderInitialState] = useState<{ date?: Date, reason?: string }>({});
    const [reminderEditingId, setReminderEditingId] = useState<string | null>(null);
    const [completionEventId, setCompletionEventId] = useState<string | null>(null); // Changed from boolean to ID
    const [completionNote, setCompletionNote] = useState('');

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, eventId: string, type: 'note' | 'reminder', content?: string, date?: Date } | null>(null);

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
            await leadService.deleteTimelineEvent(lead.id, eventId);
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
        if (event.metadata?.isCompletion) return 'bg-blue-600'; // Changed from emerald-500 to blue-600
        if (event.type === 'note' && event.created_by === 'current-user') return 'bg-blue-600'; // Sent details
        switch (event.type) {
            case 'note': return 'bg-slate-500'; // Received/Other details
            case 'reminder': return 'bg-purple-600';
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
            <div className="fixed inset-0 z-[55] flex items-center justify-center p-6 md:p-12 pt-16 md:pt-16">
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
                    layoutId={`lead-card-${lead.id}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-4xl h-[80vh] max-h-[800px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Sticky Action Bar */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                                {getInitials(lead.full_name)}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">{lead.full_name}</h2>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span>{lead.phone_number}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                            <button
                                ref={reminderButtonRef}
                                onClick={() => {
                                    setReminderEditingId(null);
                                    setReminderInitialState({
                                        date: lead.reminder?.date ? new Date(lead.reminder.date) : undefined,
                                        reason: lead.reminder?.note
                                    });
                                    setIsReminderOpen(true);
                                }}
                                className={`p-2.5 rounded-lg transition-colors ${hasReminder(lead)
                                    ? isOverdue(lead)
                                        ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                        : 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                                    : 'text-slate-500 hover:text-purple-600 hover:bg-purple-50'
                                    }`}
                                title="Set Reminder"
                            >
                                <Clock size={20} />
                            </button>
                            <button
                                onClick={() => onEdit(lead)}
                                className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit"
                            >
                                <Edit2 size={20} />
                            </button>
                            <button
                                onClick={() => onDelete(lead)}
                                className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={20} />
                            </button>

                            <div className="w-px h-8 bg-slate-200 mx-2" />

                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={22} />
                            </button>
                        </div>
                    </div>

                    {/* Content: Sidebar + Timeline */}
                    <div className="flex-1 flex overflow-hidden">

                        {/* Left Sidebar (30%) */}
                        <div className="w-[320px] border-r border-slate-100 p-6 overflow-y-auto bg-slate-50/50">

                            {/* Status Dropdown */}
                            <div className="mb-6" ref={statusRef}>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('status')}</label>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsStatusOpen(!isStatusOpen)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-colors shadow-sm ${statusColors.color} ${isStatusOpen ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-300 hover:border-slate-400'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${statusColors.bg.replace('100', '500')}`} />
                                            <span className="font-semibold text-sm">{getStatusLabel(lead.status)}</span>
                                        </div>
                                        <ChevronDown size={16} className={`transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isStatusOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-xl z-20 overflow-hidden"
                                            >
                                                {VISIBLE_STATUSES.map((key) => {
                                                    const colors = STATUS_COLORS[key];
                                                    return (
                                                        <button
                                                            key={key}
                                                            onClick={() => handleStatusChange(key)}
                                                            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors ${key === lead.status ? 'bg-slate-100' : ''} ${colors.color}`}
                                                        >
                                                            <div className={`w-2 h-2 rounded-full ${colors.bg.replace('100', '500')}`} />
                                                            <span>{getStatusLabel(key)}</span>
                                                            {key === lead.status && <Check size={14} className="ml-auto" />}
                                                        </button>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Lead Details */}
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('phone')}</label>
                                    <a href={`tel:${lead.phone_number}`} className="text-sm font-medium text-slate-800 hover:text-blue-600 flex items-center gap-1">
                                        {lead.phone_number}
                                        <ExternalLink size={12} className="text-slate-400" />
                                    </a>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('source_label')}</label>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 shadow-sm">
                                        {lead.source === 'Instagram' && <span className="text-pink-500">📸</span>}
                                        {lead.source === 'Telegram' && <span className="text-sky-500">✈️</span>}
                                        {lead.source === 'Walk-in' && <span>🚶</span>}
                                        {lead.source === 'Referral' && <span>👥</span>}
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
                                <div className="pt-4 mt-4 border-t border-slate-200">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Plus size={14} strokeWidth={2.5} />
                                        <span className="text-[11px] font-bold uppercase tracking-wide">{t('lead_created')}</span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-800 mt-1 pl-6">
                                        {formatDate(lead.created_at)}
                                    </div>
                                </div>

                                {/* Active Reminder - REMOVED */}
                                {/* {hasReminder(lead) && lead.reminder && ( ... )} */}
                            </div>
                        </div>

                        {/* Right Timeline (70%) */}
                        <div className="flex-1 flex flex-col bg-white">
                            {/* Timeline Header */}
                            <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3">
                                <Activity size={20} className="text-slate-500" />
                                <h3 className="font-bold text-slate-900 text-lg">{t('lead_activity')}</h3>
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                                    {timeline.length + 1}
                                </span>
                            </div>

                            {/* Timeline Content */}
                            <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
                                <div className="space-y-4 relative max-w-2xl">
                                    {/* Vertical Line */}
                                    <div className="absolute left-[15px] top-2 bottom-2 w-[3px] bg-slate-200 rounded-full" />

                                    {/* Timeline Events */}
                                    {timeline.map((event) => (
                                        <div key={event.id} className="flex gap-4 relative group">
                                            {/* Icon/Avatar */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white z-10 shrink-0 ring-4 ring-white ${getTimelineColor(event)}`}>
                                                {getTimelineIcon(event)}
                                            </div>

                                            <div className="flex-1 min-w-0 pb-6">
                                                {/* Header: Author & Time */}
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    {event.created_by !== 'current-user' && (
                                                        <span className="text-sm font-bold text-slate-900">
                                                            {t('system') || 'Tizim'}
                                                        </span>
                                                    )}
                                                    <span className="text-[11px] font-medium text-slate-400">
                                                        {formatDate(event.created_at)}
                                                    </span>
                                                </div>

                                                {/* Content Block */}
                                                <div className={`relative group/content ${event.type === 'note' ? 'bg-slate-50/80 hover:bg-slate-50 border border-slate-300' : ''} rounded-2xl ${event.type === 'note' ? 'p-3' : ''} transition-colors`}>
                                                    {event.type === 'reminder' ? (
                                                        <div
                                                            className="bg-white border text-left border-purple-300 rounded-xl overflow-hidden relative shadow-sm hover:shadow-md transition-all w-full select-none max-w-lg group-hover/content:border-purple-400"
                                                            onContextMenu={(e) => handleContextMenu(e, event)}
                                                        >
                                                            {/* Minimal Header */}
                                                            <div className="px-4 py-2.5 flex items-center justify-between bg-purple-50/50 border-b border-purple-100">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                                                    <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Eslatma</span>
                                                                </div>
                                                                {!completionEventId && !event.metadata?.isCompleted && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setCompletionEventId(event.id);
                                                                        }}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100/80 text-purple-700 hover:bg-purple-200 rounded-lg text-xs font-bold transition-all shadow-sm shadow-purple-200/50 group/done"
                                                                    >
                                                                        <Check size={14} strokeWidth={3} className="group-hover/done:scale-110 transition-transform" />
                                                                        <span>{t('complete')}</span>
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="p-4">
                                                                {completionEventId === event.id ? (
                                                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                        <div className="flex items-center justify-between">
                                                                            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('remind_result')}</h4>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setCompletionEventId(null);
                                                                                    setCompletionNote('');
                                                                                }}
                                                                                className="text-slate-400 hover:text-slate-600 transition-colors"
                                                                            >
                                                                                <X size={14} />
                                                                            </button>
                                                                        </div>
                                                                        <textarea
                                                                            value={completionNote}
                                                                            onChange={(e) => {
                                                                                setCompletionNote(e.target.value);
                                                                                e.target.style.height = 'auto';
                                                                                e.target.style.height = e.target.scrollHeight + 'px';
                                                                            }}
                                                                            placeholder={t('notes_placeholder')}
                                                                            className="w-full text-sm p-3 rounded-xl border border-purple-200 bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none transition-all placeholder:text-slate-400 overflow-hidden"
                                                                            rows={2}
                                                                            autoFocus
                                                                        />
                                                                        <div className="flex items-center justify-end">
                                                                            <button
                                                                                onClick={async () => {
                                                                                    await clearReminder(lead.id, completionNote);
                                                                                    await leadService.updateTimelineEvent(lead.id, event.id, {
                                                                                        metadata: { ...event.metadata, isCompleted: true }
                                                                                    });
                                                                                    setCompletionEventId(null);
                                                                                    setCompletionNote('');
                                                                                }}
                                                                                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-all"
                                                                            >
                                                                                {t('confirm')}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col gap-3">
                                                                        <div className="flex flex-wrap gap-2 text-sm">
                                                                            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                                                <Calendar size={13} />
                                                                                <span className="font-medium">
                                                                                    {event.metadata?.reminderDate
                                                                                        ? format(new Date(event.metadata.reminderDate), 'd MMM, yyyy')
                                                                                        : 'No Date'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                                                <Clock size={13} />
                                                                                <span className="font-medium">
                                                                                    {event.metadata?.reminderDate
                                                                                        ? format(new Date(event.metadata.reminderDate), 'HH:mm')
                                                                                        : '--:--'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-slate-800 font-medium leading-relaxed">
                                                                            {event.metadata?.reason || event.content.split(': ').pop()}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onContextMenu={(e) => handleContextMenu(e, event)}
                                                            className={`text-[15px] leading-relaxed whitespace-pre-wrap text-slate-700 ${event.metadata?.isCompletion ? 'italic text-slate-500' : ''}`}
                                                        >
                                                            {event.content}
                                                        </div>
                                                    )}

                                                    {/* Status Ticks for User Notes */}
                                                    {event.type === 'note' && event.created_by === 'current-user' && (
                                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover/content:opacity-100 transition-opacity">
                                                            <span className={event.status === 'read' ? 'text-blue-500' : 'text-slate-300'}>
                                                                {getTickIcon(event.status || 'read')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Add Note Input */}
                            <div className="bg-white border-t border-slate-100">
                                {editingEventId && (
                                    <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-blue-100 animate-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-2 text-blue-700">
                                            <Edit2 size={14} />
                                            <span className="text-xs font-bold uppercase tracking-wide">Editing message...</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingEventId(null);
                                                setNewNote('');
                                            }}
                                            className="p-1 hover:bg-blue-100 rounded-full text-blue-600 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                                <div className="p-4">
                                    <form onSubmit={handleAddNote} className="flex gap-3 items-end">
                                        <textarea
                                            ref={textareaRef}
                                            value={newNote}
                                            onChange={(e) => {
                                                setNewNote(e.target.value);
                                                // Auto-resize up to max, then scroll
                                                e.target.style.height = 'auto';
                                                const newHeight = Math.min(e.target.scrollHeight, 150);
                                                e.target.style.height = newHeight + 'px';
                                                // Enable scroll when at max height
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
                                            className={`flex-1 px-4 py-3 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none min-h-[48px] max-h-[150px] placeholder:text-slate-500 font-medium ${editingEventId ? 'border-blue-500 focus:ring-blue-500/20 shadow-sm' : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500'}`}
                                            style={{ height: '48px', overflowY: 'hidden' }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newNote.trim()}
                                            className={`px-5 py-3 text-white rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 h-[48px] flex items-center justify-center ${editingEventId ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20' : 'btn-premium-blue'}`}
                                        >
                                            {editingEventId ? <Check size={18} /> : <Send size={18} />}
                                        </button>
                                    </form>
                                </div>
                            </div>
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
                                <button
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
                                </button>

                                <div className="my-1.5 h-px bg-slate-100 w-full" />

                                <button
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
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm('Delete this item?')) {
                                            handleDeleteNote(contextMenu.eventId);
                                        }
                                        setContextMenu(null);
                                    }}
                                    className="flex items-center gap-3 px-3 py-2.5 text-[15px] font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full text-left"
                                >
                                    <Trash2 size={18} />
                                    {t('delete') || 'Delete'}
                                </button>
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
            </div >
        </Portal >
    );
};

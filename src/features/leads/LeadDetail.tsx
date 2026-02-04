import React, { useState, useEffect, useRef } from 'react';
import {
    X, Phone, MessageCircle, Clock, Edit2, Trash2,
    Send, Plus, User, Activity, FileText, Bell, Check,
    ChevronDown, AlertCircle, ExternalLink, Calendar
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
    const [isCompletionMode, setIsCompletionMode] = useState(false);
    const [completionNote, setCompletionNote] = useState('');

    const scrollRef = useRef<HTMLDivElement>(null);
    const reminderButtonRef = useRef<HTMLButtonElement>(null);
    const statusRef = useRef<HTMLDivElement>(null);

    const { setReminder, clearReminder, isOverdue, hasReminder } = useReminder();

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
            setTimeline(events);
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

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        try {
            await leadService.addTimelineEvent(lead.id, {
                type: 'note',
                content: newNote.trim(),
                created_by: 'current-user',
            });
            setNewNote('');
        } catch (error) {
            console.error('Error adding note:', error);
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
        if (event.metadata?.isCompletion) return 'bg-emerald-500';
        switch (event.type) {
            case 'note': return 'bg-blue-600';
            case 'reminder': return 'bg-purple-600';
            case 'status_change': return 'bg-amber-600';
            default: return 'bg-slate-500';
        }
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
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors shadow-sm ${statusColors.color} ${isStatusOpen ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-300 hover:border-slate-400'}`}
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

                                {/* Active Reminder */}
                                {hasReminder(lead) && lead.reminder && (
                                    <div className={`relative overflow-hidden rounded-xl border-2 group ${isOverdue(lead) ? 'bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 border-red-300' : 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200'}`}>
                                        {/* Animated pulse for overdue */}
                                        {/* Fire Animation for overdue */}
                                        {isOverdue(lead) && (
                                            <div className="absolute -top-7 -right-7 w-24 h-24 pointer-events-none opacity-90 z-10">
                                                <Lottie animationData={fireAnimation} loop={true} />
                                            </div>
                                        )}

                                        <div className="relative p-4">
                                            {isCompletionMode ? (
                                                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Completion Note</h4>
                                                        <button
                                                            onClick={() => setIsCompletionMode(false)}
                                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        value={completionNote}
                                                        onChange={(e) => setCompletionNote(e.target.value)}
                                                        placeholder="What was the outcome? (e.g. Talked to patient...)"
                                                        className="w-full text-sm p-3 rounded-xl border border-purple-200 bg-white/80 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none transition-all placeholder:text-slate-400"
                                                        rows={2}
                                                        autoFocus
                                                    />
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                await clearReminder(lead.id, completionNote);
                                                                setIsCompletionMode(false);
                                                                setCompletionNote('');
                                                                window.location.reload();
                                                            }}
                                                            className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                                                        >
                                                            <Check size={14} strokeWidth={3} />
                                                            Complete Task
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`p-2 rounded-lg ${isOverdue(lead) ? 'bg-red-100' : 'bg-purple-100'}`}>
                                                                <Bell size={16} className={isOverdue(lead) ? 'text-red-600' : 'text-purple-600'} />
                                                            </div>
                                                            <div>
                                                                <span className={`text-xs font-bold uppercase tracking-wide ${isOverdue(lead) ? 'text-red-600' : 'text-purple-600'}`}>
                                                                    {isOverdue(lead) ? t('overdue_reminder') : t('upcoming_reminder')}
                                                                </span>
                                                                {isOverdue(lead) && (
                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                        <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                                                        <span className="text-[10px] text-red-500 font-medium">
                                                                            {t('overdue_reminder')}!
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {/* Dismiss Button */}
                                                        <div className="flex items-center gap-1">
                                                            {/* Done Button */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setIsCompletionMode(true);
                                                                }}
                                                                className={`p-1.5 rounded-lg transition-all shadow-sm ${isOverdue(lead)
                                                                    ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-200'
                                                                    : 'bg-white hover:bg-purple-50 text-purple-700 border border-purple-200'
                                                                    }`}
                                                            >
                                                                <Check size={16} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className={`flex items-center gap-3 mt-3 ${isOverdue(lead) ? 'text-red-900' : 'text-purple-900'}`}>
                                                        <div className="text-lg font-bold">
                                                            {new Date(lead.reminder.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </div>
                                                        <div className={`px-2 py-1 rounded-md text-sm font-bold ${isOverdue(lead) ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                                                            {new Date(lead.reminder.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>

                                                    {lead.reminder.note && (
                                                        <div className={`text-sm mt-3 p-2 rounded-lg ${isOverdue(lead) ? 'bg-red-100/50 text-red-700' : 'bg-purple-100/50 text-purple-700'}`}>
                                                            {lead.reminder.note}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
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
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white z-10 shrink-0 ${getTimelineColor(event)}`}>
                                                {getTimelineIcon(event)}
                                            </div>
                                            <div className="flex-1 pt-0.5">
                                                {editingEventId === event.id ? (
                                                    <div className="bg-white border-2 border-blue-500 rounded-xl p-4 shadow-lg ring-4 ring-blue-500/10">
                                                        <textarea
                                                            value={editContent}
                                                            onChange={(e) => {
                                                                setEditContent(e.target.value);
                                                                e.target.style.height = 'auto';
                                                                e.target.style.height = e.target.scrollHeight + 'px';
                                                            }}
                                                            className="w-full text-base font-medium text-slate-900 focus:outline-none resize-none bg-transparent placeholder:text-slate-400"
                                                            rows={1}
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleUpdateNote(event.id);
                                                                }
                                                                if (e.key === 'Escape') {
                                                                    setEditingEventId(null);
                                                                }
                                                            }}
                                                        />
                                                        <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-100">
                                                            <button
                                                                onClick={() => setEditingEventId(null)}
                                                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors uppercase tracking-wide"
                                                            >
                                                                {t('cancel') || 'Cancel'}
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateNote(event.id)}
                                                                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors uppercase tracking-wide shadow-sm"
                                                            >
                                                                {t('save') || 'Save'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : event.type === 'reminder' ? (
                                                    <div className="bg-purple-50 border border-purple-200 rounded-xl overflow-hidden relative group-hover:shadow-md transition-all">
                                                        {/* Header */}
                                                        <div className="bg-purple-100/50 px-4 py-2 flex items-center gap-2 border-b border-purple-100">
                                                            <Bell size={14} className="text-purple-600" />
                                                            <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Eslatma</span>
                                                        </div>

                                                        <div className="p-4">
                                                            {/* Date & Time */}
                                                            <div className="flex items-center gap-4 mb-3">
                                                                <div className="flex items-center gap-2 text-purple-900 bg-white px-3 py-1.5 rounded-lg border border-purple-100 shadow-sm">
                                                                    <Calendar size={15} className="text-purple-500" />
                                                                    <span className="font-bold text-sm">
                                                                        {event.metadata?.reminderDate
                                                                            ? format(new Date(event.metadata.reminderDate), 'd MMMM, yyyy', { locale: language === 'uz' ? uz : language === 'ru' ? ru : undefined })
                                                                            : 'Set Date'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-purple-900 bg-white px-3 py-1.5 rounded-lg border border-purple-100 shadow-sm">
                                                                    <Clock size={15} className="text-purple-500" />
                                                                    <span className="font-bold text-sm">
                                                                        {event.metadata?.reminderDate
                                                                            ? format(new Date(event.metadata.reminderDate), 'HH:mm')
                                                                            : 'Time'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Reason */}
                                                            <div className="text-slate-700 text-sm font-medium leading-relaxed">
                                                                {event.metadata?.reason || event.content.split(': ').pop()}
                                                            </div>

                                                            {/* Edit & Delete Buttons */}
                                                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-purple-100 shadow-sm">
                                                                <button
                                                                    onClick={() => {
                                                                        const initialDate = event.metadata?.reminderDate ? new Date(event.metadata.reminderDate) : undefined;
                                                                        const initialReason = event.metadata?.reason || event.content.split(': ').pop();
                                                                        setReminderEditingId(event.id);
                                                                        setReminderInitialState({
                                                                            date: initialDate,
                                                                            reason: initialReason
                                                                        });
                                                                        setIsReminderOpen(true);
                                                                    }}
                                                                    className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                                                                    title="Edit Reminder"
                                                                >
                                                                    <Edit2 size={14} strokeWidth={2.5} />
                                                                </button>

                                                                <div className="w-px h-4 bg-purple-200 mx-0.5" />

                                                                <button
                                                                    onClick={() => {
                                                                        if (window.confirm('Eslatmani o\'chirmoqchimisiz?')) {
                                                                            handleDeleteNote(event.id);
                                                                        }
                                                                    }}
                                                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                    title="Delete Reminder"
                                                                >
                                                                    <Trash2 size={14} strokeWidth={2.5} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={`border rounded-xl p-5 transition-all duration-200 relative group-hover:shadow-md ${event.metadata?.isCompletion
                                                        ? 'bg-emerald-50/50 border-emerald-200'
                                                        : 'bg-white border-slate-300 hover:border-slate-400'
                                                        }`}>
                                                        <div className="text-[15px] font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">{event.content}</div>

                                                        {/* Actions (Edit/Delete) - Visible on Hover */}
                                                        {event.type === 'note' && (
                                                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-slate-200 shadow-sm">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingEventId(event.id);
                                                                        setEditContent(event.content);
                                                                    }}
                                                                    className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Edit2 size={14} strokeWidth={2.5} />
                                                                </button>
                                                                <div className="w-px h-4 bg-slate-300 mx-0.5" />
                                                                <button
                                                                    onClick={() => {
                                                                        if (window.confirm('Delete this note?')) {
                                                                            handleDeleteNote(event.id);
                                                                        }
                                                                    }}
                                                                    className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={14} strokeWidth={2.5} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="text-xs font-semibold text-slate-500 mt-2 pl-2">{formatDate(event.created_at)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Add Note Input */}
                            <div className="p-4 border-t border-slate-100 bg-white">
                                <form onSubmit={handleAddNote} className="flex gap-3 items-end">
                                    <textarea
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
                                        placeholder={t('add_note_placeholder')}
                                        rows={1}
                                        className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none min-h-[48px] max-h-[150px] placeholder:text-slate-500 font-medium"
                                        style={{ height: '48px', overflowY: 'hidden' }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newNote.trim()}
                                        className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 h-[48px]"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Reminder Popover */}
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

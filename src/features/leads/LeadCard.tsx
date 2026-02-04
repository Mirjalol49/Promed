
import React from 'react';
import { Lead, LeadStatus } from '../../types';
import { leadService } from '../../services/leadService';
import {
    Instagram,
    Send,
    User,
    Users,
    AlertTriangle,
    Phone,
    ArrowRightCircle,
    MoreHorizontal,
    Sparkles,
    Banknote,
    Stethoscope,
    Archive,
    ChevronDown,
    Check,
    Pencil,
    Trash,
    Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { Portal } from '../../components/ui/Portal';
import Lottie from 'lottie-react';
import fireAnimation from '../../assets/images/fire.json';

interface LeadCardProps {
    lead: Lead;
    onStatusChange: (id: string, newStatus: LeadStatus) => void;
    onEdit: (lead: Lead) => void;
    onDelete: (lead: Lead) => void;
    onRemind: (lead: Lead) => void;
    onSelect: (lead: Lead) => void;
    layoutId?: string;
}

const SourceIcon = ({ source }: { source: Lead['source'] }) => {
    switch (source) {
        case 'Instagram': return <Instagram size={14} className="" />;
        case 'Telegram': return <Send size={14} className="" />;
        case 'Walk-in': return <User size={14} className="" />;
        case 'Referral': return <Users size={14} className="" />;
        default: return <User size={14} className="" />;
    }
};



const COL_COLORS: Record<LeadStatus, string> = {
    'NEW': 'blue',
    'CONTACTED': 'orange',
    'PHOTOS_SENT': 'purple',
    'PRICE_GIVEN': 'orange',
    'BOOKED': 'emerald',
    'LOST': 'red'
};

const COL_ICONS: Record<LeadStatus, React.ElementType> = {
    'NEW': Sparkles,
    'CONTACTED': Phone,
    'PHOTOS_SENT': Send,
    'PRICE_GIVEN': Banknote,
    'BOOKED': Stethoscope,
    'LOST': Archive
};

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onStatusChange, onEdit, onDelete, onRemind, onSelect, layoutId }) => {
    const { t } = useLanguage();
    const isStale = leadService.checkStale(lead);

    // Check if reminder is overdue
    const isReminderOverdue = (): boolean => {
        if (!lead.reminder?.date) return false;
        try {
            return new Date(lead.reminder.date) < new Date();
        } catch { return false; }
    };
    const hasActiveReminder = !!lead.reminder?.date;

    const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
        { value: 'NEW', label: t('status_new') },
        { value: 'CONTACTED', label: t('status_contacted') },
        { value: 'BOOKED', label: t('status_booked') },
        { value: 'LOST', label: t('status_lost') },
    ];

    // Portal Dropdown State
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const [dropdownPos, setDropdownPos] = React.useState({ top: 0, left: 0, width: 200 });
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    // Close on resize/scroll to avoid floating dropdowns detached from button
    React.useEffect(() => {
        const handleResize = () => setIsDropdownOpen(false);
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true); // Capture phase to catch all scrolls
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
        };
    }, []);

    const toggleDropdown = () => {
        if (!isDropdownOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Align right edge of dropdown with right edge of button
            // Dropdown width is fixed at approx 200px (w-48 is 192px)
            const width = 200;
            setDropdownPos({
                top: rect.bottom + 8, // 8px gap
                left: rect.right - width,
                width: width
            });
            setIsDropdownOpen(true);
        } else {
            setIsDropdownOpen(false);
        }
    };

    const handleStatusClick = (newStatus: LeadStatus) => {
        if (newStatus !== lead.status) {
            onStatusChange(lead.id, newStatus);
        }
        setIsDropdownOpen(false);
    };

    const StatusIcon = COL_ICONS[lead.status] || User;
    const statusColor = COL_COLORS[lead.status] || 'slate';

    const getBackground = (color: string) => {
        switch (color) {
            case 'blue': return 'bg-blue-200 border-transparent shadow-custom hover:scale-[1.02] active:scale-[0.98]';
            case 'orange': return 'bg-orange-200 border-transparent shadow-custom hover:scale-[1.02] active:scale-[0.98]';
            case 'purple': return 'bg-purple-200 border-transparent shadow-custom hover:scale-[1.02] active:scale-[0.98]';
            case 'emerald': return 'bg-emerald-200 border-transparent shadow-custom hover:scale-[1.02] active:scale-[0.98]';
            case 'red': return 'bg-red-200 border-transparent shadow-custom hover:scale-[1.02] active:scale-[0.98]';
            default: return 'bg-white border-slate-100 shadow-sm text-slate-900';
        }
    };

    const getIconColor = (color: string) => {
        switch (color) {
            case 'blue': return 'text-blue-600';
            case 'orange': return 'text-orange-600';
            case 'purple': return 'text-purple-600';
            case 'emerald': return 'text-emerald-600';
            case 'red': return 'text-red-600';
            default: return 'text-slate-600';
        }
    };

    const iconBaseColor = getIconColor(statusColor);

    const getSourceLabel = (source: string) => {
        switch (source) {
            case 'Walk-in': return t('source_walkin');
            case 'Referral': return t('source_referral');
            default: return source;
        }
    };

    return (
        <motion.div
            layoutId={layoutId} // Shared layout ID for seamless expansion
            onClick={() => onSelect(lead)}
            className={`
            ${getBackground(statusColor)} p-5 rounded-3xl border transition-all mb-3 relative group cursor-pointer
            ${isStale ? '!border-red-500 !ring-1 !ring-red-500' : ''}
            ${isReminderOverdue() ? '!border-red-400 !ring-2 !ring-red-200' : ''}
        `}>

            {/* Overdue Reminder Indicator */}
            {isReminderOverdue() && (
                <div className="absolute -top-2 -right-2 z-20">
                    <div className="relative">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                        <div className="relative bg-red-500 text-white p-1.5 rounded-full shadow-lg">
                            <Clock size={12} />
                        </div>
                    </div>
                </div>
            )}

            {/* Upcoming Reminder Indicator (non-overdue) */}
            {hasActiveReminder && !isReminderOverdue() && (
                <div className="absolute -top-1.5 -right-1.5 z-20 bg-purple-500 text-white p-1 rounded-full shadow-sm">
                    <Clock size={10} />
                </div>
            )}


            {/* Header */}
            <div className="flex justify-between items-start mb-1.5">
                <div className="min-w-0 flex-1 pr-2">
                    <h4 className="font-bold text-[15px] text-slate-900 leading-tight truncate">{lead.full_name}</h4>
                    <div className="flex flex-col gap-2 mt-2.5 text-xs text-slate-500 font-medium opacity-90">
                        <div className="flex items-center gap-1.5">
                            <SourceIcon source={lead.source} />
                            <span>{getSourceLabel(lead.source)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Phone size={12} />
                            <span className="tabular-nums tracking-tight">{lead.phone_number}</span>
                        </div>
                    </div>
                </div>

                {/* Actions & Stale Warning */}
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {isStale && (
                        <div className="text-red-500 animate-pulse mr-2" title="Stale Lead">
                            <AlertTriangle size={16} />
                        </div>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-lg transition-colors"
                        title="Tahrirlash"
                    >
                        <Pencil size={18} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemind(lead); }}
                        className={`p-1.5 rounded-lg transition-colors ${lead.reminder
                            ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-200'
                            : 'text-slate-600 hover:text-blue-600 hover:bg-white/50'
                            }`}
                        title={lead.reminder ? `Reminder: ${new Date(lead.reminder.date).toLocaleString()} - ${lead.reminder.note}` : "Set Reminder"}
                    >
                        <Clock size={18} className={lead.reminder ? 'fill-blue-500/10' : ''} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
                        className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-white/50 rounded-lg transition-colors"
                        title="O'chirish"
                    >
                        <Trash size={18} />
                    </button>
                </div>
            </div>

            {/* Reminder Badge (if exists) */}
            {lead.reminder && (
                <div className="mb-3 mt-1">
                    <div className="flex items-center gap-2 text-xs text-blue-700 bg-white/50 px-2.5 py-1.5 rounded-lg w-full border border-blue-100/30">
                        <Clock size={13} className="text-blue-600 shrink-0" />
                        <span className="font-semibold whitespace-nowrap">
                            {new Date(lead.reminder.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {lead.reminder.note && (
                            <>
                                <span className="text-blue-300 mx-0.5">|</span>
                                <span className="truncate opacity-90 font-medium">
                                    {lead.reminder.note}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Badges / Estimates */}
            <div className="flex items-center space-x-2 mt-3 mb-4">
                {lead.graft_estimate ? (
                    <div className="inline-flex items-center px-2.5 py-1 bg-white/60 text-slate-600 backdrop-blur-md rounded-lg text-xs font-semibold border border-white/40">
                        {lead.graft_estimate} grafts
                    </div>
                ) : null}

                {lead.price_quote ? (
                    <div className="inline-flex items-center px-2.5 py-1 bg-white/60 text-slate-600 backdrop-blur-md rounded-lg text-xs font-semibold border border-white/40">
                        {lead.currency} {lead.price_quote.toLocaleString()}
                    </div>
                ) : null}
            </div>

            {/* Action Bar (Status Dropdown) */}
            <div className="pt-3 border-t border-slate-200/50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider opacity-70">Status</span>

                <div className="relative">
                    <button
                        ref={buttonRef}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown();
                        }}
                        className={`
                            flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                            bg-white/60 ${iconBaseColor} border-white/40
                            hover:bg-white/80 hover:shadow-sm
                        `}
                    >
                        <StatusIcon size={14} className={iconBaseColor} />
                        <span>{STATUS_OPTIONS.find(opt => opt.value === lead.status)?.label || lead.status}</span>
                        <ChevronDown size={14} className={`${iconBaseColor} opacity-70 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                        <Portal lockScroll={false}>
                            {/* Backdrop to close on click outside */}
                            <div
                                className="fixed inset-0 z-[9998]"
                                onClick={() => setIsDropdownOpen(false)}
                            />

                            {/* Dropdown Content */}
                            <div
                                className="fixed bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                                style={{
                                    top: dropdownPos.top,
                                    left: dropdownPos.left,
                                    width: dropdownPos.width,
                                }}
                            >
                                <div className="p-1">
                                    {STATUS_OPTIONS.map(opt => {
                                        const isActive = opt.value === lead.status;
                                        const optColor = COL_COLORS[opt.value];
                                        const OptIcon = COL_ICONS[opt.value];
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStatusClick(opt.value);
                                                }}
                                                className={`
                                                    w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors
                                                    ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                                `}
                                            >
                                                <div className={`p-1 rounded-md ${isActive ? 'bg-white shadow-sm' : 'bg-slate-100'} mr-1`}>
                                                    <OptIcon size={12} className={`text-${optColor}-500`} />
                                                </div>
                                                <span>{opt.label}</span>
                                                {isActive && <Check size={14} className="ml-auto text-promed-primary" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </Portal>
                    )}
                </div>
            </div>
        </motion.div>
    );
};


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
    const checkIsOverdue = React.useCallback((): boolean => {
        if (!lead.reminder?.date) return false;
        try {
            return new Date(lead.reminder.date) < new Date();
        } catch { return false; }
    }, [lead.reminder?.date]);

    const [isOverdue, setIsOverdue] = React.useState(checkIsOverdue());

    // Update overdue status every second if there is a reminder
    React.useEffect(() => {
        if (!lead.reminder?.date) {
            setIsOverdue(false);
            return;
        }

        // Initial check
        setIsOverdue(checkIsOverdue());

        const interval = setInterval(() => {
            const nowOverdue = checkIsOverdue();
            setIsOverdue(prev => {
                // Only update state if it changes to avoid unnecessary re-renders
                if (prev !== nowOverdue) return nowOverdue;
                return prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [lead.reminder?.date, checkIsOverdue]);

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



    const getSourceLabel = (source: string) => {
        switch (source) {
            case 'Walk-in': return t('source_walkin');
            case 'Referral': return t('source_referral');
            default: return source;
        }
    };

    const getStatusHeaderColor = (status: string) => {
        const color = COL_COLORS[status as LeadStatus] || 'slate';
        switch (color) {
            case 'blue': return 'bg-blue-500';
            case 'orange': return 'bg-orange-500';
            case 'purple': return 'bg-purple-500';
            case 'emerald': return 'bg-emerald-500';
            case 'red': return 'bg-rose-500';
            default: return 'bg-slate-500';
        }
    };

    const getStatusLabel = (status: string) => {
        return STATUS_OPTIONS.find(opt => opt.value === status)?.label || status;
    };

    return (
        <motion.div
            layoutId={layoutId} // Shared layout ID for seamless expansion
            onClick={() => onSelect(lead)}
            className={`
            bg-white rounded-[2rem] border border-slate-200 mb-4 relative group cursor-pointer transition-all hover:border-blue-400 hover:bg-slate-50/50 z-0 hover:z-10
            ${isStale ? 'ring-2 ring-rose-500' : ''}
            ${isOverdue ? 'ring-2 ring-rose-300' : ''}
        `}>
            {/* Status Header - Absolute Positioned */}
            <div className={`absolute top-0 inset-x-0 h-10 rounded-t-[2rem] flex items-center justify-center font-extrabold text-white text-[11px] tracking-[0.2em] uppercase z-10 ${getStatusHeaderColor(lead.status)}`}>
                {getStatusLabel(lead.status)}

                {/* Indicators */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {isOverdue && (
                        <div className="bg-white/20 p-1 rounded-full animate-pulse" title="Overdue">
                            <Clock size={12} className="text-white" />
                        </div>
                    )}
                    {hasActiveReminder && !isOverdue && (
                        <div className="bg-white/20 p-1 rounded-full" title="Reminder Set">
                            <Clock size={12} className="text-white" />
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area - Padded top for header */}
            <div className="pt-14 px-5 pb-5">
                {/* Dashed Content Box - Darker border for accessibility */}
                <div className="border-[2px] border-dashed border-slate-300 rounded-[1.5rem] p-5 mb-4 relative bg-slate-50/30 group-hover:bg-slate-50/60 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-lg text-slate-900 leading-tight">{lead.full_name}</h4>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm text-slate-500">
                                <SourceIcon source={lead.source} />
                            </div>
                            <span>{getSourceLabel(lead.source)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm text-slate-500">
                                <Phone size={14} />
                            </div>
                            <span className="tabular-nums tracking-wide text-slate-700">{lead.phone_number}</span>
                        </div>
                    </div>

                    {/* Badges / Estimates or Time */}
                    <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-dashed border-slate-200">
                        {lead.graft_estimate && (
                            <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-100 shadow-sm">
                                {lead.graft_estimate} grafts
                            </div>
                        )}
                        {lead.price_quote && (
                            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-100 shadow-sm">
                                {lead.currency} {lead.price_quote.toLocaleString()}
                            </div>
                        )}

                        {/* Show Scheduled/Created Time */}
                        {lead.reminder?.date ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200/50" title="Scheduled Reminder">
                                <Clock size={14} className="text-white" />
                                <span className="tracking-wide">
                                    {new Date(lead.reminder.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-300" title="Creation Date">
                                <span className="opacity-60 text-[10px] uppercase tracking-wider font-semibold mr-1">Added</span>
                                <span>
                                    {lead.created_at?.seconds
                                        ? new Date(lead.created_at.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                        : 'Just now'
                                    }
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions - Matching the reference exactly */}
                <div className="flex items-center gap-3">
                    {/* Edit Button - Pill Outline */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                        className="flex-1 h-10 px-4 bg-white border border-slate-300 rounded-full flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:border-slate-400 hover:text-slate-900 hover:shadow-sm active:scale-95 transition-all group/btn"
                    >
                        <Pencil size={14} className="text-slate-500 group-hover/btn:text-slate-700" />
                        <span>{t('edit') || 'Edit'}</span>
                    </button>

                    {/* Remind Button - Pill Outline (Blue when active) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemind(lead); }}
                        className={`flex-1 h-10 px-4 border rounded-full flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-sm active:scale-95 group/btn
                            ${lead.reminder
                                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-blue-100'
                                : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900 hover:shadow-sm'
                            }`}
                    >
                        <Clock size={14} className={lead.reminder ? 'text-blue-600' : 'text-slate-500 group-hover/btn:text-slate-700'} />
                        <span>{lead.reminder ? 'Remind' : 'Remind'}</span>
                    </button>

                    {/* More Button - Circle Outline */}
                    <button
                        ref={buttonRef}
                        onClick={(e) => { e.stopPropagation(); toggleDropdown(); }}
                        className="h-10 w-10 bg-white border border-slate-300 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:shadow-md active:scale-95 transition-all"
                    >
                        {isDropdownOpen ? <ChevronDown size={18} className="rotate-180 transition-transform" /> : <MoreHorizontal size={18} />}
                    </button>

                    {/* Floating Portal Dropdown */}
                    {isDropdownOpen && (
                        <Portal lockScroll={false}>
                            <div
                                className="fixed inset-0 z-[9998]"
                                onClick={() => setIsDropdownOpen(false)}
                            />
                            <div
                                className="fixed bg-white border border-slate-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-1.5 min-w-[200px]"
                                style={{
                                    top: dropdownPos.top - 60,
                                    left: dropdownPos.left - 160,
                                    width: 200,
                                }}
                            >
                                <div className="text-[10px] font-bold text-slate-400 px-3 py-2 uppercase tracking-wider mb-1">Change Status</div>
                                <div className="space-y-1">
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
                                                    w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all
                                                    ${isActive ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                                `}
                                            >
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isActive ? 'bg-white shadow-sm' : 'bg-slate-100'} transition-colors`}>
                                                    <OptIcon size={12} className={`text-${optColor}-500`} />
                                                </div>
                                                <span>{opt.label}</span>
                                                {isActive && <Check size={14} className="ml-auto text-promed-primary" />}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="h-px bg-slate-100 my-2 mx-2" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
                                    className="w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold rounded-xl text-rose-600 hover:bg-rose-50 transition-colors group/del"
                                >
                                    <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center group-hover/del:bg-rose-100 transition-colors">
                                        <Trash size={12} className="text-rose-500" />
                                    </div>
                                    Delete Lead
                                </button>
                            </div>
                        </Portal>
                    )}
                </div>
            </div>
        </motion.div>
    );
};


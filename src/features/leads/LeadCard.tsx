
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
    const { t, language } = useLanguage();
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

    const locale = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';

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
            animate={isOverdue ? {
                boxShadow: [
                    '0 0 0 0px rgba(244, 63, 94, 0)',
                    '0 0 0 4px rgba(244, 63, 94, 0.2)',
                    '0 0 0 8px rgba(244, 63, 94, 0)'
                ],
                borderColor: ['#e2e8f0', '#fda4af', '#e2e8f0'],
                transition: {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }
            } : {
                boxShadow: '0 0 0 0px rgba(244, 63, 94, 0)',
                borderColor: '#e2e8f0',
                transition: { duration: 0.5 }
            }}
            className={`
            bg-white rounded-[2rem] border mb-4 relative group cursor-pointer transition-all hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 z-0 hover:z-10
            ${(isStale && !isOverdue && !hasActiveReminder) ? 'ring-2 ring-rose-500' : ''}
            ${!isStale && !isOverdue ? 'border-slate-200' : ''}
            ${isOverdue ? 'z-20' : ''}
        `}>
            {/* Premium Floating Reminder Indicator */}
            {(isOverdue || hasActiveReminder) && (
                <div className="absolute -top-1 -right-1 z-30">
                    <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="relative"
                    >
                        {/* Outer Pulse Glow (for Overdue) */}
                        {isOverdue && (
                            <motion.div
                                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 rounded-full bg-rose-500 blur-md"
                            />
                        )}

                        {/* Main Indicator Circle */}
                        <div className={`
                            w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 backdrop-blur-md transition-all duration-300
                            ${isOverdue
                                ? 'bg-rose-500 border-white text-white shadow-rose-500/40'
                                : 'bg-white/90 border-blue-100 text-blue-600 shadow-blue-500/10'}
                        `}>
                            <Clock size={18} strokeWidth={3} className={isOverdue ? "animate-pulse" : ""} />
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Status Header - Absolute Positioned */}
            <div className={`absolute top-0 inset-x-0 h-10 rounded-t-[2rem] flex items-center justify-center font-extrabold text-white text-[11px] tracking-[0.2em] uppercase z-10 ${getStatusHeaderColor(lead.status)}`}>
                {getStatusLabel(lead.status)}
            </div>

            {/* Main Content Area - Padded top for header */}
            <div className="pt-14 px-5 pb-5">
                {/* Dashed Content Box - Clean White aesthetic */}
                <div className="border-[2px] border-dashed border-slate-200 rounded-[1.5rem] p-5 mb-4 relative bg-white transition-colors">
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
                        {/* Interactive Reminder / Added Date Pill */}
                        {lead.reminder?.date ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemind(lead); }}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200/50 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all group/remind"
                                title={t('edit_reminder') || 'Edit Reminder'}
                            >
                                <Clock size={14} className="group-hover/remind:rotate-12 transition-transform" />
                                <span className="tracking-wide">
                                    {new Date(lead.reminder.date).toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-lg text-[11px] font-bold border border-slate-200">
                                <Clock size={14} className="opacity-40" />
                                <div className="flex items-center whitespace-nowrap">
                                    <span className="opacity-60 text-[10px] uppercase tracking-wider font-semibold mr-1">{t('added') || 'Added'}</span>
                                    <span>
                                        {lead.created_at?.seconds
                                            ? new Date(lead.created_at.seconds * 1000).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
                                            : t('just_now')
                                        }
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions - Matching the reference exactly */}
                {/* Footer Actions - Clean, Consolidated UI */}
                <div className="flex items-center justify-between gap-3 px-1 pt-2">
                    {/* Management Actions (Left - Minimalist Icons) */}
                    <div className="flex items-center gap-2">
                        {/* Edit Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                            title={t('edit')}
                            className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all active:scale-90 shadow-sm"
                        >
                            <Pencil size={18} />
                        </button>

                        {/* Delete Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
                            title={t('delete')}
                            className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all active:scale-90 shadow-sm"
                        >
                            <Trash size={18} />
                        </button>
                    </div>

                    {/* Consolidated Status Dropdown (Right) */}
                    <div className="relative">
                        <button
                            ref={buttonRef}
                            onClick={(e) => { e.stopPropagation(); toggleDropdown(); }}
                            className={`h-10 px-4 rounded-full flex items-center gap-2 transition-all active:scale-95 shadow-sm border
                                ${isDropdownOpen
                                    ? 'bg-slate-900 border-slate-900 text-white'
                                    : `bg-${COL_COLORS[lead.status]}-50 border-${COL_COLORS[lead.status]}-100 text-${COL_COLORS[lead.status]}-700 hover:bg-${COL_COLORS[lead.status]}-100`
                                }`}
                        >
                            {isDropdownOpen ? (
                                <ChevronDown size={16} className="rotate-180 transition-transform" />
                            ) : (
                                React.createElement(COL_ICONS[lead.status], { size: 16 })
                            )}
                            <span className="text-[10px] font-extrabold uppercase tracking-wider">
                                {STATUS_OPTIONS.find(opt => opt.value === lead.status)?.label || lead.status}
                            </span>
                        </button>

                        {/* Dropdown Portal */}
                        {isDropdownOpen && (
                            <Portal lockScroll={false}>
                                <div className="fixed inset-0 z-[9998]" onClick={() => setIsDropdownOpen(false)} />
                                <div
                                    className="fixed bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-1.5 min-w-[220px]"
                                    style={{
                                        top: dropdownPos.top - 50, // Slight offset for better alignment
                                        left: dropdownPos.left - 150, // Shifted left to center better
                                    }}
                                >
                                    <div className="text-[10px] font-bold text-slate-400 px-3 py-2 uppercase tracking-wider mb-1">{t('set_lead_status') || 'Set Lead Status'}</div>
                                    <div className="space-y-1">
                                        {STATUS_OPTIONS.map(opt => {
                                            const isActive = opt.value === lead.status;
                                            const optColor = COL_COLORS[opt.value];
                                            const OptIcon = COL_ICONS[opt.value];

                                            // Mapping custom colors to tailwind classes carefully
                                            const colorClasses: Record<string, string> = {
                                                blue: 'text-blue-600 bg-blue-100/50 border-blue-200',
                                                orange: 'text-orange-600 bg-orange-100/50 border-orange-200',
                                                purple: 'text-purple-600 bg-purple-100/50 border-purple-200',
                                                emerald: 'text-emerald-600 bg-emerald-100/50 border-emerald-200',
                                                red: 'text-rose-600 bg-rose-100/50 border-rose-200',
                                            };
                                            const activeColorClass = colorClasses[optColor] || 'text-slate-600 bg-slate-100/50 border-slate-200';
                                            const iconColorClass = optColor === 'blue' ? 'text-blue-500' :
                                                optColor === 'orange' ? 'text-orange-500' :
                                                    optColor === 'purple' ? 'text-purple-500' :
                                                        optColor === 'emerald' ? 'text-emerald-500' :
                                                            optColor === 'red' ? 'text-rose-500' : 'text-slate-500';

                                            return (
                                                <button
                                                    key={opt.value}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStatusClick(opt.value);
                                                    }}
                                                    className={`
                                                        w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-xl transition-all border border-transparent
                                                        ${isActive ? `shadow-sm ${activeColorClass}` : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                                    `}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-white shadow-sm' : 'bg-slate-50'} transition-colors`}>
                                                        <OptIcon size={16} className={iconColorClass} />
                                                    </div>
                                                    <span className="flex-1 text-left">{opt.label}</span>
                                                    {isActive && (
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isActive ? iconColorClass.replace('text', 'bg') : 'bg-blue-600'}`}>
                                                            <Check size={10} className="text-white" strokeWidth={4} />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </Portal>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};


import React from 'react';
import { Lead, LeadStatus } from '../../types';
import { leadService } from '../../services/leadService';
import {
    Instagram,
    Send,
    User,
    Users,
    Phone,
    Sparkles,
    Banknote,
    Stethoscope,
    Archive,
    ChevronDown,
    Check,
    Pencil,
    Trash2,
    Clock,
    Calendar,
    MapPin
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { Portal } from '../../components/ui/Portal';

interface LeadCardProps {
    lead: Lead;
    onStatusChange: (id: string, newStatus: LeadStatus, origin?: { x: number, y: number }) => void;
    onEdit: (lead: Lead) => void;
    onDelete: (lead: Lead) => void;
    onRemind: (lead: Lead) => void;
    onSelect: (lead: Lead) => void;
    isViewer?: boolean;
}

// ── Initials + Color Generator ──
const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

const AVATAR_PALETTE = [
    { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200' },
    { bg: 'bg-violet-100', text: 'text-violet-700', ring: 'ring-violet-200' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200' },
    { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200' },
    { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-200' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700', ring: 'ring-cyan-200' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700', ring: 'ring-indigo-200' },
    { bg: 'bg-teal-100', text: 'text-teal-700', ring: 'ring-teal-200' },
];

const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

// ── Source Config ──
const SOURCE_CONFIG: Record<string, { icon: React.ElementType; label?: string; bg: string; text: string; iconColor: string }> = {
    'Instagram': { icon: Instagram, bg: 'bg-gradient-to-br from-pink-50 to-purple-50', text: 'text-pink-700', iconColor: 'text-pink-500' },
    'Telegram': { icon: Send, bg: 'bg-sky-50', text: 'text-sky-700', iconColor: 'text-sky-500' },
    'Walk-in': { icon: MapPin, bg: 'bg-amber-50', text: 'text-amber-700', iconColor: 'text-amber-500' },
    'Referral': { icon: Users, bg: 'bg-emerald-50', text: 'text-emerald-700', iconColor: 'text-emerald-500' },
};

// ── Status Colors & Icons ──
const STATUS_STYLE: Record<LeadStatus, { bg: string; text: string; dot: string; iconColor: string }> = {
    'NEW': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', iconColor: 'text-blue-500' },
    'CONTACTED': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', iconColor: 'text-orange-500' },
    'PHOTOS_SENT': { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500', iconColor: 'text-purple-500' },
    'PRICE_GIVEN': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', iconColor: 'text-amber-500' },
    'BOOKED': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', iconColor: 'text-emerald-500' },
    'LOST': { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500', iconColor: 'text-rose-500' },
};

const COL_ICONS: Record<LeadStatus, React.ElementType> = {
    'NEW': Sparkles,
    'CONTACTED': Phone,
    'PHOTOS_SENT': Send,
    'PRICE_GIVEN': Banknote,
    'BOOKED': Stethoscope,
    'LOST': Archive
};

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onStatusChange, onEdit, onDelete, onRemind, onSelect, isViewer }) => {
    const { t, language } = useLanguage();
    const isStale = leadService.checkStale(lead);

    // ── Overdue Logic ──
    const checkIsOverdue = React.useCallback((): boolean => {
        if (!lead.reminder?.date) return false;
        try { return new Date(lead.reminder.date) < new Date(); } catch { return false; }
    }, [lead.reminder?.date]);

    const [isOverdue, setIsOverdue] = React.useState(checkIsOverdue());

    React.useEffect(() => {
        if (!lead.reminder?.date) { setIsOverdue(false); return; }
        setIsOverdue(checkIsOverdue());
        const interval = setInterval(() => {
            const nowOverdue = checkIsOverdue();
            setIsOverdue(prev => prev !== nowOverdue ? nowOverdue : prev);
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

    // ── Portal Dropdown ──
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const [dropdownPos, setDropdownPos] = React.useState<{ top?: number; bottom?: number; left: number; width: number }>({ top: 0, left: 0, width: 220 });
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
        const handleResize = () => setIsDropdownOpen(false);
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);
        return () => { window.removeEventListener('resize', handleResize); window.removeEventListener('scroll', handleResize, true); };
    }, []);

    const toggleDropdown = () => {
        if (isViewer) return;
        if (!isDropdownOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const width = 240;
            // Smart positioning: Check if enough space below
            const spaceBelow = window.innerHeight - rect.bottom;
            const showAbove = spaceBelow < 300; // If less than 300px below, show above

            setDropdownPos({
                top: showAbove ? undefined : rect.bottom + 8,
                bottom: showAbove ? window.innerHeight - rect.top + 8 : undefined,
                left: rect.right - width,
                width
            });
            setIsDropdownOpen(true);
        } else {
            setIsDropdownOpen(false);
        }
    };

    const handleStatusClick = (newStatus: LeadStatus) => {
        if (isViewer) return;
        if (newStatus !== lead.status) {
            if (newStatus === 'BOOKED' && buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                onStatusChange(lead.id, newStatus, {
                    x: (rect.left + rect.width / 2) / window.innerWidth,
                    y: (rect.top + rect.height / 2) / window.innerHeight
                });
            } else {
                onStatusChange(lead.id, newStatus);
            }
        }
        setIsDropdownOpen(false);
    };

    // ── Resolved Styles ──
    const avatarStyle = getAvatarColor(lead.full_name);
    const initials = getInitials(lead.full_name);
    const statusStyle = STATUS_STYLE[lead.status] || STATUS_STYLE['NEW'];
    const StatusIcon = COL_ICONS[lead.status] || User;
    const sourceConf = SOURCE_CONFIG[lead.source] || SOURCE_CONFIG['Walk-in'];
    const SourceIconComp = sourceConf.icon;

    const getSourceLabel = (source: string) => {
        switch (source) {
            case 'Walk-in': return t('source_walkin');
            case 'Referral': return t('source_referral');
            default: return source;
        }
    };

    const formatAddedDate = (seconds: number): string => {
        const date = new Date(seconds * 1000);
        const day = date.getDate();
        const monthNames: Record<string, string[]> = {
            uz: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
            ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
            en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        };
        const months = monthNames[language] || monthNames.en;
        return `${day} ${months[date.getMonth()]}`;
    };

    const addedDate = lead.created_at?.seconds
        ? formatAddedDate(lead.created_at.seconds)
        : t('just_now');

    return (
        <motion.div
            onClick={() => onSelect(lead)}
            animate={isOverdue ? {
                boxShadow: [
                    '0 1px 3px 0 rgba(244,63,94,0.05)',
                    '0 1px 3px 0 rgba(244,63,94,0.15), 0 0 0 3px rgba(244,63,94,0.08)',
                    '0 1px 3px 0 rgba(244,63,94,0.05)'
                ],
                transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
            } : {
                boxShadow: '0 2px 8px -2px rgba(0,0,0,0.08), 0 4px 16px -4px rgba(0,0,0,0.05)',
                transition: { duration: 0.3 }
            }}
            className={`
                bg-white rounded-2xl border mb-4 relative group cursor-pointer
                transition-all duration-300 ease-out
                shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(0,0,0,0.05)]
                hover:-translate-y-1 hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.12),0_12px_40px_-8px_rgba(0,0,0,0.06)] hover:border-slate-200
                ${isOverdue ? 'border-rose-200' : isStale && !hasActiveReminder ? 'border-rose-300 ring-1 ring-rose-100' : 'border-slate-100/80'}
            `}
        >
            {/* ── Floating Reminder Indicator ── */}
            {/* ── Floating Reminder Indicator ── */}
            {(isOverdue || hasActiveReminder) && (
                <div className="absolute -top-2.5 -right-2.5 z-30 pointer-events-none">
                    <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    >
                        {isOverdue && (
                            <span className="absolute inset-0 rounded-2xl bg-rose-500/50 animate-ping duration-1500" />
                        )}
                        <div
                            className={`
                                relative w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-all
                                ${isOverdue
                                    ? 'bg-gradient-to-br from-rose-400 to-red-600 shadow-rose-500/30'
                                    : 'bg-gradient-to-br from-sky-400 to-blue-600 shadow-blue-500/30'}
                                ring-2 ring-white
                            `}
                        >
                            <Clock size={14} strokeWidth={3} className={`text-white drop-shadow-sm ${isOverdue ? 'animate-pulse' : ''}`} />
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ── Card Content ── */}
            <div className="p-5">

                {/* ── Header: Avatar + Name + Status Badge ── */}
                <div className="flex items-start gap-3.5 mb-4">
                    {/* Avatar */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ${avatarStyle.ring} ${avatarStyle.bg}`}>
                        <span className={`text-sm font-bold ${avatarStyle.text}`}>{initials}</span>
                    </div>

                    {/* Name + Date */}
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[15px] text-slate-900 leading-snug truncate">{lead.full_name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar size={10} className="opacity-60" />
                            {addedDate}
                        </p>
                    </div>
                </div>

                {/* ── Body: Source + Phone ── */}
                <div className="space-y-2.5 mb-4">
                    {/* Source */}
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${sourceConf.bg}`}>
                            <SourceIconComp size={15} className={sourceConf.iconColor} />
                        </div>
                        <span className={`text-[13px] font-semibold ${sourceConf.text}`}>{getSourceLabel(lead.source)}</span>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50">
                            <Phone size={15} className="text-blue-500" />
                        </div>
                        <span className="text-[13px] font-semibold text-slate-700 tabular-nums tracking-wide">{lead.phone_number}</span>
                    </div>
                </div>

                {/* ── Badges (Estimates / Reminder) ── */}
                {(lead.graft_estimate || lead.price_quote || lead.reminder?.date) && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {lead.graft_estimate && (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold">
                                {lead.graft_estimate} grafts
                            </span>
                        )}
                        {lead.price_quote && (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[11px] font-bold">
                                {lead.currency} {lead.price_quote.toLocaleString()}
                            </span>
                        )}
                        {lead.reminder?.date && (
                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                onClick={(e) => { e.stopPropagation(); if (!isViewer) onRemind(lead); }}
                                disabled={isViewer}
                                className={`
                                    relative group/reminder overflow-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-300
                                    ${isOverdue
                                        ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100 hover:ring-rose-200 hover:bg-rose-100'
                                        : 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100 hover:ring-indigo-200 hover:bg-indigo-100'}
                                    ${isViewer ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'}
                                `}
                            >
                                <Clock size={12} strokeWidth={2.5} className={`transition-transform duration-500 ${isOverdue ? 'group-hover/reminder:animate-bounce' : 'group-hover/reminder:rotate-[360deg]'}`} />
                                <span className={isOverdue ? 'animate-pulse' : ''}>
                                    {(() => {
                                        const d = new Date(lead.reminder.date);
                                        const monthNames: Record<string, string[]> = {
                                            uz: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
                                            ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
                                            en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                                        };
                                        const months = monthNames[language] || monthNames.en;
                                        return `${d.getDate()} ${months[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                    })()}
                                </span>
                            </motion.button>
                        )}
                    </div>
                )}

                {/* ── Footer: Actions ── */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100/80">
                    {/* Secondary Actions — hidden until card hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {!isViewer && (
                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                                title={t('edit')}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 active:scale-90"
                            >
                                <Pencil size={15} />
                            </motion.button>
                        )}
                        {!isViewer && (
                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
                                title={t('delete')}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 active:scale-90"
                            >
                                <Trash2 size={15} />
                            </motion.button>
                        )}
                    </div>

                    {/* Primary Action: Status Dropdown */}
                    <div className="relative">
                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                            ref={buttonRef}
                            onClick={(e) => { e.stopPropagation(); toggleDropdown(); }}
                            disabled={isViewer}
                            className={`h-8 px-3.5 rounded-xl flex items-center gap-1.5 transition-all duration-200 text-[11px] font-bold uppercase tracking-wider
                                ${isDropdownOpen
                                    ? 'bg-slate-800 text-white shadow-lg'
                                    : `${lead.status === 'NEW' ? 'btn-premium-blue' :
                                        lead.status === 'CONTACTED' ? 'btn-premium-orange' :
                                            lead.status === 'BOOKED' ? 'btn-premium-emerald' :
                                                lead.status === 'LOST' ? 'btn-premium-red' :
                                                    'btn-premium-blue'
                                    } text-white shadow-md ${!isViewer ? 'hover:shadow-lg hover:scale-[1.02]' : 'cursor-default opacity-80'}`
                                }
                                ${!isViewer ? 'active:scale-95' : ''}
                            `}
                        >
                            {isDropdownOpen
                                ? <ChevronDown size={13} className="rotate-180 transition-transform" />
                                : <StatusIcon size={13} />
                            }
                            <span>{STATUS_OPTIONS.find(o => o.value === lead.status)?.label || lead.status}</span>
                            {!isViewer && !isDropdownOpen && <ChevronDown size={12} className="opacity-60 -mr-0.5" />}
                        </motion.button>

                        {/* Dropdown Portal */}
                        {isDropdownOpen && !isViewer && (
                            <Portal lockScroll={false}>
                                <div className="fixed inset-0 z-[9998]" onClick={() => setIsDropdownOpen(false)} aria-hidden="true" />
                                <motion.div
                                    initial={{ opacity: 0, y: dropdownPos.bottom ? 8 : -8, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="fixed bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] z-[9999] overflow-hidden p-2 min-w-[240px]"
                                    style={{
                                        left: dropdownPos.left,
                                        top: dropdownPos.top,
                                        bottom: dropdownPos.bottom
                                    }}
                                    role="menu"
                                    aria-label={t('change_status')}
                                >
                                    <div className="text-[10px] font-bold text-slate-400/80 px-3 py-2 uppercase tracking-widest text-center border-b border-slate-100 mb-1 select-none">
                                        {t('set_lead_status') || 'Set Status'}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {STATUS_OPTIONS.map(opt => {
                                            const isActive = opt.value === lead.status;
                                            const optStyle = STATUS_STYLE[opt.value] || STATUS_STYLE['NEW'];
                                            const OptIcon = COL_ICONS[opt.value] || User;

                                            return (
                                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                    key={opt.value}
                                                    role="menuitem"
                                                    onClick={(e) => { e.stopPropagation(); handleStatusClick(opt.value); }}
                                                    className={`
                                                        w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden
                                                        ${isActive
                                                            ? `${optStyle.bg} ring-1 ring-inset ${optStyle.text.replace('text-', 'ring-').replace('700', '200')}`
                                                            : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}
                                                    `}
                                                >
                                                    <div className="flex items-center gap-3 relative z-10">
                                                        <div className={`
                                                            w-8 h-8 rounded-full flex items-center justify-center transition-colors
                                                            ${isActive ? 'bg-white/80' : 'bg-slate-100 group-hover:bg-white group-hover:shadow-sm'}
                                                        `}>
                                                            <OptIcon size={15} className={optStyle.iconColor} />
                                                        </div>
                                                        <span className={`text-[13px] font-bold ${isActive ? optStyle.text : ''}`}>
                                                            {opt.label}
                                                        </span>
                                                    </div>

                                                    {isActive && (
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${optStyle.dot} shadow-sm relative z-10`}>
                                                            <Check size={10} className="text-white" strokeWidth={4} />
                                                        </div>
                                                    )}
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            </Portal>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

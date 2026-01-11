
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
    Trash
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface LeadCardProps {
    lead: Lead;
    onStatusChange: (id: string, newStatus: LeadStatus) => void;
    onEdit: (lead: Lead) => void;
    onDelete: (lead: Lead) => void;
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

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onStatusChange, onEdit, onDelete }) => {
    const { t } = useLanguage();
    const isStale = leadService.checkStale(lead);

    const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
        { value: 'NEW', label: t('status_new') },
        { value: 'CONTACTED', label: t('status_contacted') },
        { value: 'BOOKED', label: t('status_booked') },
        { value: 'LOST', label: t('status_lost') },
    ];
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            case 'blue': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/20 border-transparent';
            case 'orange': return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/20 border-transparent';
            case 'emerald': return 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20 border-transparent';
            case 'red': return 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/20 border-transparent';
            default: return 'bg-white border-slate-100 shadow-sm text-slate-900';
        }
    };

    return (
        <div className={`
            ${getBackground(statusColor)} p-5 rounded-3xl border-transparent shadow-custom
            ${isStale ? '!border-red-500 !ring-1 !ring-red-500' : ''}
            transition-all mb-3 relative group
        `}>


            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="font-bold text-white text-base shadow-sm drop-shadow-sm">{lead.full_name}</h4>
                    <div className="flex items-center space-x-2 text-xs text-white/90 mt-1">
                        <div className="flex items-center space-x-1 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 shadow-sm">
                            <SourceIcon source={lead.source} />
                            <span>{lead.source}</span>
                        </div>
                        <div className="flex items-center space-x-1 pl-1">
                            <Phone size={12} className="" />
                            <span>{lead.phone_number}</span>
                        </div>
                    </div>
                </div>

                {/* Actions & Stale Warning */}
                <div className="flex items-center space-x-1">
                    {isStale && (
                        <div className="text-white animate-pulse mr-2" title="Stale Lead">
                            <AlertTriangle size={16} />
                        </div>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                        className="p-1.5 text-white/60 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                        title="Tahrirlash"
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
                        className="p-1.5 text-white/60 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                        title="O'chirish"
                    >
                        <Trash size={14} />
                    </button>
                </div>
            </div>

            {/* Badges / Estimates */}
            <div className="flex items-center space-x-2 mt-3 mb-4">
                {lead.graft_estimate ? (
                    <div className="inline-flex items-center px-2.5 py-1 bg-white/20 text-white backdrop-blur-md rounded-lg text-xs font-semibold border border-white/20">
                        {lead.graft_estimate} grafts
                    </div>
                ) : null}

                {lead.price_quote ? (
                    <div className="inline-flex items-center px-2.5 py-1 bg-white/20 text-white backdrop-blur-md rounded-lg text-xs font-semibold border border-white/20">
                        {lead.currency} {lead.price_quote.toLocaleString()}
                    </div>
                ) : null}
            </div>

            {/* Action Bar (Status Dropdown) */}
            <div className="pt-3 border-t border-white/20 flex items-center justify-between">
                <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Status</span>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={`
                            flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                            bg-white/20 text-white border-white/30
                            hover:bg-white/30 hover:shadow-sm
                        `}
                    >
                        <StatusIcon size={14} className="text-white" />
                        <span>{STATUS_OPTIONS.find(opt => opt.value === lead.status)?.label || lead.status}</span>
                        <ChevronDown size={14} className={`text-white/70 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-1">
                                {STATUS_OPTIONS.map(opt => {
                                    const isActive = opt.value === lead.status;
                                    const optColor = COL_COLORS[opt.value];
                                    const OptIcon = COL_ICONS[opt.value];
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleStatusClick(opt.value)}
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
                    )}
                </div>
            </div>
        </div>
    );
};

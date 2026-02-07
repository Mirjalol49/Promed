import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Phone, User, StickyNote, AlertCircle } from 'lucide-react';
import { Note } from '../../types';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import { useLanguage } from '../../contexts/LanguageContext';

interface NoteCardProps {
    note: Note;
    onEdit: (note: Note) => void;
    onDelete: (id: string) => void;
}

const IconMap: Record<string, React.ElementType> = {
    pink: Phone,
    green: User,
    yellow: StickyNote,
    blue: StickyNote,
    purple: AlertCircle
};

const accentColorMap: Record<string, { border: string, badgeBg: string, badgeText: string, iconBg: string, iconText: string }> = {
    pink: {
        border: 'border-l-rose-600',
        badgeBg: 'bg-rose-100',
        badgeText: 'text-rose-800',
        iconBg: 'bg-rose-200',
        iconText: 'text-rose-700'
    },
    green: {
        border: 'border-l-teal-600',
        badgeBg: 'bg-teal-100',
        badgeText: 'text-teal-900',
        iconBg: 'bg-teal-200',
        iconText: 'text-teal-700'
    },
    yellow: {
        border: 'border-l-amber-500',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-900',
        iconBg: 'bg-amber-200',
        iconText: 'text-amber-700'
    },
    blue: {
        border: 'border-l-blue-600',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-900',
        iconBg: 'bg-blue-200',
        iconText: 'text-blue-700'
    },
    purple: {
        border: 'border-l-violet-600',
        badgeBg: 'bg-violet-100',
        badgeText: 'text-violet-900',
        iconBg: 'bg-violet-200',
        iconText: 'text-violet-700'
    }
};

export const NoteCard = React.forwardRef<HTMLDivElement, NoteCardProps>(({ note, onEdit, onDelete }, ref) => {
    const { t } = useLanguage();
    // Default to blue if color is missing
    const colorKey = note.color || 'blue';
    const accent = accentColorMap[colorKey] || accentColorMap.blue;

    // Translated status labels
    const statusLabel = {
        pink: t('urgency'),
        green: t('todo'),
        yellow: t('note'),
        blue: t('note'),
        purple: t('note')
    }[colorKey] || t('note');

    const StatusIcon = IconMap[colorKey] || StickyNote;

    return (
        <motion.div
            ref={ref}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
                group relative flex flex-col min-h-[160px] p-5 rounded-2xl bg-white
                border border-slate-200 border-l-[6px] ${accent.border}
                shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]
                hover:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.12),0_15px_30px_-5px_rgba(0,0,0,0.08)]
                hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden
            `}
            onClick={() => onEdit(note)}
        >
            {/* Top Row: Icon + Badge + Delete */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    {/* Icon Box */}
                    <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${accent.iconBg} ${accent.iconText}`}>
                        {colorKey === 'pink' ? (
                            <Phone size={16} strokeWidth={2.5} />
                        ) : colorKey === 'green' ? (
                            <User size={16} strokeWidth={2.5} />
                        ) : (
                            <StatusIcon size={16} strokeWidth={2.5} />
                        )}
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${accent.badgeBg} ${accent.badgeText}`}>
                        {statusLabel}
                    </span>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(note.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="O'chirish"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {/* Title Section */}
            <h3 className="font-bold text-slate-900 text-[17px] leading-snug mb-2 line-clamp-2">
                {note.title || 'Sarlavhasiz'}
            </h3>

            {/* Content Preview */}
            <p className="text-slate-600/90 text-[13px] leading-relaxed font-medium mb-4 line-clamp-3">
                {note.content}
            </p>

            {/* Footer: Date */}
            <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[12px] font-bold text-slate-500">
                    {note.createdAt?.toDate
                        ? format(note.createdAt.toDate(), 'd MMMM, HH:mm', { locale: uz })
                        : 'Hozirgina'}
                </span>
            </div>
        </motion.div>
    );
});

NoteCard.displayName = "NoteCard";

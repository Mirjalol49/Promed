import React from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { Note } from '../../types';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import { useLanguage } from '../../contexts/LanguageContext';

interface NoteCardProps {
    note: Note;
    onEdit: (note: Note) => void;
    onDelete: (id: string) => void;
}

// Solid pastel colors based on the reference image
const colorMap: Record<string, string> = {
    blue: 'bg-blue-200',
    yellow: 'bg-yellow-100',
    green: 'bg-green-200',
    pink: 'bg-pink-200',
    purple: 'bg-purple-200',
};

const statusMap: Record<string, string> = {
    pink: 'urgency',
    green: 'todo',
    yellow: 'note',
    blue: 'note', // Fallback
    purple: 'note' // Fallback
};

export const NoteCard: React.FC<NoteCardProps> = ({ note, onEdit, onDelete }) => {
    const { t } = useLanguage();
    // Default to blue if color is missing
    const bgClass = colorMap[note.color || 'blue'] || colorMap.blue;
    const statusLabel = t(statusMap[note.color || 'yellow'] || 'note');

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
                group relative flex flex-col min-h-[160px] p-5 rounded-3xl border border-transparent
                ${bgClass} shadow-custom hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer
            `}
            onClick={() => onEdit(note)}
        >
            {/* Header: Checkbox - Title - Menu */}
            <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        {statusLabel}
                    </span>
                    <h3 className="font-bold text-slate-900 text-lg leading-snug line-clamp-2">
                        {note.title || 'Sarlavhasiz'}
                    </h3>
                </div>

                {/* More / Delete Action */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(note.id);
                    }}
                    className="p-1 text-slate-600 hover:bg-black/5 rounded-full transition-colors flex-shrink-0"
                    title="O'chirish"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            {/* Content */}
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4 flex-1 font-medium mb-4">
                {note.content}
            </p>

            {/* Footer: Date */}
            <div className="mt-auto pt-2">
                <span className="text-xs font-bold text-slate-500/80">
                    {note.createdAt?.toDate
                        ? format(note.createdAt.toDate(), 'd MMMM, HH:mm', { locale: uz })
                        : 'Hozirgina'}
                </span>
            </div>
        </motion.div>
    );
};

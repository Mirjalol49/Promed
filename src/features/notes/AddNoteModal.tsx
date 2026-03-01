import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Portal } from '../../components/ui/Portal';
import { Note } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface AddNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteToEdit?: Note | null;
    onSave: (data: { title: string; content: string; color: string; fileData?: undefined }) => Promise<void>;
    defaultColor?: string;
    locked?: boolean;
}

export const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, noteToEdit, onSave, defaultColor, locked }) => {
    const { t } = useLanguage();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [color, setColor] = useState('yellow');
    const [isLoading, setIsLoading] = useState(false);

    const colors = [
        { id: 'pink', bg: 'bg-rose-500', label: t('urgency') },
        { id: 'green', bg: 'bg-teal-500', label: t('todo') },
        { id: 'yellow', bg: 'bg-amber-400', label: t('note') },
    ];

    useEffect(() => {
        if (isOpen) {
            if (noteToEdit) {
                setTitle(noteToEdit.title || '');
                setContent(noteToEdit.content);
                // Fallback to yellow if color is missing or invalid
                const validColor = ['pink', 'green', 'yellow'].includes(noteToEdit.color || '')
                    ? noteToEdit.color
                    : 'yellow';
                setColor(validColor || 'yellow');
            } else {
                setTitle('');
                setContent('');
                setColor(defaultColor || 'yellow');
            }
        }
    }, [isOpen, noteToEdit, defaultColor]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
    };

    const handleSave = async () => {
        if (!title.trim() && !content.trim()) return;
        setIsLoading(true);
        try {
            const payload: any = { title, content, color };
            await onSave(payload);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const activeColorObj = colors.find(c => c.id === color) || colors[2];

    const getColorStyles = (c: string) => {
        switch (c) {
            case 'pink': return { badge: 'bg-rose-100 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
            case 'green': return { badge: 'bg-teal-100 text-teal-700 border-teal-200', dot: 'bg-teal-500' };
            case 'yellow': return { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
            default: return { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
        }
    };

    const currentStyles = getColorStyles(color);

    return (
        <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative">

                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                        <input
                            type="text"
                            placeholder={t('note_title_placeholder')}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault(); // Prevents the macOS "bonk" sound
                                    document.getElementById('note-content-textarea')?.focus();
                                }
                            }}
                            className="text-xl font-bold bg-transparent border-none outline-none placeholder:text-slate-300 text-slate-800 w-full mr-4"
                        />
                        <div className="flex items-center gap-3 shrink-0">
                            {!locked && (
                                <div className="flex items-center gap-1 mr-2">
                                    {colors.map((c) => (
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            key={c.id}
                                            onClick={() => setColor(c.id)}
                                            className={`w-6 h-6 rounded-full border-2 transition-all ${c.bg} ${color === c.id ? 'border-slate-600 scale-110' : 'border-transparent hover:scale-105'}`}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            )}

                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={24} />
                            </motion.button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 relative flex flex-col gap-4">
                        <textarea
                            id="note-content-textarea"
                            placeholder={t('note_content_placeholder')}
                            value={content}
                            onChange={handleTextChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    handleSave();
                                }
                            }}
                            className="w-full flex-1 min-h-[200px] resize-none border-none outline-none text-lg text-slate-600 leading-relaxed placeholder:text-slate-300 bg-transparent"
                            autoFocus
                        />
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 border ${currentStyles.badge}`}>
                                <div className={`w-2 h-2 rounded-full ${currentStyles.dot}`} />
                                {activeColorObj.label}
                            </div>
                        </div>

                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                            onClick={handleSave}
                            disabled={isLoading || (!content.trim())}
                            className="btn-premium-blue ml-auto"
                        >
                            <Save size={18} />
                            <span>{t('save')}</span>
                        </motion.button>
                    </div>
                </div>
            </div>
        </Portal>
    );
};

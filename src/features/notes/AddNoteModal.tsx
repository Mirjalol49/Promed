import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Portal } from '../../components/ui/Portal';
import { Note } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface AddNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteToEdit?: Note | null;
    onSave: (data: { title: string; content: string; color: string }) => Promise<void>;
    defaultColor?: string;
    locked?: boolean;
}

export const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, noteToEdit, onSave, defaultColor, locked }) => {
    const { t } = useLanguage();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [color, setColor] = useState('pink');
    const [isLoading, setIsLoading] = useState(false);

    const colors = [
        { id: 'pink', bg: 'bg-rose-500', label: t('urgency') },
        { id: 'green', bg: 'bg-teal-500', label: t('todo') },
        { id: 'yellow', bg: 'bg-amber-400', label: t('note') },
        { id: 'blue', bg: 'bg-promed-primary', label: t('note') },
        { id: 'purple', bg: 'bg-violet-500', label: t('note') },
    ];

    useEffect(() => {
        if (isOpen) {
            if (noteToEdit) {
                setTitle(noteToEdit.title || '');
                setContent(noteToEdit.content);
                setColor(noteToEdit.color || 'blue');
            } else {
                setTitle('');
                setContent('');
                setColor(defaultColor || 'blue'); // Use defaultColor or fallback
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
            await onSave({ title, content, color });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const activeColorObj = colors.find(c => c.id === color) || colors.find(c => c.id === 'blue') || colors[0];

    // Helper for color styles based on selection
    const getColorStyles = (c: string) => {
        switch (c) {
            case 'pink': return { badge: 'bg-rose-100 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
            case 'green': return { badge: 'bg-teal-100 text-teal-700 border-teal-200', dot: 'bg-teal-500' };
            case 'yellow': return { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
            case 'blue': return { badge: 'bg-promed-light text-promed-primary border-promed-primary/20', dot: 'bg-promed-primary' };
            case 'purple': return { badge: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-500' };
            default: return { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500' };
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
                            className="text-xl font-bold bg-transparent border-none outline-none placeholder:text-slate-300 text-slate-800 w-full mr-4"
                        />
                        <div className="flex items-center gap-3 shrink-0">
                            {/* Color Picker (Only if not locked) */}
                            {!locked && (
                                <div className="flex items-center gap-1 mr-2">
                                    {colors.map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => setColor(c.id)}
                                            className={`w-6 h-6 rounded-full border-2 transition-all ${c.bg} ${color === c.id ? 'border-slate-600 scale-110' : 'border-transparent hover:scale-105'}`}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 relative">
                        <textarea
                            placeholder={t('note_content_placeholder')}
                            value={content}
                            onChange={handleTextChange}
                            className="w-full h-[300px] resize-none border-none outline-none text-lg text-slate-600 leading-relaxed placeholder:text-slate-300 bg-transparent"
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

                        <button
                            onClick={handleSave}
                            disabled={isLoading || !content.trim()}
                            className="bg-promed-primary hover:bg-promed-primary/90 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-promed-primary/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 ml-auto"
                        >
                            <Save size={18} />
                            <span>{t('save')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
};

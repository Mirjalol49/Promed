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
}

const colors = [
    { id: 'pink', bg: 'bg-pink-200', border: 'border-pink-400', labelKey: 'urgency' },
    { id: 'green', bg: 'bg-green-200', border: 'border-green-400', labelKey: 'todo' },
    { id: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-400', labelKey: 'note' },
];

export const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, noteToEdit, onSave }) => {
    const { t } = useLanguage();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedColor, setSelectedColor] = useState('yellow');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (noteToEdit) {
                setTitle(noteToEdit.title || '');
                setContent(noteToEdit.content);
                setSelectedColor(noteToEdit.color || 'yellow');
            } else {
                setTitle('');
                setContent('');
                setSelectedColor('yellow');
            }
        }
    }, [isOpen, noteToEdit]);

    // Manual text edit handler
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
    };

    const handleSave = async () => {
        if (!title.trim() && !content.trim()) return;
        setIsLoading(true);
        try {
            await onSave({ title, content, color: selectedColor });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

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
                            className="text-xl font-bold bg-transparent border-none outline-none placeholder:text-slate-300 text-slate-800 w-full"
                        />
                        <div className="flex items-center gap-3">
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
                            {/* Color/Status Picker */}
                            <div className="flex items-center gap-2">
                                {colors.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setSelectedColor(c.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border ${selectedColor === c.id
                                            ? c.bg + ' ' + c.border + ' shadow-sm scale-105'
                                            : 'bg-white border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className={`w-3 h-3 rounded-full ${c.bg} border ${c.border}`} />
                                        <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedColor === c.id ? 'text-slate-800' : 'text-slate-500'}`}>
                                            {t(c.labelKey)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isLoading || !content.trim()}
                            className="bg-promed-primary hover:bg-promed-primary/90 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-promed-primary/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
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

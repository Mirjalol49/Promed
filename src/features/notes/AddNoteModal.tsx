import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Portal } from '../../components/ui/Portal';
import { Note } from '../../types';

interface AddNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteToEdit?: Note | null;
    onSave: (data: { title: string; content: string; color: string }) => Promise<void>;
}

const colors = [
    { id: 'blue', bg: 'bg-blue-200', border: 'border-blue-300' },
    { id: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-200' },
    { id: 'green', bg: 'bg-green-200', border: 'border-green-300' },
    { id: 'pink', bg: 'bg-pink-200', border: 'border-pink-300' },
    { id: 'purple', bg: 'bg-purple-200', border: 'border-purple-300' },
];

export const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, noteToEdit, onSave }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedColor, setSelectedColor] = useState('blue');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (noteToEdit) {
                setTitle(noteToEdit.title || '');
                setContent(noteToEdit.content);
                setSelectedColor(noteToEdit.color || 'blue');
            } else {
                setTitle('');
                setContent('');
                setSelectedColor('blue');
            }
        }
    }, [isOpen, noteToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsLoading(true);
        try {
            await onSave({
                title,
                content,
                color: selectedColor
            });
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
            <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className={`
                    bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 scale-in-95 animate-in duration-200
                    transition-colors duration-300 border-4 border-white
                `}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-800">
                            {noteToEdit ? 'Eslatmani Tahrirlash' : 'Yangi Eslatma'}
                        </h2>
                        <div className="flex gap-2">
                            {/* Color Picker using grid */}
                            <div className="flex gap-1 mr-2 bg-slate-100 p-1 rounded-full">
                                {colors.map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setSelectedColor(c.id)}
                                        className={`
                                            w-6 h-6 rounded-full transition-all duration-200 border-2
                                            ${c.bg} ${c.border}
                                            ${selectedColor === c.id ? 'scale-125 shadow-sm ring-2 ring-offset-1 ring-slate-200' : 'hover:scale-110'}
                                        `}
                                    />
                                ))}
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Sarlavha (ixtiyoriy)"
                                className="w-full text-lg font-bold placeholder:text-slate-400 border-none focus:ring-0 p-0 bg-transparent text-slate-800"
                            />
                        </div>

                        <div className="min-h-[200px] bg-slate-50/50 rounded-2xl p-2 -mx-2">
                            <textarea
                                autoFocus
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Eslatma yozing..."
                                className="w-full h-full min-h-[200px] resize-none border-none focus:ring-0 bg-transparent text-slate-600 leading-relaxed custom-scrollbar placeholder:text-slate-400"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={!content.trim() || isLoading}
                                className="btn-premium-blue px-6 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-b-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save size={18} />
                                        <span>Saqlash</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Portal>
    );
};

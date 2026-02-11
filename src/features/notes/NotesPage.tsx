import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, StickyNote, Search,
    FileText, ArrowLeft, FolderOpen
} from 'lucide-react';
import { noteService } from '../../services/noteService';
import { useAccount } from '../../contexts/AccountContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import upsetIcon from '../../components/mascot/upset_mascot.png';
import { Note } from '../../types';
import { NoteCard } from './NoteCard';
import { FolderCard, FolderType } from './FolderCard';
import { AddNoteModal } from './AddNoteModal';
import { TimelineNote } from './TimelineNote';
import DeleteModal from '../../components/ui/DeleteModal';
import { EmptyState } from '../../components/ui/EmptyState';

export const NotesPage: React.FC = () => {
    const { t } = useLanguage();
    const { error: showError } = useToast();
    const { userId, isLoading: isAuthLoading } = useAccount();
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
    const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Folder Navigation State
    const [activeFolder, setActiveFolder] = useState<FolderType | null>(null);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!userId) {
            setIsLoading(false);
            return;
        }

        const unsubscribe = noteService.subscribeToNotes(
            userId,
            (data) => {
                setNotes(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Notes subscription failed:", error);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, isAuthLoading]);

    const handleEdit = (note: Note) => {
        setNoteToEdit(note);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setNoteToEdit(null);
    };

    const handleConfirmDelete = async () => {
        if (noteToDelete) {
            const originalNotes = [...notes];
            const noteId = noteToDelete;

            // Optimistic Update
            setNotes(prev => prev.filter(n => n.id !== noteId));
            setIsDeleteModalOpen(false);
            setNoteToDelete(null);

            try {
                await noteService.deleteNote(noteId);
            } catch (error) {
                console.error("Failed to delete note:", error);
                setNotes(originalNotes);
                showError("Xatolik", "Eslatmani o'chirishda xatolik yuz berdi", upsetIcon);
            }
        }
    };

    const handleSaveNote = async (data: { title: string; content: string; color: string }) => {
        if (!userId) return;

        const originalNotes = [...notes];

        if (noteToEdit) {
            const updatedNote: Note = {
                ...noteToEdit,
                ...data,
            };

            setNotes(prev => prev.map(n => n.id === noteToEdit.id ? updatedNote : n));

            try {
                await noteService.updateNote(noteToEdit.id, data);
            } catch (error) {
                console.error("Failed to update note:", error);
                setNotes(originalNotes);
                showError("Xatolik", "Eslatmani yangilashda xatolik yuz berdi", upsetIcon);
            }
        } else {
            const tempId = 'temp-' + Date.now();
            const newNote: Note = {
                id: tempId,
                userId,
                title: data.title,
                content: data.content,
                color: data.color,
                createdAt: { toDate: () => new Date(), toMillis: () => Date.now(), seconds: Date.now() / 1000, nanoseconds: 0 } as any
            };

            setNotes(prev => [newNote, ...prev]);

            try {
                await noteService.addNote(data.content, userId, data.title, data.color);
            } catch (error) {
                console.error("Failed to add note:", error);
                setNotes(originalNotes);
                showError("Xatolik", "Eslatmani qo'shishda xatolik yuz berdi", upsetIcon);
            }
        }
    };

    // Filter Logic
    const getFilteredNotes = () => {
        let filtered = notes;

        // Filter by Folder Type
        if (activeFolder === 'urgent') {
            filtered = filtered.filter(n => n.color === 'pink');
        } else if (activeFolder === 'todo') {
            filtered = filtered.filter(n => n.color === 'green');
        } else if (activeFolder === 'note') {
            // Include yellow, blue, purple, and any others that aren't pink/green
            filtered = filtered.filter(n => !['pink', 'green'].includes(n.color || ''));
        }

        // Filter by Search
        if (searchQuery) {
            filtered = filtered.filter(n =>
                n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                n.title?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Special Sorting for Timeline (Todo) - Oldest First (Step 1, Step 2...)
        if (activeFolder === 'todo') {
            filtered = filtered.sort((a, b) => {
                const dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
                const dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
                return dateA - dateB; // Ascending (Oldest first)
            });
        }

        return filtered;
    };

    const displayNotes = getFilteredNotes();

    // Derived State for Folders
    const urgentNotes = notes.filter(n => n.color === 'pink');
    const todoNotes = notes.filter(n => n.color === 'green');
    const defaultNotes = notes.filter(n => !['pink', 'green'].includes(n.color || ''));

    const getFolderName = (type: FolderType) => {
        switch (type) {
            case 'urgent': return t('urgency');
            case 'todo': return t('tasks_folder');
            case 'note': return t('notes_folder');
            default: return "";
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden p-1.5">
            {/* Header / Actions */}
            <div className="p-5 bg-white rounded-3xl shadow-custom flex flex-col gap-4 flex-shrink-0">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="flex items-center justify-between md:justify-start gap-4">
                        <div className="flex items-center gap-2">
                            {activeFolder ? (
                                <button
                                    onClick={() => setActiveFolder(null)}
                                    className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors mr-1"
                                >
                                    <ArrowLeft size={24} className="text-slate-600" />
                                </button>
                            ) : (
                                <div className="p-2.5 gel-blue-style text-white rounded-xl">
                                    <FolderOpen size={24} />
                                </div>
                            )}

                            <div>
                                <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                    {activeFolder ? (
                                        <>
                                            <span className="opacity-50 font-medium cursor-pointer hover:underline" onClick={() => setActiveFolder(null)}>{t('files')}</span>
                                            <span className="opacity-30">/</span>
                                            <span>{getFolderName(activeFolder)}</span>
                                        </>
                                    ) : (
                                        t('my_files') || 'Fayllar'
                                    )}
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                        {activeFolder && (
                            <>
                                <div className="relative w-full md:w-72 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder={t('search_files') || t('search')}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-promed-primary/10 focus:border-promed-primary transition-all font-medium"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        setNoteToEdit(null);
                                        setIsModalOpen(true);
                                    }}
                                    className="btn-premium-blue shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 px-6 py-3 rounded-xl hover:-translate-y-1 transition-all duration-300 whitespace-nowrap animate-in fade-in slide-in-from-right-8 duration-500"
                                >
                                    <Plus size={20} />
                                    <span>{t('new_note')}</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto w-full p-8 relative">
                {/* Background Line for Timeline (only visible in todo mode, rendered conditionally below or via CSS) - Actually better handled in the item loop container or a wrapper */}

                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                    </div>
                ) : !activeFolder ? (
                    /* FOLDERS VIEW */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 animate-in fade-in duration-300">
                        <FolderCard
                            type="urgent"
                            count={urgentNotes.length}
                            onClick={() => setActiveFolder('urgent')}
                            previewNote={urgentNotes[0]}
                        />
                        <FolderCard
                            type="todo"
                            count={todoNotes.length}
                            onClick={() => setActiveFolder('todo')}
                            previewNote={todoNotes[0]}
                        />
                        <FolderCard
                            type="note"
                            count={defaultNotes.length}
                            onClick={() => setActiveFolder('note')}
                            previewNote={defaultNotes[0]}
                        />
                    </div>
                ) : displayNotes.length === 0 ? (
                    /* EMPTY STATE INSIDE FOLDER */
                    <EmptyState
                        message={t('no_notes_found') || "No notes found"}
                        description={t('add_note_prompt') || "Click the + button to add a new note"}
                    />
                ) : activeFolder === 'todo' ? (
                    /* TIMELINE VIEW FOR TASKS */
                    <div className="max-w-4xl mx-auto py-8 relative min-h-[500px]">
                        {/* Central dashed line base - visual guide */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-slate-200 -translate-x-1/2" />

                        <div className="space-y-0 relative z-10">
                            <AnimatePresence mode="popLayout">
                                {displayNotes.map((note, index) => (
                                    <TimelineNote
                                        key={note.id}
                                        note={note}
                                        index={index}
                                        isLeft={index % 2 === 0}
                                        onEdit={handleEdit}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                        {/* End of timeline indicator */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full pt-4">
                            <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                        </div>
                    </div>
                ) : (
                    /* STANDARD GRID VIEW FOR OTHERS */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-300 pb-20">
                        <AnimatePresence mode="popLayout">
                            {displayNotes.map(note => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    onEdit={handleEdit}
                                    onDelete={(id) => {
                                        setNoteToDelete(id);
                                        setIsDeleteModalOpen(true);
                                    }}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <AddNoteModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                noteToEdit={noteToEdit}
                onSave={handleSaveNote}
                // Pre-select color based on active folder
                defaultColor={
                    activeFolder === 'urgent' ? 'pink' :
                        activeFolder === 'todo' ? 'green' :
                            'yellow'
                }
                locked={!!activeFolder && !noteToEdit} // Lock only if creating new (actually user said "if i make only urgency notes", implying creation)
            // But if editing, maybe we should also lock? 
            // "remove the res of it" suggests cleaner UI.
            // If I edit an "Urgency" note, should I be able to change it to "Todo"?
            // Probably yes if I want to move it?
            // But for now let's just lock for CREATION as that's the primary request context "if i am in urgency folder then i can make only urgency...".
            // Wait, if I edit a note inside Urgency folder, and change it to Todo, it will disappear from view (since view filters by pink).
            // That might be confusing. So locking it inside the view makes sense too.
            // I will lock it if `activeFolder` is present, regardless of edit/create, to avoid "disappearing note" confusion.
            />

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setNoteToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
};

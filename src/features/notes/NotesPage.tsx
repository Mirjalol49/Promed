import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, StickyNote, Search,
    FileText, ArrowLeft, FolderOpen
} from 'lucide-react';
import { noteService } from '../../services/noteService';
import { auth } from '../../lib/firebase';
import { useAccount } from '../../contexts/AccountContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Note } from '../../types';
import { NoteCard } from './NoteCard';
import { FolderCard, FolderType } from './FolderCard';
import { AddNoteModal } from './AddNoteModal';
import { TimelineNote } from './TimelineNote';
import DeleteModal from '../../components/ui/DeleteModal';
import { EmptyState } from '../../components/ui/EmptyState';

export const NotesPage: React.FC = () => {
    const { t } = useLanguage();
    const { success, error: showError } = useToast();
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
        let unsubscribeNotes: (() => void) | undefined;

        // Listen for Auth State Changes directly from Firebase
        // This avoids race conditions between LocalStorage (AccountContext) and Firebase SDK
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                // User is authenticated, subscribe to their notes using the authoritative UID
                // Check if we have an existing subscription and clear it first (unlikely but safe)
                if (unsubscribeNotes) unsubscribeNotes();

                unsubscribeNotes = noteService.subscribeToNotes(
                    user.uid,
                    (data) => {
                        setNotes(data);
                        setIsLoading(false);
                    },
                    (error) => {
                        console.error("Notes subscription error:", error);
                        // Only show toast for actual permission/logic errors, not standard cancellations
                        if (error?.code === 'permission-denied') {
                            showError("Ruxsat yo'q", "Sizga ma'lumotlarni ko'rishga ruxsat berilmagan. Iltimos qayta kiring.");
                        }
                        setIsLoading(false);
                    }
                );
            } else {
                // User is signed out or initializing
                setNotes([]);
                setIsLoading(false);
            }
        });

        // Cleanup on unmount
        return () => {
            unsubscribeAuth();
            if (unsubscribeNotes) unsubscribeNotes();
        };
    }, []);

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
                success(t('deleted_title'), t('toast_note_deleted'));
            } catch (error) {
                console.error("Failed to delete note:", error);
                setNotes(originalNotes);
                showError("Xatolik", "Eslatmani o'chirishda xatolik yuz berdi");
            }
        }
    };

    const handleSaveNote = async (data: { title: string; content: string; color: string; fileData?: { fileUrl: string, fileName: string, fileType: string } }) => {
        const currentUserId = auth.currentUser?.uid || userId;

        if (!currentUserId) {
            showError(t('toast_error_title'), "Foydalanuvchi ma'lumotlari topilmadi. Iltimos qayta kiring.");
            return;
        }

        const originalNotes = [...notes];

        if (noteToEdit) {
            const updatedNote: Note = {
                ...noteToEdit,
                ...data,
                // Include file data if present
                ...(data.fileData ? data.fileData : (noteToEdit.fileUrl ? {} : {})),
                ...(data.fileData || {})
            };

            setNotes(prev => prev.map(n => n.id === noteToEdit.id ? updatedNote : n));

            try {
                await noteService.updateNote(noteToEdit.id, data);
                success(t('status_updated_title'), t('toast_note_updated') || "Eslatma muvaffaqiyatli yangilandi");
            } catch (error) {
                console.error("Failed to update note:", error);
                setNotes(originalNotes);
                showError("Xatolik", "Eslatmani yangilashda xatolik yuz berdi");
            }
        } else {
            const tempId = 'temp-' + Date.now();
            const newNote: Note = {
                id: tempId,
                userId: currentUserId,
                title: data.title,
                content: data.content,
                color: data.color,
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0, toDate: () => new Date(), toMillis: () => Date.now() } as any,
                ...(data.fileData || {})
            };

            setNotes(prev => [newNote, ...prev]);

            try {
                await noteService.addNote(data.content, currentUserId, data.title, data.color, data.fileData);
                success(t('injection_added_title'), t('toast_note_added') || "Yangi eslatma muvaffaqiyatli qo'shildi");
            } catch (error: any) {
                console.error("Failed to add note:", error);
                setNotes(originalNotes);
                // Show specific error message from Firestore/Service
                showError("Xatolik", error.message || "Eslatmani qo'shishda xatolik yuz berdi");
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

    const handleStatusChange = async (id: string, isCompleted: boolean) => {
        // Optimistic update
        setNotes(prev => prev.map(n => n.id === id ? { ...n, isCompleted } : n));
        try {
            await noteService.updateNote(id, { isCompleted });
        } catch (error: any) {
            console.error("Failed to update status", error);
            // Revert on error
            setNotes(prev => prev.map(n => n.id === id ? { ...n, isCompleted: !isCompleted } : n));
            showError("Xatolik", error.message || "Statusni o'zgartirishda xatolik");
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
                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                    onClick={() => setActiveFolder(null)}
                                    className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors mr-1"
                                >
                                    <ArrowLeft size={24} className="text-slate-600" />
                                </motion.button>
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
                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                    onClick={() => {
                                        setNoteToEdit(null);
                                        setIsModalOpen(true);
                                    }}
                                    className="btn-premium-blue shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 px-6 py-3 rounded-xl hover:-translate-y-1 transition-all duration-300 whitespace-nowrap animate-in fade-in slide-in-from-right-8 duration-500"
                                >
                                    <Plus size={20} />
                                    <span>{t('new_note')}</span>
                                </motion.button>
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
                    <div className="relative w-full max-w-5xl mx-auto px-4 py-8 min-h-[500px]">
                        {/* Central dashed line base - visual guide - Hidden on mobile, visible on md+ */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-slate-300 -translate-x-1/2 hidden md:block" />

                        <div className="space-y-0 relative z-10">
                            <AnimatePresence mode="popLayout">
                                {displayNotes.map((note, index) => (
                                    <TimelineNote
                                        key={note.id}
                                        note={note}
                                        index={index}
                                        isLeft={index % 2 === 0}
                                        onEdit={(n) => {
                                            setNoteToEdit(n);
                                            setIsModalOpen(true);
                                        }}
                                        onDelete={(id) => {
                                            setNoteToDelete(id);
                                            setIsDeleteModalOpen(true);
                                        }}
                                        onStatusChange={handleStatusChange}
                                    />
                                ))}
                            </AnimatePresence>
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

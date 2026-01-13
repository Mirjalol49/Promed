import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, StickyNote, Search,
    FileText
} from 'lucide-react';
import { noteService } from '../../services/noteService';
import { useAccount } from '../../contexts/AccountContext';
import { Note } from '../../types';
import { NoteCard } from './NoteCard';
import { AddNoteModal } from './AddNoteModal';
import DeleteModal from '../../components/ui/DeleteModal';

export const NotesPage: React.FC = () => {
    const { userId, isLoading: isAuthLoading } = useAccount();
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false); // Renamed from isAddModalOpen to match usage
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
    const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // If auth is still loading, wait.
        if (isAuthLoading) return;

        // If auth finished but no userId (shouldn't happen in protected route, but safe to check)
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
    // The original handleDelete and handleEdit are now handled inline in JSX or via new modals
    // const handleDelete = async (id: string) => {
    //     if (confirm("Haqiqatan ham bu eslatmani o'chirmoqchimisiz?")) {
    //         await noteService.deleteNote(id);
    //     }
    // };

    // const handleEdit = (note: Note) => {
    //     setNoteToEdit(note);
    //     setAddModalOpen(true);
    // };

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
                // Revert
                setNotes(originalNotes);
                alert("Eslatmani o'chirishda xatolik yuz berdi");
            }
        }
    };

    const handleSaveNote = async (data: { title: string; content: string; color: string }) => {
        if (!userId) return;

        const originalNotes = [...notes];

        if (noteToEdit) {
            // Edit Mode - Optimistic
            const updatedNote: Note = {
                ...noteToEdit,
                ...data,
                // keep existing createdAt ?
            };

            setNotes(prev => prev.map(n => n.id === noteToEdit.id ? updatedNote : n));
            // Modal closes via AddNoteModal handling (or we can close it here if we want more control, but prop is onSave)
            // Wait, AddNoteModal closes itself on success. 
            // So we just promise to return void.

            try {
                await noteService.updateNote(noteToEdit.id, data);
            } catch (error) {
                console.error("Failed to update note:", error);
                setNotes(originalNotes);
                alert("Eslatmani yangilashda xatolik yuz berdi");
            }
        } else {
            // Add Mode - Optimistic
            const tempId = 'temp-' + Date.now();
            const newNote: Note = {
                id: tempId,
                userId,
                title: data.title,
                content: data.content,
                color: data.color,
                createdAt: { toDate: () => new Date(), toMillis: () => Date.now(), seconds: Date.now() / 1000, nanoseconds: 0 } as any // Mock timestamp
            };

            setNotes(prev => [newNote, ...prev]);

            try {
                await noteService.addNote(data.content, userId, data.title, data.color);
                // Note: The real subscription will update the list eventually with the real ID, 
                // replacing the temp one. 
                // However, subscription updates usually just setNotes(data). 
                // If the real data comes in, it will overwrite our optimistic state, which is fine!
            } catch (error) {
                console.error("Failed to add note:", error);
                setNotes(originalNotes);
                alert("Eslatmani qo'shishda xatolik yuz berdi");
            }
        }
    };

    const filteredNotes = notes
        .filter(n =>
            n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden p-1.5">
            {/* Header / Actions */}
            <div className="p-5 bg-white rounded-3xl shadow-custom flex flex-col gap-4 flex-shrink-0">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="flex items-center justify-between md:justify-start gap-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2.5 bg-yellow-100 rounded-xl">
                                <FileText className="text-yellow-600" size={24} />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Eslatmalarim</h1>
                            <span className="bg-slate-100 px-2.5 py-0.5 rounded-lg text-sm font-bold text-slate-600">
                                {notes.length}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Qidirish..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-400 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setNoteToEdit(null);
                                setIsModalOpen(true);
                            }}
                            className="btn-premium-blue shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 px-6 py-3 rounded-xl hover:-translate-y-1 transition-all duration-300 whitespace-nowrap"
                        >
                            <Plus size={20} />
                            <span>Yangi Eslatma</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto w-full p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                    </div>
                ) : filteredNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                        <div className="p-4 bg-slate-100 rounded-full mb-4">
                            <FileText size={40} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">Eslatmalar topilmadi</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-300 pb-20">
                        <AnimatePresence mode="popLayout">
                            {filteredNotes.map(note => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    onEdit={(n) => {
                                        setNoteToEdit(n);
                                        setIsModalOpen(true);
                                    }}
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
                isOpen={isModalOpen} // Changed from isAddModalOpen
                onClose={handleCloseModal}
                noteToEdit={noteToEdit}
                onSave={handleSaveNote}
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

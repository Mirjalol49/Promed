import React from 'react';
import { motion } from 'framer-motion';
import { Phone, User, StickyNote, Settings, Folder as FolderIcon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Note } from '../../types';

export type FolderType = 'urgent' | 'todo' | 'note';

interface FolderCardProps {
    type: FolderType;
    count: number;
    onClick: () => void;
    previewNote?: Note | null;
}

interface FolderCardProps {
    type: FolderType;
    count: number;
    onClick: () => void;
    previewNote?: Note | null;
}

export const FolderCard: React.FC<FolderCardProps> = ({ type, count, onClick, previewNote }) => {
    const { t } = useLanguage();

    const config = {
        urgent: { label: t('urgency'), icon: Phone },
        todo: { label: t('tasks_folder'), icon: User },
        note: { label: t('notes_folder'), icon: StickyNote },
    }[type];

    const Icon = config.icon;

    // Color/Style mapping for each folder type
    const styleMap = {
        urgent: {
            back: 'bg-rose-800',
            tab: 'bg-rose-800',
            front: 'bg-gradient-to-br from-rose-500 to-pink-600',
            iconBox: 'bg-white/10 border-white/10',
            iconColor: 'text-rose-50',
            textColor: 'text-white',
            subTextColor: 'text-rose-100/80',
            border: 'border-white/10'
        },
        todo: {
            back: 'bg-emerald-800',
            tab: 'bg-emerald-800',
            front: 'bg-gradient-to-br from-emerald-500 to-teal-600',
            iconBox: 'bg-white/10 border-white/10',
            iconColor: 'text-emerald-50',
            textColor: 'text-white',
            subTextColor: 'text-emerald-100/80',
            border: 'border-white/10'
        },
        note: {
            back: 'bg-blue-800',
            tab: 'bg-blue-800',
            front: 'bg-gradient-to-br from-blue-600 to-indigo-700',
            iconBox: 'bg-white/10 border-white/10',
            iconColor: 'text-blue-50',
            textColor: 'text-white',
            subTextColor: 'text-blue-100/80',
            border: 'border-white/10'
        }
    };

    const styles = styleMap[type];

    // Helper to get date
    const getDate = () => {
        if (!previewNote) return null;
        // Handle Firestore Timestamp or Date object
        return (previewNote.createdAt as any)?.toDate?.() || new Date(previewNote.createdAt as any) || new Date();
    };

    const displayDate = getDate();

    return (
        <div
            className="relative w-full h-[220px] group cursor-pointer [perspective:1500px]"
            onClick={onClick}
        >
            {/* Folder Structure */}
            <div className="relative w-full h-full origin-bottom duration-500 transform-style-3d">

                {/* BACK BOARD (Static/Base) */}
                <div className={`absolute inset-0 rounded-3xl z-0 transition-all duration-300 ease-out ${styles.back}`}>
                    {/* Tab */}
                    <div className={`absolute -top-4 left-0 w-1/3 h-10 rounded-t-2xl ${styles.tab}`}></div>
                </div>

                {/* PAPERS (Inside) */}
                {/* Dummy Paper 3 */}
                <div className="absolute inset-x-4 top-4 bottom-4 bg-slate-200 rounded-2xl shadow-sm z-[1] origin-bottom transition-all duration-300 ease-out group-hover:[transform:rotateX(-10deg)_translateY(-5px)]"></div>
                {/* Dummy Paper 2 */}
                <div className="absolute inset-x-4 top-4 bottom-4 bg-slate-100 rounded-2xl shadow-sm z-[2] origin-bottom transition-all duration-300 ease-out group-hover:[transform:rotateX(-20deg)_translateY(-10px)]"></div>

                {/* MAIN CONTENT PAPER */}
                <div className="absolute inset-x-4 top-4 bottom-4 bg-white rounded-2xl p-5 shadow-sm z-[5] origin-bottom transition-all duration-300 ease-out group-hover:[transform:rotateX(-30deg)_translateY(-20px)] border border-slate-100 flex flex-col">

                    {previewNote && displayDate ? (
                        <>
                            {/* Paper Header: Title & Time */}
                            <div className="flex items-center justify-between w-full mb-2">
                                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-800 font-medium">
                                    <span className="line-clamp-1 max-w-[120px]">
                                        {previewNote.title || t('untitled')}
                                    </span>
                                    <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                                        {displayDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="text-slate-400 font-bold tracking-widest text-xs">•••</div>
                            </div>

                            {/* Content Body */}
                            <div className="w-full mt-1 space-y-1.5 opacity-90">
                                <p className="text-[10px] text-slate-500 line-clamp-4 leading-relaxed">
                                    {previewNote.content}
                                </p>
                            </div>
                        </>
                    ) : (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center h-full opacity-40 space-y-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                <StickyNote size={14} className="text-slate-300" />
                            </div>
                            <div className="w-full space-y-2">
                                <div className="h-1.5 bg-slate-100 rounded-full w-full"></div>
                                <div className="h-1.5 bg-slate-100 rounded-full w-4/6 mx-auto"></div>
                            </div>
                        </div>
                    )}

                </div>

                {/* FRONT FLAP (Cover) - Rotates Open */}
                <div className={`absolute inset-0 rounded-3xl z-10 flex flex-col justify-between p-7 origin-bottom transition-all duration-500 ease-out group-hover:[transform:rotateX(-50deg)] border-t ${styles.border} ${styles.front} shadow-sm`}>
                    {/* Top Row */}
                    <div className="flex justify-between items-start">
                        <div className={`p-2 rounded-xl w-fit backdrop-blur-sm border ${styles.iconBox}`}>
                            <Icon size={24} className={styles.iconColor} />
                        </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="transform transition-transform duration-300 group-hover:opacity-80">
                        <h2 className={`text-2xl font-bold tracking-tight mb-1 ${styles.textColor}`}>
                            {config.label}
                        </h2>
                        <span className={`text-sm font-medium flex items-center gap-1.5 ${styles.subTextColor}`}>
                            <FolderIcon size={12} fill="currentColor" className="opacity-70" />
                            {count} {t('files') || 'fayl'}
                        </span>
                    </div>
                </div>

                {/* SHADOW/GLOW when open */}
                <div className="absolute inset-0 z-20 rounded-3xl bg-black/0 transition-colors duration-300 group-hover:bg-black/5 pointer-events-none"></div>

            </div>
        </div>
    );
};

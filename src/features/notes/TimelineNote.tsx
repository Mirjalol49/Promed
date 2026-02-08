import React from 'react';
import { motion } from 'framer-motion';
import { Note } from '../../types';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import { Pin } from 'lucide-react';

interface TimelineNoteProps {
    note: Note;
    index: number;
    isLeft: boolean;
    onEdit: (note: Note) => void;
}

export const TimelineNote: React.FC<TimelineNoteProps> = ({ note, index, isLeft, onEdit }) => {
    // Inverted tilt: Left cards tilt Left (-), Right cards tilt Right (+)
    const rotation = React.useMemo(() => (isLeft ? -1 : 1) * (4 + Math.random() * 4), [isLeft]);

    // Color-specific styles for the 3D Pin parts
    const getPinColors = (idx: number) => {
        const palettes = [
            { // Blue
                head: 'bg-gradient-to-br from-blue-400 to-blue-600',
                highlight: 'bg-blue-300',
                neck: 'bg-blue-700',
                base: 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600',
                shadow: 'shadow-blue-900/40',
                text: 'text-blue-700',
                border: 'border-blue-200'
            },
            { // Orange
                head: 'bg-gradient-to-br from-orange-400 to-orange-600',
                highlight: 'bg-orange-300',
                neck: 'bg-orange-700',
                base: 'bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600',
                shadow: 'shadow-orange-900/40',
                text: 'text-orange-700',
                border: 'border-orange-200'
            },
            { // Purple
                head: 'bg-gradient-to-br from-purple-400 to-purple-600',
                highlight: 'bg-purple-300',
                neck: 'bg-purple-700',
                base: 'bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600',
                shadow: 'shadow-purple-900/40',
                text: 'text-purple-700',
                border: 'border-purple-200'
            },
            { // Teal
                head: 'bg-gradient-to-br from-teal-400 to-teal-600',
                highlight: 'bg-teal-300',
                neck: 'bg-teal-700',
                base: 'bg-gradient-to-r from-teal-600 via-teal-500 to-teal-600',
                shadow: 'shadow-teal-900/40',
                text: 'text-teal-700',
                border: 'border-teal-200'
            }
        ];
        return palettes[idx % palettes.length];
    };

    const pinColors = getPinColors(index);

    // Component for the complex 3D Pin shape
    const RealisticPin = ({ scale = 1 }: { scale?: number }) => (
        <div style={{ transform: `scale(${scale})` }} className="relative flex flex-col items-center justify-end w-10 h-10 filter drop-shadow-[0_4px_3px_rgba(0,0,0,0.2)]">
            {/* Pin Head (Sphere) */}
            <div className={`w-8 h-8 rounded-full ${pinColors.head} relative z-30 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)]`}>
                {/* Specular Highlight */}
                <div className={`absolute top-1.5 left-2 w-2.5 h-1.5 rounded-full ${pinColors.highlight} opacity-60 blur-[1px] transform -rotate-45`} />
            </div>

            {/* Pin Neck (Tapered connection) */}
            <div className={`w-3 h-3 -mt-2 ${pinColors.neck} z-20 rounded-sm`} />

            {/* Pin Base (Disc) */}
            <div className={`w-6 h-2 -mt-1 rounded-full ${pinColors.base} z-10 shadow-[0_2px_4px_rgba(0,0,0,0.3)]`} />
        </div>
    );

    return (
        <div className={`relative flex items-center justify-between w-full mb-12 ${isLeft ? 'flex-row-reverse' : ''}`}>
            {/* Center Line Connector */}
            <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center h-full">
                {/* Smaller 3D Pin on Line */}
                <div className="z-20 relative">
                    <RealisticPin scale={0.6} />
                </div>
                {/* Connecting Line - dashed */}
                <div className="w-0.5 grow border-l-2 border-dashed border-slate-300 absolute top-4 h-[calc(100%+32px)] opacity-50 -z-10" />
            </div>

            {/* Empty Space for the other side */}
            <div className="w-[45%]" />

            {/* Note Card */}
            <motion.div
                initial={{ opacity: 0, x: isLeft ? -50 : 50, rotate: 0 }}
                animate={{ opacity: 1, x: 0, rotate: rotation }}
                whileHover={{
                    scale: 1.02,
                    rotate: 0,
                    transition: { duration: 0.1, ease: "easeOut" }
                }}
                onClick={() => onEdit(note)}
                className={`
                    w-[45%] bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/60 relative cursor-pointer
                     group transition-all duration-300
                    ${isLeft ? 'origin-top-right' : 'origin-top-left'}
                `}
            >
                {/* Visual Pin on the card itself (Top Center) - Tilted with card (Static) */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
                    <RealisticPin />
                    {/* Pin Shadow on Paper */}
                    <div className="w-6 h-1.5 bg-black/20 rounded-full blur-[2px] mt-[-2px] ml-1" />
                </div>

                {/* Single Professional Number Badge (Removed duplicate watermark) */}
                <div className="mb-4 flex items-center justify-between">
                    <div className={`
                        px-3 py-1 rounded-full bg-white border ${pinColors.border} shadow-sm
                        text-xs font-black ${pinColors.text} tracking-widest uppercase flex items-center gap-1.5
                    `}>
                        <div className={`w-1.5 h-1.5 rounded-full ${pinColors.head}`}></div>
                        Step {String(index + 1).padStart(2, '0')}
                    </div>
                </div>

                <h3 className="font-bold text-slate-800 text-lg leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {note.title || 'Sarlavhasiz'}
                </h3>

                <p className="text-slate-600/80 text-sm leading-relaxed line-clamp-4 mb-3">
                    {note.content}
                </p>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs font-medium text-slate-400">
                    <span>
                        {note.createdAt?.toDate
                            ? format(note.createdAt.toDate(), 'd MMM, HH:mm', { locale: uz })
                            : 'Date unknown'}
                    </span>
                </div>
            </motion.div>
        </div>
    );
};

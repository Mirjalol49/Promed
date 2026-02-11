import React from 'react';
import { motion } from 'framer-motion';
import { Injection, InjectionStatus } from '../../types';
import { EmptyStateJourney } from './EmptyStateJourney';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useAppSounds } from '../../hooks/useAppSounds';
import confetti from 'canvas-confetti';
import injectionMascot from '../../components/mascot/injection_mascot.png';
import { Plus, Check, X, Clock, Edit2, Trash2 } from 'lucide-react';

interface InjectionTimelineProps {
    injections: Injection[];
    onAddInjection: () => void;
    onEditInjection: (injection: Injection) => void;
    onDeleteInjection: (id: string, e: React.MouseEvent) => void;
    onUpdateStatus: (id: string, status: InjectionStatus) => void;
}

export const InjectionTimeline: React.FC<InjectionTimelineProps> = ({
    injections,
    onAddInjection,
    onEditInjection,
    onDeleteInjection,
    onUpdateStatus
}) => {
    const { t } = useLanguage();
    const { activeToast } = useToast();
    const { playConfetti } = useAppSounds();

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 30 },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 120,
                damping: 15
            } as const
        }
    };

    return (
        <div className="bg-white rounded-3xl border-2 border-solid border-promed-primary/60 shadow-apple flex flex-col relative overflow-hidden">

            <div className="relative">
                {/* 1. Header Area (Static) */}
                <div className="p-5 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 z-30 bg-white/95 backdrop-blur-md border-b border-solid border-promed-primary/20 rounded-t-3xl transition-all duration-300">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            {t('injection_schedule')}
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                                {injections.length}
                            </span>
                        </h3>

                    </div>

                    <button
                        onClick={onAddInjection}
                        className="btn-premium-blue !px-4 !py-2 text-xs shadow-lg shadow-promed-primary/20 hover:shadow-promed-primary/40 hover:-translate-y-0.5 transition-all"
                    >
                        <Plus size={16} className="relative z-10" />
                        <span>{t('add_injection')}</span>
                    </button>
                </div>

                {/* 2. Timeline Content */}
                <div className="px-6 md:px-8 pt-4 pb-12">

                    {injections.length === 0 ? (
                        <EmptyStateJourney onAdd={onAddInjection} />
                    ) : (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="relative ml-5 space-y-0" // Removed space-y-10, handling spacing manually or via padding
                        >
                            {injections.map((inj, index) => {
                                const activeIndex = injections.findIndex(i => i.status === InjectionStatus.SCHEDULED);
                                // If all completed, activeIndex is -1.

                                const isDone = inj.status === InjectionStatus.COMPLETED;
                                const isMissed = inj.status === InjectionStatus.MISSED;
                                const isScheduled = inj.status === InjectionStatus.SCHEDULED;

                                // "Active" is the NEXT scheduled item
                                const isActive = activeIndex !== -1 ? index === activeIndex : false;
                                // "Future" is any scheduled item AFTER the active one
                                const isFuture = activeIndex !== -1 && index > activeIndex;

                                const isLast = index === injections.length - 1;

                                return (
                                    <motion.div
                                        key={inj.id}
                                        variants={cardVariants}
                                        className={`relative pl-8 pb-12 group ${isLast ? 'pb-0' : ''}`}
                                    >
                                        {/* SEGMENTED CONNECTION LINE (The Spine) */}
                                        {!isLast && (
                                            <div
                                                className={`absolute left-[8px] top-8 h-[calc(100%+3rem)] z-0 w-[2px]
                                                    ${isDone && injections[index + 1]?.status === InjectionStatus.COMPLETED
                                                        ? 'bg-emerald-500' // History (Done -> Done)
                                                        : isDone && injections[index + 1]?.status === InjectionStatus.SCHEDULED
                                                            ? 'bg-promed-primary' // Done -> Active (Connects last completed to current)
                                                            : 'border-l-2 border-dashed border-slate-300 left-[8px] bg-transparent' // Future (Dashed)
                                                    }
                                                `}
                                            />
                                        )}

                                        {/* THE CONNECTOR NODE */}
                                        <div className={`
                                          absolute -left-[9px] top-6 
                                          w-9 h-9 rounded-full border-[3px] z-20
                                          transition-all duration-500 flex items-center justify-center
                                          ${isDone ? 'bg-emerald-500 border-emerald-100 shadow-lg shadow-emerald-200 ring-4 ring-emerald-50' :
                                                isActive ? 'bg-white border-promed-primary shadow-[0_0_0_4px_rgba(0,51,255,0.2)] animate-[pulse_8s_ease-in-out_infinite]' :
                                                    'bg-slate-50 border-slate-300' // Future
                                            }
                                        `}>
                                            {isDone && <Check size={16} className="text-white font-bold" strokeWidth={3} />}
                                            {isActive && <div className="w-3 h-3 bg-promed-primary rounded-full" />}
                                            {isFuture && <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300" />}
                                            {isMissed && <X size={16} className="text-white" strokeWidth={3} />}
                                        </div>

                                        {/* THE CARD */}
                                        <div className={`
                                            p-5 rounded-2xl border transition-all duration-300 
                                            flex flex-col md:flex-row justify-between items-start group/card relative overflow-hidden pr-5 gap-4 md:gap-0
                                            ${isActive
                                                ? 'bg-white border-promed-primary/10 shadow-apple opacity-100 scale-100'
                                                : isFuture
                                                    ? 'bg-slate-50 border-slate-100 shadow-none opacity-60 hover:opacity-100'
                                                    : 'bg-promed-light/60 border-promed-primary/10 shadow-sm opacity-100' // Completed/Done style
                                            }
                                        `}>

                                            {/* Rest of Card Content (Keep largely same but adapted styles if needed) */}
                                            {/* Hover Gloss Effect (Only for Active/Done) */}
                                            {!isFuture && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-150%] group-hover/card:animate-shimmer pointer-events-none" />
                                            )}

                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <h4 className={`font-black text-base ${isDone ? 'text-emerald-700' : isActive ? 'text-promed-primary' : 'text-slate-500'}`}>
                                                        {t('injection')} #{index + 1}
                                                    </h4>

                                                    {/* ACTIONS (Edit & Delete) */}
                                                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onEditInjection(inj); }}
                                                            className="p-1.5 text-slate-400 hover:text-promed-primary hover:bg-slate-100 rounded-lg transition-colors"
                                                            title={t('edit')}
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onDeleteInjection(inj.id, e); }}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors"
                                                            title={t('delete')}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-start gap-1 mt-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-slate-400 text-xs font-semibold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 whitespace-nowrap">
                                                            {(() => {
                                                                const [datePart] = inj.date.split('T');
                                                                return datePart.split('-').reverse().join('.');
                                                            })()}
                                                        </span>
                                                        {inj.date.includes('T') && (
                                                            <span className={`text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-md border flex items-center gap-1 whitespace-nowrap
                                                                ${isActive ? 'bg-promed-light text-promed-primary border-promed-primary/10' : 'text-slate-400 bg-slate-50 border-slate-100'}
                                                            `}>
                                                                <Clock size={10} />
                                                                {inj.date.split('T')[1].substring(0, 5)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {inj.notes && (
                                                        <span className="text-slate-500 text-xs font-medium break-words mt-0.5">
                                                            {inj.notes}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="w-full md:w-auto flex md:flex-col items-end md:items-end justify-between md:justify-center gap-2">
                                                {isScheduled ? (
                                                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                                        {isActive ? (
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    playConfetti();
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    const x = (rect.left + rect.width / 2) / window.innerWidth;
                                                                    const y = (rect.top + rect.height / 2) / window.innerHeight;
                                                                    onUpdateStatus(inj.id, InjectionStatus.COMPLETED);
                                                                    confetti({ particleCount: 150, spread: 60, origin: { x, y }, zIndex: 9999 });
                                                                }}
                                                                className="btn-premium-emerald flex-1 md:flex-none !px-6 !py-2 !text-xs shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 z-20 whitespace-nowrap"
                                                            >
                                                                <Check size={14} strokeWidth={3} />
                                                                <span>{t('status_completed')}</span>
                                                            </motion.button>
                                                        ) : (
                                                            /* Future State Button/Label */
                                                            <span className="text-xs font-bold text-slate-400 px-3 py-1 rounded-full border border-slate-200 bg-white">
                                                                {t('status_scheduled')}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <motion.span
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onUpdateStatus(inj.id, InjectionStatus.SCHEDULED);
                                                        }}
                                                        className={`
                                                        w-full md:w-auto text-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border cursor-pointer hover:opacity-80 transition-opacity
                                                        ${isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                isMissed ? 'bg-red-50 text-red-600 border-red-100' : ''}
                                                    `}>
                                                        {isDone ? t('status_completed') : isMissed ? t('status_missed') : t('status_scheduled')}
                                                    </motion.span>
                                                )}
                                            </div>

                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* SPACER for Mascot (Outside sticky scope) */}
            {injections.length > 0 && <div className="h-56 w-full" />}

            {/* 3. THE MASCOT (Absolute at Bottom Right - Smart Hide on Toast) */}
            {injections.length > 0 && (
                <motion.div
                    initial={{ opacity: 1, y: 0 }}
                    animate={{
                        opacity: activeToast ? 0 : 1,
                        y: activeToast ? 20 : 0
                    }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="absolute bottom-0 right-0 z-30 pointer-events-none h-64 w-64 flex items-end justify-end"
                >
                    <motion.img
                        src={injectionMascot}
                        alt="Dr Koala"
                        whileHover={{
                            scale: 1.05,
                            rotate: -2,
                            y: -5,
                            transition: { type: "spring", stiffness: 400, damping: 10 }
                        }}
                        className="w-full h-full object-contain relative z-20 pointer-events-auto cursor-pointer"
                        style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.15))" }}
                    />
                </motion.div>
            )}

            {/* 3. THE MASCOT (Fixed at Bottom Right) */}


        </div>
    );
};

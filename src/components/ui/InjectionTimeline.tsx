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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-premium flex flex-col relative">

            {/* 1. Header Area (Stays Fixed at Top ONLY when items exist) */}
            <div className={`p-6 md:p-8 flex justify-between items-center z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100/50 rounded-t-2xl ${injections.length > 0 ? 'sticky top-0' : ''}`}>
                <div>
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        {t('injection_schedule')}
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                            {injections.length}
                        </span>
                    </h3>
                    <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-wider pl-1">{t('journey_of_recovery')}</p>
                </div>

                <button
                    onClick={onAddInjection}
                    className="btn-premium-blue !px-4 !py-2 text-xs shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all"
                >
                    <Plus size={16} className="relative z-10" />
                    <span>{t('add_injection')}</span>
                </button>
            </div>

            {/* 2. Timeline Content (Grows freely) */}
            <div className="px-6 md:px-8 pt-4">

                {/* Phantom Padding for Mascot Clearance (Only when injections exist) */}
                <div className={injections.length > 0 ? "pb-64" : "pb-6"}>

                    {injections.length === 0 ? (
                        <EmptyStateJourney onAdd={onAddInjection} />
                    ) : (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="relative border-l-4 border-slate-100 ml-3 space-y-10 pb-12"
                        >
                            {/* The "Living Line" that draws itself */}
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "100%" }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                className="absolute left-[-4px] w-1 bg-gradient-to-b from-emerald-400 via-blue-400 to-slate-200 rounded-full"
                            />

                            {injections.map((inj, index) => {
                                const isDone = inj.status === InjectionStatus.COMPLETED;
                                const isMissed = inj.status === InjectionStatus.MISSED;
                                const isScheduled = inj.status === InjectionStatus.SCHEDULED;

                                return (
                                    <motion.div
                                        key={inj.id}
                                        variants={cardVariants}
                                        className="relative pl-8 group cursor-pointer"
                                        onClick={() => onEditInjection(inj)}
                                    >

                                        {/* THE CONNECTOR NODE */}
                                        <div className={`
                         absolute -left-[11px] top-6 
                         w-6 h-6 rounded-full border-4 border-white shadow-sm z-10
                         transition-all duration-500 flex items-center justify-center
                         ${isDone ? 'bg-emerald-500 scale-110' :
                                                isMissed ? 'bg-red-500' :
                                                    'bg-white border-blue-500 ring-4 ring-blue-50'}
                       `}>
                                            {isScheduled && (
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                            )}
                                            {isDone && <Check size={12} className="text-white" />}
                                            {isMissed && <X size={12} className="text-white" />}
                                        </div>

                                        {/* THE CARD */}
                                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 
                                      hover:shadow-lg hover:border-blue-100/50 
                                      transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.01]
                                      flex justify-between items-center group/card relative overflow-hidden pr-5">

                                            {/* Hover Gloss Effect */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-150%] group-hover/card:animate-shimmer pointer-events-none" />

                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h4 className={`font-bold text-base ${isDone ? 'text-emerald-700' : 'text-slate-800'}`}>
                                                        {t('injection')} #{index + 1}
                                                    </h4>

                                                    {/* ACTIONS (Edit & Delete) - Inline with Title, Reveal on Hover */}
                                                    <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onEditInjection(inj);
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 rounded-lg transition-colors"
                                                            title={t('edit')}
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteInjection(inj.id, e);
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors"
                                                            title={t('delete')}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-slate-400 text-xs font-semibold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                                        {inj.date.split('-').reverse().join('.')}
                                                    </span>
                                                    {inj.notes && (
                                                        <span className="text-slate-400 text-xs truncate max-w-[150px] italic">
                                                            — {inj.notes}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-2">
                                                {isScheduled ? (
                                                    <div className="flex items-center gap-2">
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                playConfetti();

                                                                // Calculate origin from button position
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                const x = (rect.left + rect.width / 2) / window.innerWidth;
                                                                const y = (rect.top + rect.height / 2) / window.innerHeight;

                                                                confetti({
                                                                    particleCount: 150,
                                                                    spread: 60,
                                                                    origin: { x, y },
                                                                    zIndex: 9999
                                                                });
                                                                onUpdateStatus(inj.id, InjectionStatus.COMPLETED);
                                                            }}
                                                            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-emerald-200 text-emerald-600 rounded-xl text-xs font-bold shadow-sm hover:shadow-md hover:bg-emerald-50 transition-all z-20"
                                                        >
                                                            <Check size={14} strokeWidth={3} />
                                                            <span>{t('status_completed')}</span>
                                                        </motion.button>

                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onUpdateStatus(inj.id, InjectionStatus.MISSED);
                                                            }}
                                                            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-rose-200 text-rose-500 rounded-xl text-xs font-bold shadow-sm hover:shadow-md hover:bg-rose-50 transition-all z-20"
                                                        >
                                                            <X size={14} strokeWidth={3} />
                                                            <span>{t('status_missed')}</span>
                                                        </motion.button>
                                                    </div>
                                                ) : (
                                                    <span className={`
                                                        px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border
                                                        ${isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                            isMissed ? 'bg-red-50 text-red-600 border-red-100' :
                                                                'bg-blue-50 text-blue-600 border-blue-100'}
                                                    `}>
                                                        {isDone ? t('status_completed') : isMissed ? t('status_missed') : t('status_scheduled')}
                                                    </span>
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
                            scale: 1.1,
                            rotate: -5,
                            y: -10,
                            transition: { type: "spring", stiffness: 400, damping: 10 }
                        }}
                        className="w-52 h-52 object-contain relative z-20 pointer-events-auto cursor-pointer"
                        style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.15))" }}
                    />
                </motion.div>
            )}

            {/* 3. THE MASCOT (Fixed at Bottom Right) */}


        </div>
    );
};

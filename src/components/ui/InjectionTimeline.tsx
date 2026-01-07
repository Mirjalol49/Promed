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

            <div className="relative">
                {/* 1. Header Area (Static) */}
                <div className="p-5 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100/50 rounded-t-2xl transition-all duration-300">
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

                {/* 2. Timeline Content */}
                <div className="px-6 md:px-8 pt-4 pb-12">

                    {injections.length === 0 ? (
                        <EmptyStateJourney onAdd={onAddInjection} />
                    ) : (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="relative border-l-4 border-slate-100 ml-3 space-y-10"
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
                                        className="relative pl-8 group"
                                    >

                                        {/* THE CONNECTOR NODE */}
                                        <div className={`
                                          absolute -left-[1.15rem] top-6 
                                          w-8 h-8 rounded-full border-[3px] border-white shadow-md z-10
                                          transition-all duration-500 flex items-center justify-center
                                          ${isDone ? 'bg-emerald-500 scale-110 shadow-emerald-200' :
                                                isMissed ? 'bg-red-500' :
                                                    'bg-white border-blue-500 ring-4 ring-blue-50'}
                                        `}>
                                            {isScheduled && (
                                                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                                            )}
                                            {isDone && <Check size={16} className="text-white font-bold" strokeWidth={3} />}
                                            {isMissed && <X size={16} className="text-white" strokeWidth={3} />}
                                        </div>

                                        {/* THE CARD */}
                                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 
                                      hover:shadow-lg hover:border-blue-100/50 
                                      transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.01]
                                       flex flex-col md:flex-row justify-between items-start group/card relative overflow-hidden pr-5 gap-4 md:gap-0">

                                            {/* Hover Gloss Effect */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-150%] group-hover/card:animate-shimmer pointer-events-none" />

                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <h4 className={`font-bold text-base ${isDone ? 'text-emerald-700' : 'text-slate-800'}`}>
                                                        {t('injection')} #{index + 1}
                                                    </h4>

                                                    {/* ACTIONS (Edit & Delete) - Inline with Title, Reveal on Hover */}
                                                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
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

                                                <div className="flex flex-col items-start gap-1 mt-1">
                                                    <span className="text-slate-400 text-xs font-semibold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                                        {inj.date.split('-').reverse().join('.')}
                                                    </span>
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
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                playConfetti();
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
                                                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-6 py-2 bg-white border border-emerald-200 text-emerald-600 rounded-xl text-xs font-bold shadow-sm hover:shadow-md hover:bg-emerald-50 transition-all z-20 whitespace-nowrap"
                                                        >
                                                            <Check size={14} strokeWidth={3} />
                                                            <span>{t('status_completed')}</span>
                                                        </motion.button>
                                                    </div>
                                                ) : (
                                                    <motion.span
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Allow resetting status by clicking the badge
                                                            onUpdateStatus(inj.id, InjectionStatus.SCHEDULED);
                                                        }}
                                                        className={`
                                                        w-full md:w-auto text-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border cursor-pointer hover:opacity-80 transition-opacity
                                                        ${isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                isMissed ? 'bg-red-50 text-red-600 border-red-100' :
                                                                    'bg-blue-50 text-blue-600 border-blue-100'}
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

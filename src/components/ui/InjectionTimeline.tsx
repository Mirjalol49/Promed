import React from 'react';
import { motion } from 'framer-motion';
import { Injection, InjectionStatus } from '../../types';
import { EmptyStateJourney } from './EmptyStateJourney';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useAppSounds } from '../../hooks/useAppSounds';
import confetti from 'canvas-confetti';
import injectionMascot from '../../components/mascot/injection_mascot.png';
import { Plus, Clock, Edit2, Trash2, ShieldCheck, HeartPulse, Droplets, CheckCircle2, X, Check } from 'lucide-react';
import injectSvg from '../../assets/images/mascots/inject.svg';

interface InjectionTimelineProps {
    injections: Injection[];
    onAddInjection: () => void;
    onEditInjection: (injection: Injection) => void;
    onDeleteInjection: (id: string, e: React.MouseEvent) => void;
    onUpdateStatus: (id: string, status: InjectionStatus) => void;

    readOnly?: boolean;
    initialInjectionId?: string;
}

export const InjectionTimeline: React.FC<InjectionTimelineProps> = ({
    injections,
    onAddInjection,
    onEditInjection,
    onDeleteInjection,
    onUpdateStatus,
    readOnly = false,
    initialInjectionId
}) => {
    const { t } = useLanguage();
    const { activeToast } = useToast();
    const { playConfetti } = useAppSounds();

    // Scroll to initial injection on mount
    // Scroll to initial injection on mount
    React.useEffect(() => {
        if (initialInjectionId) {
            // Instant scroll attempt first
            const immediateElement = document.getElementById(`injection-${initialInjectionId}`);
            if (immediateElement) {
                immediateElement.scrollIntoView({ behavior: 'auto', block: 'center' });
            }

            // Smooth scroll adjustment after short delay to handle layout shifts
            setTimeout(() => {
                const element = document.getElementById(`injection-${initialInjectionId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Add momentary highlight
                    element.classList.add('ring-4', 'ring-promed-primary/30');
                    setTimeout(() => {
                        element.classList.remove('ring-4', 'ring-promed-primary/30');
                    }, 2000);
                }
            }, 100);
        }
    }, [initialInjectionId]);

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: initialInjectionId ? 1 : 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: initialInjectionId ? 0 : 0.15
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: initialInjectionId ? 1 : 0, y: initialInjectionId ? 0 : 30 },
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

                    {!readOnly && (
                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                            onClick={onAddInjection}
                            className="btn-premium-blue shadow-lg shadow-promed-primary/20 hover:shadow-promed-primary/40 hover:-translate-y-0.5 transition-all"
                        >
                            <Plus size={18} className="relative z-10" />
                            <span>{t('add_injection')}</span>
                        </motion.button>
                    )}
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
                                        className={`relative pl-8 pb-12 group ${isLast ? 'pb-0' : ''} transition-all duration-500 rounded-3xl`}
                                    >
                                        {/* SEGMENTED CONNECTION LINE (The Spine) */}
                                        {!isLast && (
                                            <div
                                                className={`absolute left-[7px] top-8 h-[calc(100%+3rem)] z-0 w-[3px] rounded-full
                                                    ${isDone && injections[index + 1]?.status === InjectionStatus.COMPLETED
                                                        ? 'bg-emerald-200' // Past: Soft Mint Green
                                                        : isDone && injections[index + 1]?.status === InjectionStatus.SCHEDULED
                                                            ? 'bg-gradient-to-b from-emerald-200 to-sky-200' // Transition
                                                            : 'border-l-[3px] border-dashed border-slate-200 left-[7px] bg-transparent w-0' // Future: Dashed
                                                    }
                                                `}
                                            />
                                        )}

                                        {/* THE CONNECTOR NODE */}
                                        <div className={`
                                          absolute -left-[11px] top-6 
                                          w-10 h-10 rounded-full border-[3px] z-20
                                          transition-all duration-500 flex items-center justify-center group/node cursor-default overflow-visible
                                          ${isDone ? 'bg-emerald-500 border-white shadow-sm scale-105' :
                                                isActive ? 'bg-gradient-to-b from-[#4A85FF] to-[#0044FF] border-white shadow-lg shadow-blue-200 scale-110 z-30' :
                                                    'bg-white border-slate-100 scale-90' // Future
                                            }
                                        `}>
                                            {isDone && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                >
                                                    <Check size={20} className="text-white" strokeWidth={3} />
                                                </motion.div>
                                            )}
                                            {isActive && (
                                                <div className="absolute inset-0 flex items-center justify-center p-2.5 pointer-events-none">
                                                    <img src={injectSvg} alt="Injecting" className="w-full h-full object-contain drop-shadow-sm" />
                                                </div>
                                            )}
                                            {isFuture && <div className="w-3 h-3 rounded-full bg-slate-200/50" />}
                                            {isMissed && <X size={18} className="text-red-400" strokeWidth={3} />}

                                            {/* Hover Tooltip for Validation */}
                                            {isDone && (
                                                <div className="absolute left-12 bg-emerald-800 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover/node:opacity-100 transition-opacity whitespace-nowrap shadow-xl pointer-events-none">
                                                    {t('medically_verified') || "Medically Verified"}
                                                </div>
                                            )}
                                        </div>

                                        {/* THE CARD */}
                                        <div
                                            id={`injection-${inj.id}`}
                                            className={`
                                            p-6 rounded-3xl border transition-all duration-1000 
                                            flex flex-col md:flex-row justify-between items-start group/card relative overflow-hidden pr-6 gap-4 md:gap-0
                                            ${isActive
                                                    ? 'bg-sky-50/50 border-sky-100 shadow-[0_4px_20px_-5px_rgba(14,165,233,0.1)] opacity-100 scale-100' // Whimsical Sky Active

                                                    : isFuture
                                                        ? 'bg-white border-slate-50 shadow-sm opacity-80 hover:opacity-100 hover:-translate-y-1 hover:shadow-md' // Floating Future
                                                        : 'bg-emerald-50/40 border-emerald-100/50 shadow-none opacity-100' // Gentle Past
                                                }
                                        `}>

                                            {/* Rest of Card Content (Keep largely same but adapted styles if needed) */}
                                            {/* Hover Gloss Effect (Only for Active/Done) */}
                                            {!isFuture && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-150%] group-hover/card:animate-shimmer pointer-events-none" />
                                            )}

                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <h4 className={`font-bold text-lg tracking-tight ${isDone ? 'text-emerald-700' : isActive ? 'text-sky-700' : 'text-slate-400'}`}>
                                                        {t('injection')} #{index + 1}
                                                    </h4>

                                                    {/* ACTIONS (Edit & Delete) */}
                                                    {/* ACTIONS (Edit & Delete) */}
                                                    {!readOnly && (
                                                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                                onClick={(e) => { e.stopPropagation(); onEditInjection(inj); }}
                                                                className="p-1.5 text-slate-400 hover:text-promed-primary hover:bg-slate-100 rounded-lg transition-colors"
                                                                title={t('edit')}
                                                            >
                                                                <Edit2 size={14} />
                                                            </motion.button>
                                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                                onClick={(e) => { e.stopPropagation(); onDeleteInjection(inj.id, e); }}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors"
                                                                title={t('delete')}
                                                            >
                                                                <Trash2 size={14} />
                                                            </motion.button>
                                                        </div>
                                                    )}
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
                                                            <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border flex items-center gap-1.5 whitespace-nowrap
                                                        ${isActive ? 'bg-sky-100/50 text-sky-600 border-sky-200' : 'text-slate-400 bg-slate-50 border-slate-100'}
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
                                                                    confetti({
                                                                        particleCount: 100,
                                                                        spread: 70,
                                                                        origin: { x, y },
                                                                        zIndex: 9999,
                                                                        colors: ['#34d399', '#6ee7b7', '#059669', '#a7f3d0'] // Minty confetti
                                                                    });
                                                                }}
                                                                className="btn-glossy-emerald !py-2.5 !px-6 text-sm shadow-emerald-500/20 hover:shadow-emerald-500/40"
                                                            >
                                                                {/* Removing manual gloss divs as they are in the class now */}

                                                                <div className="relative flex items-center gap-2 z-10">
                                                                    <CheckCircle2 size={18} strokeWidth={2.5} />
                                                                    <span className="mb-0.5">{t('mark_done')}</span>
                                                                </div>
                                                            </motion.button>
                                                        ) : (
                                                            /* Future State Button/Label */
                                                            /* Future State Button/Label */
                                                            <span className="text-xs font-bold text-slate-400 px-3 py-1 rounded-xl border border-slate-200 bg-white">
                                                                {t('status_scheduled')}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <motion.span
                                                        whileHover={!readOnly ? { scale: 1.05 } : {}}
                                                        whileTap={!readOnly ? { scale: 0.95 } : {}}
                                                        onClick={(e) => {
                                                            if (readOnly) return;
                                                            e.stopPropagation();
                                                            onUpdateStatus(inj.id, InjectionStatus.SCHEDULED);
                                                        }}
                                                        className={`
                                                        w-full md:w-auto text-center px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide border ${!readOnly ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default opacity-80'}
                                                        ${isDone ? 'bg-emerald-100/50 text-emerald-600 border-emerald-200' :
                                                                isMissed ? 'bg-red-50 text-red-500 border-red-100' : ''}
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

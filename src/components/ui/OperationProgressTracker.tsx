import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Play, Square, User, Clock, CheckCircle2,
    Trash2, Plus, Stethoscope, Check, Timer, ChevronDown, RotateCcw
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccount } from '../../contexts/AccountContext';
import { subscribeToStaff } from '../../lib/staffService';
import { Staff } from '../../types';
import ConfirmationModal from './ConfirmationModal';
import { subscribeToTracker, updateTracker, OperationTrackerState } from '../../lib/operationTrackerService';

interface Step {
    id: string;
    title: string;
    doctor: string;
    durationMinutes: number;
}

interface OperationState {
    steps: Step[];
    status: 'setup' | 'running' | 'completed';
    currentStepIndex: number;
    stepStartTime: number | null;
}

const STORAGE_KEY_PREFIX = 'promed_op_tracker_';

export const OperationProgressTracker: React.FC<{ patientId: string }> = ({ patientId }) => {
    const { t, language } = useLanguage();
    const { accountId } = useAccount();

    // 1. Firebase Persistency
    const [state, setState] = useState<OperationState>({
        steps: [],
        status: 'setup',
        currentStepIndex: 0,
        stepStartTime: null
    });

    useEffect(() => {
        const unsubscribe = subscribeToTracker(patientId, (data) => {
            if (data) {
                // Ignore identical updates to prevent infinite loops / re-rendering issues
                setState(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
                    return data as OperationState;
                });
            }
        });
        return () => unsubscribe();
    }, [patientId]);

    const setSharedState = (updater: OperationState | ((prev: OperationState) => OperationState)) => {
        setState(prev => {
            const nextState = typeof updater === 'function' ? updater(prev) : updater;
            if (JSON.stringify(prev) !== JSON.stringify(nextState)) {
                updateTracker(patientId, nextState as OperationTrackerState).catch(console.error);
            }
            return nextState;
        });
    };

    const [newTitle, setNewTitle] = useState('');
    const [newDoctor, setNewDoctor] = useState('');
    const [durationHours, setDurationHours] = useState('');
    const [now, setNow] = useState(Date.now());
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    // For Staff Dropdown
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!accountId) return;
        const unsubscribe = subscribeToStaff(accountId, (data) => {
            setStaffList(data.filter(s => s.status === 'active'));
        }, (err) => console.error(err));
        return () => unsubscribe();
    }, [accountId]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDoctorDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 2. Timer Loop
    useEffect(() => {
        if (state.status !== 'running') return;

        const interval = setInterval(() => {
            const currentTime = Date.now();
            setNow(currentTime);

            // Automatically advance when timer runs out
            if (state.stepStartTime) {
                let currentIdx = state.currentStepIndex;
                let startTime = state.stepStartTime;
                let changed = false;

                while (currentIdx < state.steps.length) {
                    const step = state.steps[currentIdx];
                    const elapsed = currentTime - startTime;
                    const totalDuration = step.durationMinutes * 60 * 1000;

                    if (elapsed >= totalDuration) {
                        currentIdx++;
                        startTime += totalDuration; // Fast-forward baseline by exact step length
                        changed = true;
                    } else {
                        break;
                    }
                }

                if (changed) {
                    if (currentIdx < state.steps.length) {
                        setSharedState(prev => ({
                            ...prev,
                            currentStepIndex: currentIdx,
                            stepStartTime: startTime
                        }));
                    } else {
                        setSharedState(prev => ({
                            ...prev,
                            status: 'completed',
                            currentStepIndex: prev.steps.length > 0 ? prev.steps.length - 1 : 0,
                            stepStartTime: null
                        }));
                    }
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [state.status, state.currentStepIndex, state.steps, state.stepStartTime]);

    // 3. Actions
    const addStep = () => {
        if (!newTitle) return;
        const h = parseInt(durationHours) || 0;
        const totalMin = h * 60;

        if (totalMin <= 0) return;

        setSharedState(prev => ({
            ...prev,
            steps: [...prev.steps, {
                id: `step_${Date.now()}`,
                title: newTitle,
                doctor: newDoctor || t('doctor_staff') || 'TBD',
                durationMinutes: totalMin
            }]
        }));

        setNewTitle('');
        setNewDoctor('');
        setDurationHours('');
    };

    const removeStep = (id: string) => {
        setSharedState(prev => ({
            ...prev,
            steps: prev.steps.filter(s => s.id !== id)
        }));
    };

    const startOperation = () => {
        if (state.steps.length === 0) return;
        setSharedState(prev => ({
            ...prev,
            status: 'running',
            currentStepIndex: 0,
            stepStartTime: Date.now()
        }));
    };

    const confirmResetOperation = () => {
        setSharedState({
            steps: [],
            status: 'setup',
            currentStepIndex: 0,
            stepStartTime: null
        });
        setIsResetModalOpen(false);
    };

    const completeCurrentStepEarly = () => {
        // Force completion of current step right now
        if (state.currentStepIndex + 1 < state.steps.length) {
            setSharedState(prev => ({
                ...prev,
                currentStepIndex: prev.currentStepIndex + 1,
                stepStartTime: Date.now()
            }));
        } else {
            setSharedState(prev => ({
                ...prev,
                status: 'completed',
                stepStartTime: null
            }));
        }
    };

    // 4. Formatting Helpers
    const formatTimeLeft = (elapsedMs: number, totalMin: number) => {
        const totalMs = totalMin * 60 * 1000;
        let leftMs = totalMs - elapsedMs;
        if (leftMs < 0) leftMs = 0;

        const h = Math.floor(leftMs / (1000 * 60 * 60));
        const m = Math.floor((leftMs % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((leftMs % (1000 * 60)) / 1000);

        if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatDuration = (min: number) => {
        const h = Math.floor(min / 60);
        const m = min % 60;
        const hrStr = t('hours_short') || 'Hrs';
        const minStr = t('minutes') || 'Min';
        if (h > 0 && m > 0) return `${h}${hrStr} ${m}${minStr}`;
        if (h > 0) return `${h}${hrStr}`;
        return `${m}${minStr}`;
    };

    // 5. Renderers
    const renderSetup = () => (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full relative">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">{t('step_title') || 'Step Title'}</label>
                    <input
                        type="text"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder={t('step_title_ph') || "e.g. Extraction Phase"}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-promed-primary focus:ring-2 focus:ring-promed-primary/20 transition-all outline-none"
                    />
                </div>
                <div className="flex-1 w-full relative" ref={dropdownRef}>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">{t('doctor_staff') || 'Doctor / Staff'}</label>
                    <button
                        type="button"
                        onClick={() => setIsDoctorDropdownOpen(!isDoctorDropdownOpen)}
                        className={`w-full bg-white border transition-all rounded-lg px-3 py-2 text-sm flex items-center justify-between outline-none text-left ${isDoctorDropdownOpen ? 'border-promed-primary ring-2 ring-promed-primary/20' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <span className={`truncate ${newDoctor ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                            {newDoctor || (t('select_staff') || 'Select Staff')}
                        </span>
                        <ChevronDown size={14} className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${isDoctorDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {isDoctorDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto"
                            >
                                {staffList.length === 0 ? (
                                    <div className="p-3 text-xs text-slate-500 text-center">{t('no_staff_found') || 'No staff found'}</div>
                                ) : (
                                    staffList.map(staff => (
                                        <button
                                            key={staff.id}
                                            type="button"
                                            onClick={() => {
                                                setNewDoctor(staff.fullName);
                                                setIsDoctorDropdownOpen(false);
                                            }}
                                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors group"
                                        >
                                            <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 relative">
                                                {staff.imageUrl ? (
                                                    <img src={staff.imageUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500 bg-slate-200">
                                                        {staff.fullName.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-full pointer-events-none"></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-slate-700 truncate group-hover:text-blue-600 transition-colors">{staff.fullName}</div>
                                                <div className="text-[10px] text-slate-400 uppercase tracking-widest">{t(`role_${staff.role}`) || staff.role}</div>
                                            </div>
                                            {newDoctor === staff.fullName && (
                                                <Check size={14} className="text-blue-600 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">{t('hours_short') || 'Hrs'}</label>
                        <input
                            type="number"
                            min="1"
                            value={durationHours}
                            onChange={e => setDurationHours(e.target.value)}
                            placeholder="1"
                            className="w-16 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-promed-primary transition-all outline-none text-center font-mono font-medium"
                        />
                    </div>
                </div>
                <button
                    onClick={addStep}
                    disabled={!newTitle || !durationHours}
                    className="h-[38px] px-4 bg-slate-900 border border-slate-800 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition active:scale-[0.98] disabled:opacity-50"
                >
                    <Plus size={16} />
                    <span className="text-sm font-medium">{t('add') || 'Add'}</span>
                </button>
            </div>

            <div className="space-y-2">
                <AnimatePresence>
                    {state.steps.map((step, idx) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                    {idx + 1}
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-800">{step.title}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] text-slate-500 flex items-center gap-1"><User size={10} />{step.doctor}</span>
                                        <span className="text-[10px] text-slate-300">•</span>
                                        <span className="text-[11px] text-slate-500 flex items-center gap-1"><Clock size={10} />{formatDuration(step.durationMinutes)}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => removeStep(step.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-2"
                                aria-label="Remove step"
                            >
                                <Trash2 size={16} />
                                <span className="sr-only">Remove</span>
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {state.steps.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 relative overflow-hidden isolate">
                        <Stethoscope className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-400">{t('no_operation_steps') || 'No operation steps defined'}</p>
                        <p className="text-xs text-slate-400/80 mt-1">{t('add_phases_ph') || 'Add phases e.g. Anesthesia, Extraction, Implantation'}</p>
                    </div>
                )}
            </div>

            {state.steps.length > 0 && (
                <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                        onClick={startOperation}
                        className="items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex gap-2 rounded-xl hover:shadow-md hover:from-blue-700 hover:to-indigo-700 transition active:scale-[0.98] font-semibold text-sm"
                    >
                        <Play size={16} fill="currentColor" />
                        {t('start_operation') || 'Start Operation'}
                    </button>
                </div>
            )}
        </div>
    );

    const renderRunning = () => (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6 pl-1 pr-1">
                <div className="flex items-center gap-2">
                    <div className="relative flex h-3 w-3">
                        {state.status === 'running' ? (
                            <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </>
                        ) : (
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        )}
                    </div>
                    <span className={`text-sm font-bold uppercase tracking-widest ${state.status === 'running' ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {state.status === 'running' ? (t('operation_active') || 'Operation Active') : (t('operation_successful') || 'Operation Successful')}
                    </span>
                </div>
                {state.status === 'running' ? (
                    <button
                        onClick={() => setIsResetModalOpen(true)}
                        className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1.5 transition-colors uppercase tracking-wider bg-slate-50 hover:bg-red-50 px-3 py-1.5 rounded-lg"
                    >
                        <Square size={12} fill="currentColor" /> {t('stop') || 'Stop'}
                    </button>
                ) : (
                    <button
                        onClick={() => setIsResetModalOpen(true)}
                        className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1.5 transition-colors uppercase tracking-wider bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition active:scale-[0.98]"
                    >
                        {t('reset_tracker') || 'Reset Tracker'}
                    </button>
                )}
            </div>

            <div className="space-y-0">
                {state.steps.map((step, idx) => {
                    const isPast = state.status === 'completed' || idx < state.currentStepIndex;
                    const isCurrent = state.status === 'running' && idx === state.currentStepIndex;
                    const isFuture = state.status === 'running' && idx > state.currentStepIndex;

                    const elapsed = isCurrent && state.stepStartTime ? Math.max(0, now - state.stepStartTime) : 0;
                    const totalDurationMs = step.durationMinutes * 60 * 1000;
                    const progressPercent = isCurrent ? Math.min(100, (elapsed / totalDurationMs) * 100) : (isPast ? 100 : 0);

                    const staffMember = staffList.find(s => s.fullName === step.doctor);

                    return (
                        <div key={step.id} className="flex items-stretch group">
                            {/* Marker Column */}
                            <div className="flex flex-col items-center mr-4 md:mr-6 w-8 mt-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors duration-300 z-10 
                                    ${isPast ? 'border-emerald-500 text-emerald-500 bg-emerald-50' :
                                        isCurrent ? 'border-blue-500 text-blue-600 bg-white ring-4 ring-blue-50' :
                                            'border-slate-200 text-slate-400 bg-white font-medium'}
                                `}>
                                    {isPast ? <Check size={14} strokeWidth={3} /> : <span className="text-sm font-bold pt-[1px]">{idx + 1}</span>}
                                </div>
                                {/* Line connecting to next */}
                                {idx < state.steps.length - 1 && (
                                    <div className="w-[2px] grow bg-slate-100 my-2 rounded-full min-h-[20px]"></div>
                                )}
                            </div>

                            {/* Content Column */}
                            <div className={`flex-1 pb-6 ${isFuture ? 'opacity-50 grayscale' : ''}`}>
                                <div className={`bg-white border rounded-2xl p-4 md:p-5 shadow-sm overflow-hidden transition-all duration-300 ${isCurrent ? 'border-blue-200 ring-1 ring-blue-50 hover:shadow-md' : isPast ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100 border-dashed'}`}>
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex items-start gap-3.5">
                                            {/* Doctor Avatar */}
                                            <div className={`w-11 h-11 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-sm border-[2px] ${isCurrent ? 'border-blue-100 ring-2 ring-blue-50' : 'border-white ring-1 ring-slate-100'}`}>
                                                {staffMember?.imageUrl ? (
                                                    <img src={staffMember.imageUrl} alt={step.doctor} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-sm font-black text-slate-400 bg-gradient-to-br from-slate-100 to-slate-200">
                                                        {step.doctor ? step.doctor.charAt(0) : <User size={16} />}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-0.5">
                                                <h4 className={`text-base font-black tracking-tight ${isCurrent ? 'text-blue-900' : 'text-slate-800'}`}>{step.title}</h4>
                                                <div className="text-[13px] flex items-center gap-1.5 mt-1 font-bold text-slate-600">
                                                    {step.doctor}
                                                    {staffMember && staffMember.role && (
                                                        <span className="text-[9px] uppercase tracking-widest text-slate-400 ml-1 bg-slate-100/80 px-1.5 py-0.5 rounded border border-slate-200/50">
                                                            {t(`role_${staffMember.role}`) || staffMember.role}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Badge or Timer */}
                                        {isCurrent ? (
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 font-mono font-bold tracking-tight shadow-sm">
                                                    <Timer size={14} className="animate-pulse" />
                                                    {formatTimeLeft(elapsed, step.durationMinutes)}
                                                </div>
                                                <button onClick={completeCurrentStepEarly} className="text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-blue-600 transition-colors focus:outline-none rounded">
                                                    {t('skip') || 'Skip'} &rarr;
                                                </button>
                                            </div>
                                        ) : isPast ? (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100 shadow-sm">
                                                <CheckCircle2 size={14} /> {t('done') || 'Done'}
                                            </div>
                                        ) : (
                                            <div className="text-xs font-bold tracking-wide text-slate-400 flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                                <Clock size={13} /> {formatDuration(step.durationMinutes)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Perfect Progress Bar */}
                                    {isCurrent && (
                                        <div className="mt-5 flex flex-col gap-2.5">
                                            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                                <span>{t('progress') || 'Progress'}</span>
                                                <span className="text-blue-600">{Math.round(progressPercent)}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-linear shadow-inner" style={{ width: `${progressPercent}%` }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderCompleted = () => renderRunning();

    return (
        <div className="bg-white rounded-2xl p-6 shadow-apple border border-slate-200 mb-6">
            <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
                        <Activity size={20} />
                    </div>
                    {t('operation_progress') || 'Operation Progress'}
                </h3>
            </div>

            <div className="overflow-hidden">
                {state.status === 'setup' && renderSetup()}
                {(state.status === 'running' || state.status === 'completed') && renderRunning()}
            </div>

            <ConfirmationModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={confirmResetOperation}
                title={t('reset_tracker') || 'Reset Tracker'}
                description={t('reset_tracker_desc') || 'Are you sure you want to reset the operation and clear all progress? This action cannot be undone.'}
                icon={RotateCcw}
                variant="danger"
                cancelText={t('cancel')}
                confirmText={t('reset')}
            />
        </div>
    );
};

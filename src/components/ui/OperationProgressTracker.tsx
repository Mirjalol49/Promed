import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Play, Square, User, Clock, CheckCircle2,
    Trash2, Plus, Stethoscope, Check, Timer, ChevronDown, RotateCcw, X
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccount } from '../../contexts/AccountContext';
import { subscribeToStaff } from '../../lib/staffService';
import { Staff } from '../../types';
import ConfirmationModal from './ConfirmationModal';
import { subscribeToTracker, updateTracker, OperationTrackerData, OperationSession, TrackerStep } from '../../lib/operationTrackerService';
import { subscribeToTransactions } from '../../lib/financeService';
import { Transaction } from '../../types';
import { formatWithSpaces } from '../../lib/formatters';

const STORAGE_KEY_PREFIX = 'promed_op_tracker_';

export const OperationProgressTracker: React.FC<{ patientId: string }> = ({ patientId }) => {
    const { t, language } = useLanguage();
    const { accountId } = useAccount();

    const [dataState, setDataState] = useState<OperationTrackerData>({
        activeSessionId: 'session_1',
        sessions: [{
            id: 'session_1',
            name: 'Seans 1',
            steps: [],
            status: 'setup',
            currentStepIndex: 0,
            stepStartTime: null
        }]
    });

    const state = dataState.sessions.find(s => s.id === dataState.activeSessionId) || dataState.sessions[0];


    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        if (!accountId) return;
        const unsub = subscribeToTransactions(accountId, (allTx) => {
            setTransactions(allTx.filter(t => t.patientId === patientId && t.type === 'expense' && !t.isVoided && !t.returned));
        });
        return () => unsub();
    }, [accountId, patientId]);

    useEffect(() => {
        const unsubscribe = subscribeToTracker(patientId, (data) => {
            if (data) {
                setDataState(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
                    return data;
                });
            }
        });
        return () => unsubscribe();
    }, [patientId]);

    const setSharedState = (updater: OperationSession | ((prev: OperationSession) => OperationSession)) => {
        setDataState(prevData => {
            const currentSession = prevData.sessions.find(s => s.id === prevData.activeSessionId) || prevData.sessions[0];
            const nextSessionState = typeof updater === 'function' ? updater(currentSession) : updater;

            const nextSessions = prevData.sessions.map(s =>
                s.id === prevData.activeSessionId ? nextSessionState : s
            );

            const nextDataState = {
                ...prevData,
                sessions: nextSessions
            };

            if (JSON.stringify(prevData) !== JSON.stringify(nextDataState)) {
                updateTracker(patientId, nextDataState).catch(console.error);
            }
            return nextDataState;
        });
    };

    const [newTitle, setNewTitle] = useState('');
    const [newDoctors, setNewDoctors] = useState<string[]>([]);
    const [durationHours, setDurationHours] = useState('');
    const [now, setNow] = useState(Date.now());
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isDeleteSessionModalOpen, setIsDeleteSessionModalOpen] = useState(false);

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
                doctor: newDoctors.length > 0 ? newDoctors.join(', ') : t('doctor_staff') || 'TBD',
                durationMinutes: totalMin
            }]
        }));

        setNewTitle('');
        setNewDoctors([]);
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
        setSharedState(prev => ({
            ...prev,
            steps: [],
            status: 'setup',
            currentStepIndex: 0,
            stepStartTime: null
        }));
        setIsResetModalOpen(false);
    };

    const confirmDeleteSession = () => {
        setDataState(prev => {
            const nextSessions = prev.sessions.filter(s => s.id !== prev.activeSessionId);
            const nextDataState = {
                ...prev,
                sessions: nextSessions.length > 0 ? nextSessions : [{
                    id: `session_${Date.now()}`,
                    name: 'Seans 1',
                    steps: [],
                    status: 'setup' as const,
                    currentStepIndex: 0,
                    stepStartTime: null
                }],
                activeSessionId: nextSessions.length > 0 ? nextSessions[0].id : `session_${Date.now()}`
            };
            if (nextSessions.length === 0) {
                nextDataState.activeSessionId = nextDataState.sessions[0].id;
            }
            updateTracker(patientId, nextDataState as OperationTrackerData).catch(console.error);
            return nextDataState as OperationTrackerData;
        });
        setIsDeleteSessionModalOpen(false);
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
                        <span className={`truncate ${newDoctors.length > 0 ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                            {newDoctors.length > 0 ? newDoctors.join(', ') : (t('select_staff') || 'Select Staff')}
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
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (newDoctors.includes(staff.fullName)) {
                                                    setNewDoctors(newDoctors.filter(d => d !== staff.fullName));
                                                } else {
                                                    setNewDoctors([...newDoctors, staff.fullName]);
                                                }
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
                                            {newDoctors.includes(staff.fullName) && (
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
                <motion.button
                    whileTap={{ scale: 0.96 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={addStep}
                    disabled={!newTitle || !durationHours}
                    className="relative overflow-hidden shrink-0 h-[40px] px-6 text-white rounded-xl flex items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed group transition-all duration-300"
                    style={{
                        background: (!newTitle || !durationHours) ? '#cbd5e1' : 'linear-gradient(180deg, #4A85FF 0%, #0044FF 100%)',
                        boxShadow: (!newTitle || !durationHours) ? 'none' : '0 8px 16px -4px rgba(0, 68, 255, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.45), inset 0 -2px 1px rgba(0, 0, 0, 0.15)'
                    }}
                >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
                    <span className="text-sm tracking-wide">{t('add') || 'Add'}</span>
                </motion.button>
            </div>

            <div className="space-y-2">
                <AnimatePresence>
                    {state.steps.map((step, idx) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm gap-2"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-6 h-6 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                    {idx + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-semibold text-slate-800 truncate">{step.title}</h4>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className="text-[11px] text-slate-500 flex items-center gap-1 min-w-0"><User size={10} className="shrink-0" /><span className="truncate max-w-[120px]">{step.doctor}</span></span>
                                        <span className="text-[10px] text-slate-300 shrink-0">•</span>
                                        <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0"><Clock size={10} />{formatDuration(step.durationMinutes)}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => removeStep(step.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-2 shrink-0 bg-slate-50 rounded-lg"
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
                    <motion.button
                        whileTap={{ scale: 0.96 }}
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        onClick={startOperation}
                        className="relative overflow-hidden h-[44px] px-8 text-white rounded-xl flex items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg group transition-all duration-300"
                        style={{
                            background: 'linear-gradient(180deg, #4A85FF 0%, #0044FF 100%)',
                            boxShadow: '0 8px 16px -4px rgba(0, 68, 255, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.45), inset 0 -2px 1px rgba(0, 0, 0, 0.15)'
                        }}
                    >
                        <Play size={18} fill="currentColor" className="group-hover:scale-110 transition-transform duration-300" />
                        <span className="text-[15px] tracking-wide">{t('start_operation') || 'Start Operation'}</span>
                    </motion.button>
                </div>
            )}
        </div>
    );

    const renderRunning = () => (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-wrap justify-between items-center mb-5 md:mb-6 pl-1 pr-1 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="relative flex shrink-0 h-3 w-3">
                        {state.status === 'running' ? (
                            <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </>
                        ) : (
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        )}
                    </div>
                    <span className={`text-sm font-bold uppercase tracking-widest truncate ${state.status === 'running' ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {state.status === 'running' ? (t('operation_active') || 'Operation Active') : (t('operation_successful') || 'Operation Successful')}
                    </span>
                </div>
                {state.status === 'running' ? (
                    <button
                        onClick={() => setIsResetModalOpen(true)}
                        className="shrink-0 text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1.5 transition-colors uppercase tracking-wider bg-slate-50 hover:bg-red-50 px-3 py-1.5 rounded-lg"
                    >
                        <Square size={12} fill="currentColor" /> {t('stop') || 'Stop'}
                    </button>
                ) : (
                    <button
                        onClick={() => setIsResetModalOpen(true)}
                        className="shrink-0 text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1.5 transition-colors uppercase tracking-wider bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition active:scale-[0.98]"
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

                    const doctorNames = step.doctor ? step.doctor.split(',').map(n => n.trim()).filter(Boolean) : [];

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
                            <div className={`flex-1 min-w-0 pb-6 ${isFuture ? 'opacity-50 grayscale' : ''}`}>
                                <div className={`bg-white border rounded-2xl p-4 md:p-5 shadow-sm overflow-hidden transition-all duration-300 ${isCurrent ? 'border-blue-200 ring-1 ring-blue-50 hover:shadow-md' : isPast ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100 border-dashed'}`}>
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">

                                        {/* Left Side: Title & Doctors */}
                                        <div className="flex items-start w-full min-w-0">
                                            <div className="pt-0.5 w-full min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h4 className={`text-base font-black tracking-tight truncate ${isCurrent ? 'text-blue-900' : 'text-slate-800'}`}>{step.title}</h4>

                                                    {/* Mobile Only: Status Badge inline with title */}
                                                    <div className="sm:hidden shrink-0 mt-0.5">
                                                        {isCurrent ? (
                                                            <div className="flex flex-col items-end gap-1.5">
                                                                <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 font-mono font-bold tracking-tight shadow-sm text-[11px]">
                                                                    <Timer size={12} className="animate-pulse" />
                                                                    {formatTimeLeft(elapsed, step.durationMinutes)}
                                                                </div>
                                                                <button onClick={completeCurrentStepEarly} className="text-[9px] uppercase tracking-wider font-bold text-slate-400 hover:text-blue-600 transition-colors focus:outline-none rounded">
                                                                    {t('skip') || 'Skip'} &rarr;
                                                                </button>
                                                            </div>
                                                        ) : isPast ? (
                                                            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-100 shadow-sm">
                                                                <CheckCircle2 size={12} /> {t('done') || 'Done'}
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] font-bold tracking-wide text-slate-400 flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                                                                <Clock size={11} /> {formatDuration(step.durationMinutes)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 mt-3">
                                                    {doctorNames.map((dName, dIdx) => {
                                                        const dStaff = staffList.find(s => s.fullName === dName);
                                                        const dSplits = dStaff ? transactions.filter(t => t.staffId === dStaff.id).sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()) : [];
                                                        const dLatestSplit = dSplits.length > 0 ? dSplits[0] : null;

                                                        return (
                                                            <div key={dIdx} className="flex items-center gap-2.5 min-w-0">
                                                                <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-sm border-[1.5px] ${isCurrent ? 'border-blue-100 ring-1 ring-blue-50' : 'border-white ring-1 ring-slate-100'}`}>
                                                                    {dStaff?.imageUrl ? (
                                                                        <img src={dStaff.imageUrl} alt={dName} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-400 bg-gradient-to-br from-slate-100 to-slate-200">
                                                                            {dName.charAt(0)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-1.5 font-bold text-slate-600 text-[13px] min-w-0">
                                                                    <span className="truncate max-w-full">{dName}</span>
                                                                    {dStaff && dStaff.role && (
                                                                        <span className="text-[9px] uppercase tracking-widest text-slate-400 bg-slate-100/80 px-1.5 py-0.5 rounded border border-slate-200/50 shrink-0">
                                                                            {t(`role_${dStaff.role}`) || dStaff.role}
                                                                        </span>
                                                                    )}
                                                                    {dLatestSplit && dLatestSplit.amount > 0 && (
                                                                        <span className="text-[12px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1 shadow-sm ring-1 ring-emerald-500/10 shrink-0">
                                                                            {formatWithSpaces(dLatestSplit.amount)} {dLatestSplit.currency || 'UZS'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {doctorNames.length === 0 && (
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-sm border-[1.5px] ${isCurrent ? 'border-blue-100 ring-1 ring-blue-50' : 'border-white ring-1 ring-slate-100'}`}>
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-400 bg-gradient-to-br from-slate-100 to-slate-200">
                                                                    <User size={12} />
                                                                </div>
                                                            </div>
                                                            <span className="text-[13px] font-bold text-slate-500">{t('doctor_staff') || 'TBD'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Desktop Only: Status Badge or Timer */}
                                        <div className="hidden sm:flex text-right flex-col items-end gap-2 shrink-0">
                                            {isCurrent ? (
                                                <>
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 font-mono font-bold tracking-tight shadow-sm">
                                                        <Timer size={14} className="animate-pulse" />
                                                        {formatTimeLeft(elapsed, step.durationMinutes)}
                                                    </div>
                                                    <button onClick={completeCurrentStepEarly} className="text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-blue-600 transition-colors focus:outline-none rounded">
                                                        {t('skip') || 'Skip'} &rarr;
                                                    </button>
                                                </>
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
                        <Activity size={20} />
                    </div>
                    {t('operation_progress') || 'Operation Progress'}
                </h3>

                {/* Session Tabs */}
                <div className="flex items-center w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                    <div className="flex bg-slate-100 rounded-lg p-1 space-x-1 border border-slate-200">
                        {dataState.sessions.map((session, index) => (
                            <div key={session.id} className={`flex items-center rounded-md transition-all ${dataState.activeSessionId === session.id ? 'bg-white shadow-sm border border-slate-200/60' : 'hover:bg-slate-200/50'}`}>
                                <button
                                    onClick={() => {
                                        const newData = { ...dataState, activeSessionId: session.id };
                                        setDataState(newData);
                                        updateTracker(patientId, newData).catch(console.error);
                                    }}
                                    className={`px-3 py-1.5 text-[12px] font-bold whitespace-nowrap ${dataState.activeSessionId === session.id
                                        ? 'text-blue-600'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {index === 0 ? t('seans_1') || 'Seans 1' : t('seans_n')?.replace('{n}', `${index + 1}`) || `Seans ${index + 1}`}
                                </button>
                                {dataState.sessions.length > 1 && dataState.activeSessionId === session.id && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsDeleteSessionModalOpen(true); }}
                                        className="pr-1.5 pl-0.5 text-slate-400 hover:text-red-500 transition-colors rounded-sm"
                                        title={t('delete_seans') || "Delete Seans"}
                                    >
                                        <X size={14} strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={() => {
                                const newId = `session_${Date.now()}`;
                                const newData = {
                                    ...dataState,
                                    activeSessionId: newId,
                                    sessions: [...dataState.sessions, {
                                        id: newId,
                                        name: `Seans ${dataState.sessions.length + 1}`,
                                        steps: [],
                                        status: 'setup',
                                        currentStepIndex: 0,
                                        stepStartTime: null
                                    } as OperationSession]
                                };
                                setDataState(newData);
                                updateTracker(patientId, newData).catch(console.error);
                            }}
                            className="px-2 py-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition flex items-center justify-center shrink-0"
                            title={t('add_seans') || "Add Seans"}
                        >
                            <Plus size={16} strokeWidth={3} />
                        </button>
                    </div>
                </div>
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

            <ConfirmationModal
                isOpen={isDeleteSessionModalOpen}
                onClose={() => setIsDeleteSessionModalOpen(false)}
                onConfirm={confirmDeleteSession}
                title={t('delete_seans') || 'Delete Seans'}
                description={t('delete_seans_desc') || 'Are you sure you want to delete this session? This action cannot be undone.'}
                icon={Trash2}
                variant="danger"
                cancelText={t('cancel')}
                confirmText={t('delete') || 'Delete'}
            />
        </div>
    );
};

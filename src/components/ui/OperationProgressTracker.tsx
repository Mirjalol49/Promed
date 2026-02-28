import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, User, Clock,
    Trash2, Plus, Stethoscope, Check, ChevronDown, RotateCcw, X
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
import { format } from 'date-fns';
import { uz, ru, enUS } from 'date-fns/locale';

export const OperationProgressTracker: React.FC<{ patientId: string }> = ({ patientId }) => {
    const { t, language } = useLanguage();
    const { accountId } = useAccount();

    const currentLocale = language === 'ru' ? ru : language === 'en' ? enUS : uz;

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

    // State
    const [newTitle, setNewTitle] = useState('');
    const [newDoctors, setNewDoctors] = useState<string[]>([]);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isDeleteSessionModalOpen, setIsDeleteSessionModalOpen] = useState(false);

    // Staff Dropdown
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

    // Actions
    const addStep = () => {
        if (!newTitle) return;
        setSharedState(prev => ({
            ...prev,
            status: 'completed',
            currentStepIndex: prev.steps.length + 1,
            steps: [...prev.steps, {
                id: `step_${Date.now()}`,
                title: newTitle,
                doctor: newDoctors.length > 0 ? newDoctors.join(', ') : t('doctor_staff') || 'Belgilanmagan',
                durationMinutes: 0
            }]
        }));
        setNewTitle('');
        setNewDoctors([]);
    };

    const removeStep = (id: string) => {
        setSharedState(prev => ({
            ...prev,
            steps: prev.steps.filter(s => s.id !== id)
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
        setDataState(prevData => {
            const remaining = prevData.sessions.filter(s => s.id !== prevData.activeSessionId);
            const nextDataState = {
                ...prevData,
                activeSessionId: remaining[0]?.id || 'session_1',
                sessions: remaining.length > 0 ? remaining : [{
                    id: 'session_1',
                    name: 'Seans 1',
                    steps: [],
                    status: 'setup',
                    currentStepIndex: 0,
                    stepStartTime: null
                } as OperationSession]
            };
            updateTracker(patientId, nextDataState).catch(console.error);
            return nextDataState as OperationTrackerData;
        });
        setIsDeleteSessionModalOpen(false);
    };

    // Render
    const renderTracker = () => (
        <div className="space-y-5 animate-in fade-in duration-300">

            {/* STEPS LIST */}
            {state.steps.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-700 text-[13px] uppercase tracking-wider">{t('completed_steps')}</h4>
                            <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[11px] border border-slate-200">{state.steps.length}</span>
                        </div>
                        <button
                            onClick={() => setIsResetModalOpen(true)}
                            className="shrink-0 text-[10px] font-black text-slate-400 hover:text-red-600 flex items-center gap-1.5 transition-colors uppercase tracking-widest bg-white hover:bg-red-50 px-3 py-1.5 rounded-md border border-slate-200 shadow-sm active:scale-[0.98]"
                        >
                            <RotateCcw size={13} /> {t('reset_tracker')}
                        </button>
                    </div>

                    <div className="space-y-3">
                        {state.steps.map((step, idx) => {
                            const doctorNames = step.doctor ? step.doctor.split(',').map(n => n.trim()).filter(Boolean) : [];
                            return (
                                <div key={step.id} className="group relative bg-white border border-slate-200 rounded-[18px] p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300">
                                    <div className="hidden sm:block absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <button onClick={() => removeStep(step.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                    <div className="sm:hidden absolute top-4 right-4">
                                        <button onClick={() => removeStep(step.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="pr-12 sm:pr-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-7 h-7 rounded-md bg-slate-50 text-slate-500 border border-slate-200 flex items-center justify-center font-black text-[12px] shrink-0">
                                                {idx + 1}
                                            </div>
                                            <h4 className="text-[16px] font-black tracking-tight text-slate-800">{step.title}</h4>
                                        </div>

                                        <div className="flex flex-col gap-2.5 pl-10">
                                            {doctorNames.map((dName, dIdx) => {
                                                const dStaff = staffList.find(s => s.fullName === dName);
                                                const dSplits = dStaff ? transactions.filter(t => t.staffId === dStaff.id).sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()) : [];
                                                const dLatestSplit = dSplits.length > 0 ? dSplits[0] : null;

                                                return (
                                                    <div key={dIdx} className="flex items-center gap-3 min-w-0 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                                                        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-sm border-[2px] border-white">
                                                            {dStaff?.imageUrl ? (
                                                                <img src={dStaff.imageUrl} alt={dName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[12px] font-black text-slate-400 bg-gradient-to-br from-slate-100 to-slate-200">
                                                                    {dName.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-bold text-slate-700 text-[13px] truncate">{dName}</span>
                                                                {dStaff && dStaff.role && (
                                                                    <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200/80 shrink-0">
                                                                        {t(`role_${dStaff.role}`) || dStaff.role}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {dLatestSplit && dLatestSplit.amount > 0 && (
                                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                    <span className="text-[12px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded shadow-sm shrink-0">
                                                                        {formatWithSpaces(dLatestSplit.amount)} {dLatestSplit.currency || 'UZS'}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0 uppercase tracking-widest">
                                                                        <Clock size={10} strokeWidth={2.5} />
                                                                        {format(new Date(dLatestSplit.date || dLatestSplit.createdAt || new Date()), 'dd MMM yyyy', { locale: currentLocale })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {doctorNames.length === 0 && (
                                                <div className="flex items-center gap-3 opacity-60 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                                                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border-2 border-dashed border-slate-200 bg-white">
                                                        <User size={14} className="text-slate-400" />
                                                    </div>
                                                    <span className="text-[12px] font-bold text-slate-500">{t('doctor_staff')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {state.steps.length === 0 && (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <div className="mx-auto w-12 h-12 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center mb-3">
                        <Stethoscope className="h-6 w-6 text-slate-300 stroke-[2.5px]" />
                    </div>
                    <p className="text-[14px] font-bold text-slate-500">{t('no_operation_steps')}</p>
                    <p className="text-[12px] text-slate-400 mt-1 font-medium">{t('add_phases_ph')}</p>
                </div>
            )}

            {/* ADD STEP — always visible at the bottom */}
            <div className="bg-slate-50/50 rounded-xl p-4 md:p-5 border border-slate-100 flex flex-col md:flex-row gap-4 items-end relative z-30">
                <div className="flex-1 w-full">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">{t('step_title')}</label>
                    <input
                        type="text"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addStep(); }}
                        placeholder={t('step_title_ph') || "Masalan: Ekstraksiya"}
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-[14px] font-medium text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                </div>
                <div className="flex-1 w-full relative" ref={dropdownRef}>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">{t('doctor_staff')}</label>
                    <button
                        type="button"
                        onClick={() => setIsDoctorDropdownOpen(!isDoctorDropdownOpen)}
                        className={`w-full bg-white border outline-none transition-all rounded-lg px-4 py-3 text-[14px] flex items-center justify-between text-left ${isDoctorDropdownOpen ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <span className={`truncate ${newDoctors.length > 0 ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'}`}>
                            {newDoctors.length > 0 ? newDoctors.join(', ') : (t('select_staff') || 'Xodim tanlash')}
                        </span>
                        <ChevronDown size={16} className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${isDoctorDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {isDoctorDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                transition={{ duration: 0.15 }}
                                className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto p-1"
                            >
                                {staffList.length === 0 ? (
                                    <div className="p-4 text-[13px] text-slate-500 text-center font-medium">{t('no_staff_found')}</div>
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
                                            className="w-full text-left px-3 py-3 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 relative">
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
                                                <div className="text-[14px] font-bold text-slate-700 truncate group-hover:text-blue-600 transition-colors leading-tight">{staff.fullName}</div>
                                                <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 font-semibold">{t(`role_${staff.role}`) || staff.role}</div>
                                            </div>
                                            {newDoctors.includes(staff.fullName) && (
                                                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                    <Check size={14} className="text-blue-600 stroke-[3px]" />
                                                </div>
                                            )}
                                        </button>
                                    ))
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <motion.button
                    whileTap={{ scale: 0.96 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={addStep}
                    disabled={!newTitle}
                    className="relative overflow-hidden shrink-0 h-[46px] px-8 text-white rounded-lg flex items-center justify-center gap-2.5 font-black shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed group transition-all duration-300 active:translate-y-0 active:scale-[0.98]"
                    style={{
                        background: (!newTitle) ? '#e2e8f0' : '#3b82f6',
                        color: (!newTitle) ? '#94a3b8' : 'white',
                        boxShadow: (!newTitle) ? 'none' : '0 4px 12px -2px rgba(59, 130, 246, 0.4)'
                    }}
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} />
                    <span className="text-[14px] tracking-wide uppercase">{t('add')}</span>
                </motion.button>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl p-6 shadow-apple border border-slate-200 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
                        <Activity size={20} />
                    </div>
                    {t('operation_progress')}
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

            <div className="overflow-visible mt-6">
                {renderTracker()}
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

import React, { useState, useMemo } from 'react';
import { CalendarWidget, CalendarEvent } from './CalendarWidget';
import { Patient, InjectionStatus } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    Calendar,
    MapPin,
    Clock,
    ChevronRight,
    Check,
    Phone,
    User,
    Syringe,
    Activity,
    Heart
} from 'lucide-react';
import { format, isSameDay, isToday, addDays } from 'date-fns';
import { uz, ru, enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardSchedulerProps {
    patients: Patient[];
    onViewPatient: (id: string) => void;
}

export const DashboardScheduler: React.FC<DashboardSchedulerProps> = ({ patients, onViewPatient }) => {
    const { t, language } = useLanguage();
    // Default to NULL (Show All) instead of Today
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Map app language to date-fns locale
    const localeMap = {
        uz: uz,
        ru: ru,
        en: enUS
    };
    const currentLocale = localeMap[language] || enUS;

    // 1. Extract all events from patients
    const allEvents = useMemo(() => {
        const events: any[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        patients.forEach(patient => {
            // Operations
            if (patient.operationDate) {
                events.push({
                    id: `op-${patient.id}`,
                    date: new Date(patient.operationDate),
                    type: 'Operation',
                    patientId: patient.id,
                    title: t('operation') || 'Operation',
                    subtitle: patient.technique === 'Hair' ? t('transplant_hair') :
                        patient.technique === 'Eyebrow' ? t('transplant_eyebrow') :
                            patient.technique === 'Beard' ? t('transplant_beard') : (patient.technique || 'N/A'),
                    image: patient.profileImage,
                    name: patient.fullName,
                    status: patient.status
                });
            }

            // Injections
            if (patient.injections) {
                patient.injections.forEach(inj => {
                    if (inj.status === InjectionStatus.SCHEDULED) {
                        events.push({
                            id: `inj-${patient.id}-${inj.id}`,
                            date: new Date(inj.date),
                            type: 'Injection',
                            patientId: patient.id,
                            title: t('plasma_injection') || 'Plasma Injection',
                            subtitle: inj.notes || inj.dose || t('routine_followup'),
                            image: patient.profileImage,
                            name: patient.fullName,
                            status: inj.status
                        });
                    }
                });
            }
        });

        // Filter out past events
        return events.filter(e => e.date >= today);
    }, [patients, t]);

    // 2. Prepare Calendar Events
    const calendarEvents: CalendarEvent[] = useMemo(() => {
        return allEvents.map(e => ({
            date: e.date,
            type: e.type,
            id: e.id
        }));
    }, [allEvents]);

    // 3. Filter Logic
    const displayedEvents = useMemo(() => {
        let filtered = allEvents;

        if (selectedDate) {
            filtered = allEvents.filter(e => isSameDay(e.date, selectedDate));
        }

        // Always sort by date (asc)
        return filtered.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [allEvents, selectedDate]);

    // Handler for Calendar Click
    const handleDateSelect = (date: Date) => {
        if (selectedDate && isSameDay(date, selectedDate)) {
            // Deselect if clicking the same day
            setSelectedDate(null);
        } else {
            setSelectedDate(date);
        }
    };

    // Helper date label
    const headerTitle = useMemo(() => {
        if (!selectedDate) return t('upcoming_schedule') || "Upcoming Schedule";

        if (isToday(selectedDate)) return `${t('schedule_for')} ${t('today')}`;
        const tomorrow = addDays(new Date(), 1);
        if (isSameDay(selectedDate, tomorrow)) return `${t('schedule_for')} ${t('tomorrow')}`;

        return `${t('schedule_for')} ${format(selectedDate, 'EEEE, d MMMM', { locale: currentLocale })}`;
    }, [selectedDate, t, currentLocale]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Calendar */}
            <div className="lg:col-span-5 xl:col-span-4">
                <CalendarWidget
                    events={calendarEvents}
                    selectedDate={selectedDate}
                    onDateSelect={handleDateSelect}
                    className="shadow-apple border border-slate-100 h-full min-h-[420px]"
                />
            </div>

            {/* Right: Schedule List */}
            <div className="lg:col-span-7 xl:col-span-8 h-full">
                <div className="bg-white rounded-3xl p-6 shadow-apple border border-slate-100 h-full min-h-[420px] max-h-[600px] flex flex-col">

                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                <span className="bg-promed-primary/10 p-2 rounded-xl text-promed-primary">
                                    <User size={20} />
                                </span>
                                {headerTitle}
                            </h2>
                            <p className="text-sm text-slate-400 font-bold ml-11 mt-1 uppercase tracking-wider">
                                {displayedEvents.length} {t('patients_scheduled')}
                            </p>
                        </div>
                        {/* Optional 'Show All' button if date is selected */}
                        {selectedDate && (
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="text-xs font-bold text-promed-primary bg-promed-bg px-3 py-1.5 rounded-lg hover:bg-promed-primary/20 transition-colors"
                            >
                                {t('see_all') || "Show All"}
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                        {/* Scrollable List Container */}
                        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent hover:scrollbar-thumb-slate-300 transition-colors">
                            <AnimatePresence mode="wait">
                                {displayedEvents.length > 0 ? (
                                    displayedEvents.map((event, index) => {
                                        // Add date header if showing all events and date changes
                                        const showHeader = !selectedDate && (index === 0 || !isSameDay(event.date, displayedEvents[index - 1].date));

                                        return (
                                            <React.Fragment key={event.id}>
                                                {showHeader && (
                                                    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-2 px-1 mb-2 border-b border-slate-100">
                                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest capitalize">
                                                            {isToday(event.date) ? t('today') : format(event.date, 'EEEE, d MMMM', { locale: currentLocale })}
                                                        </h4>
                                                    </div>
                                                )}

                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    onClick={() => onViewPatient(event.patientId)}
                                                    className="group relative flex items-center p-5 rounded-2xl bg-white border border-slate-100/80 hover:border-promed-primary/30 hover:shadow-[0_8px_20px_-6px_rgba(99,102,241,0.1)] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    {/* Left Accent Bar Gradient */}
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${event.type === 'Operation'
                                                        ? 'bg-gradient-to-b from-rose-400 to-rose-600'
                                                        : 'bg-gradient-to-b from-blue-500 to-indigo-600'
                                                        }`} />

                                                    {/* Content Container */}
                                                    <div className="flex items-center w-full pl-3">

                                                        {/* Timeline Time Component */}
                                                        <div className="flex flex-col items-center justify-center mr-5 min-w-[45px]">
                                                            <span className="text-lg font-black text-slate-700 tracking-tight tabular-nums">
                                                                {format(event.date, 'HH:mm')}
                                                            </span>
                                                        </div>

                                                        {/* Visual Icon Box or Profile Image */}
                                                        <div className={`
                                                        w-12 h-12 rounded-2xl flex items-center justify-center mr-4 shadow-sm transition-all duration-300 group-hover:scale-105 overflow-hidden flex-shrink-0
                                                        ${event.image ? 'bg-slate-100' : (
                                                                event.type === 'Operation'
                                                                    ? 'bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white group-hover:shadow-rose-200'
                                                                    : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-indigo-200'
                                                            )}
                                                    `}>
                                                            {event.image ? (
                                                                <img
                                                                    src={event.image}
                                                                    alt={event.name}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        // Fallback if image fails to load
                                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                                        (e.target as HTMLImageElement).parentElement?.classList.add(
                                                                            event.type === 'Operation' ? 'bg-rose-50' : 'bg-indigo-50',
                                                                            event.type === 'Operation' ? 'text-rose-500' : 'text-indigo-600'
                                                                        );
                                                                    }}
                                                                />
                                                            ) : (
                                                                event.type === 'Operation'
                                                                    ? <Heart size={20} fill="currentColor" className="opacity-90" />
                                                                    : <Syringe size={20} className="stroke-[2.5]" />
                                                            )}
                                                        </div>

                                                        {/* Main Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <h4 className="text-base font-bold text-slate-800 group-hover:text-promed-primary transition-colors truncate pr-2">
                                                                    {event.name}
                                                                </h4>
                                                            </div>

                                                            {/* Subtitle / Details */}
                                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 group-hover:text-slate-600 transition-colors">
                                                                <span className="truncate max-w-[180px]">{event.subtitle}</span>
                                                            </div>
                                                        </div>

                                                        {/* Right Side Actions / Badge */}
                                                        <div className="flex items-center gap-3 pl-2">
                                                            {/* Pill Tag - Soft Background for Accessibility */}
                                                            <span className={`
                                                                hidden sm:flex px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider
                                                                ${event.type === 'Operation'
                                                                    ? 'bg-rose-50 text-rose-700'
                                                                    : 'bg-indigo-50 text-indigo-700'
                                                                }
                                                            `}>
                                                                {t(event.type.toLowerCase()) || event.type}
                                                            </span>

                                                            {/* Right Chevron Action */}
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm group-hover:text-promed-primary transition-all duration-300">
                                                                <ChevronRight size={16} strokeWidth={2.5} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center h-[300px] text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/30"
                                    >
                                        <Calendar size={48} className="mb-4 text-slate-300" />
                                        <p className="font-bold text-lg text-slate-500">{t('no_events_day') || 'No events for this day'}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


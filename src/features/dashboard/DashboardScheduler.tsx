import React, { useState, useMemo } from 'react';
import { CalendarWidget, CalendarEvent, EventType } from './CalendarWidget';
import { ProfileAvatar } from '../../components/layout/ProfileAvatar';
import { ProBadge } from '../../components/ui/ProBadge';
import { Patient, InjectionStatus } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    Calendar,
    ChevronDown,
    ChevronRight,
    User,
    Syringe,
    Clock,
} from 'lucide-react';
import { format, isSameDay, isToday, addDays } from 'date-fns';
import { uz, ru, enUS } from 'date-fns/locale';
import Lottie from 'lottie-react';
import dateAnimation from '../../assets/images/mascots/date.json';

interface DashboardSchedulerProps {
    patients: Patient[];
    onViewPatient: (id: string, injectionId?: string) => void;
}

interface FlattenedEvent {
    id: string;
    date: Date;
    type: EventType;
    patientId: string;
    title: string;
    subtitle: string;
    patientImage: string | null | undefined;
    name: string;
    status?: string | InjectionStatus;
    tier?: 'regular' | 'pro';
    injectionId?: string;
}

interface GroupedEvent {
    patientId: string;
    primaryEvent: FlattenedEvent;
    secondaryEvents: FlattenedEvent[];
    totalSessions: number;
}

export const DashboardScheduler: React.FC<DashboardSchedulerProps> = ({ patients, onViewPatient }) => {
    const { t, language } = useLanguage();
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const localeMap = { uz, ru, en: enUS };
    const currentLocale = localeMap[language] || enUS;

    // 1. Extract all events
    const allEvents = useMemo(() => {
        const events: FlattenedEvent[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        patients.forEach(patient => {
            if (patient.operationDate) {
                events.push({
                    id: `op-${patient.id}`,
                    date: new Date(patient.operationDate),
                    type: 'Operation', // This matches EventType
                    patientId: patient.id,
                    title: t('operation') || 'Operation',
                    subtitle: patient.technique || 'N/A',
                    patientImage: patient.profileImage,
                    name: patient.fullName,
                    status: patient.status,
                    tier: patient.tier
                });
            }

            const injectionEvents = (patient.injections || [])
                .filter(inj => inj.status !== InjectionStatus.CANCELLED && inj.status !== InjectionStatus.COMPLETED)
                .map(inj => {
                    const date = new Date(inj.date);
                    if (isNaN(date.getTime())) return null;
                    return {
                        id: `inj-${patient.id}-${inj.id}`,
                        patientId: patient.id,
                        name: patient.fullName,
                        date: date,
                        type: 'Injection' as EventType,
                        status: inj.status,
                        title: t('plasma_injection') || 'Plasma Injection',
                        subtitle: inj.notes || inj.dose || t('routine_followup'),
                        patientImage: patient.profileImage,
                        tier: patient.tier,
                        injectionId: inj.id
                    };
                }).filter((e) => Boolean(e)) as FlattenedEvent[];

            events.push(...injectionEvents);
        });

        return events.filter(e => e.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [patients, t]);

    // 2. Prepare Calendar Events (Flat List for dots)
    const calendarEvents: CalendarEvent[] = useMemo(() => {
        return allEvents.map(e => ({
            date: e.date,
            type: e.type,
            id: e.id
        }));
    }, [allEvents]);

    // 3. Grouping Logic
    const displayedGroups = useMemo(() => {
        let filtered = allEvents;

        if (selectedDate) {
            filtered = allEvents.filter(e => isSameDay(e.date, selectedDate));
        }

        const groups: Record<string, FlattenedEvent[]> = {};
        filtered.forEach(event => {
            if (!groups[event.patientId]) {
                groups[event.patientId] = [];
            }
            groups[event.patientId].push(event);
        });

        const groupedEvents: GroupedEvent[] = Object.values(groups).map(groupEvents => {
            // Sort events within group by date
            groupEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
            return {
                patientId: groupEvents[0].patientId,
                primaryEvent: groupEvents[0],
                secondaryEvents: [], // User requested to only show the next event, no dropdowns.
                totalSessions: 1 // Hide count badge as we are only showing one.
            };
        });

        // Sort groups by primary event date
        return groupedEvents.sort((a, b) => a.primaryEvent.date.getTime() - b.primaryEvent.date.getTime());

    }, [allEvents, selectedDate]);



    const handleDateSelect = (date: Date) => {
        if (selectedDate && isSameDay(date, selectedDate)) {
            setSelectedDate(null);
        } else {
            setSelectedDate(date);
        }
    };

    const headerTitle = useMemo(() => {
        if (!selectedDate) return t('upcoming_schedule') || "Upcoming Schedule";
        if (isToday(selectedDate)) return `${t('schedule_for')} ${t('today')}`;
        const tomorrow = addDays(new Date(), 1);
        if (isSameDay(selectedDate, tomorrow)) return `${t('schedule_for')} ${t('tomorrow')}`;
        return `${t('schedule_for')} ${format(selectedDate, 'EEEE, d MMMM', { locale: currentLocale })}`;
    }, [selectedDate, t, currentLocale]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 xl:col-span-8 h-full">
                <div className="relative bg-white rounded-3xl p-6 shadow-apple border border-slate-100 h-full min-h-[420px] max-h-[500px] flex flex-col group/list">

                    <div className="flex justify-between items-center mb-6 flex-shrink-0 z-20 relative">
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                <span className="bg-promed-primary/10 p-2 rounded-xl text-promed-primary">
                                    <Calendar size={20} />
                                </span>
                                {t('schedule') || 'Jadval'}
                            </h2>
                        </div>

                        {/* Segmented Control */}
                        <div className="flex bg-slate-100/80 p-1 rounded-xl relative">
                            {/* Bugun Tab */}
                            <button
                                onClick={() => setSelectedDate(new Date())}
                                className={`relative z-10 px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${selectedDate && isToday(selectedDate)
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {t('today') || 'Bugun'}
                            </button>

                            {/* Kelgusi Tab */}
                            <button
                                onClick={() => setSelectedDate(null)}
                                className={`relative z-10 px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${!selectedDate || (selectedDate && !isToday(selectedDate))
                                    // Logic: If null (default upcoming) OR if a specific date is selected that is NOT today (e.g. tomorrow), 
                                    // we might want to highlight this or just treat specific non-today dates as "not Bugun".
                                    // For exact "Kelgusi" tab behavior (Show All List), strictly check !selectedDate.
                                    // But if user selects tomorrow from calendar, this tab setup might be confusing. 
                                    // Let's stick to the requested behavior: "Kelgusi" implies the "Upcoming List" view which corresponds to selectedDate === null.
                                    ? (!selectedDate ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700')
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {t('upcoming') || 'Kelgusi'}
                            </button>
                        </div>
                    </div>

                    <div className={`flex-1 pr-2 custom-scrollbar space-y-3 ${displayedGroups.length > 2 ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                        <div className={`flex-1 pr-2 -mr-2 space-y-4 transition-colors pb-4 ${displayedGroups.length > 2 ? 'overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent hover:scrollbar-thumb-slate-300' : 'overflow-hidden'} ${displayedGroups.length === 0 ? 'flex flex-col justify-center h-full' : ''}`}>

                            {displayedGroups.length > 0 ? (
                                displayedGroups.map((group, index) => {
                                    const { primaryEvent, secondaryEvents, totalSessions, patientId } = group;
                                    const showHeader = !selectedDate && (index === 0 || !isSameDay(primaryEvent.date, displayedGroups[index - 1]?.primaryEvent.date));

                                    return (
                                        <React.Fragment key={patientId}>
                                            {showHeader && (
                                                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm pt-4 pb-2 pl-2 mb-4 border-b-2 border-slate-100 flex items-center gap-3">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-promed-primary ring-4 ring-promed-primary/10"></div>
                                                    <h4 className="text-sm font-black text-slate-600 uppercase tracking-widest">
                                                        {isToday(primaryEvent.date) ? t('today') : format(primaryEvent.date, 'EEEE, d MMMM', { locale: currentLocale })}
                                                    </h4>
                                                </div>
                                            )}

                                            <div
                                                className={`group relative rounded-2xl bg-white border transition-all duration-300 overflow-hidden
                                                        border-indigo-50 shadow-sm hover:border-promed-primary/40 hover:shadow-md
                                                    `}
                                            >
                                                {/* Primary Card Content */}
                                                <div
                                                    onClick={() => {
                                                        onViewPatient(patientId, primaryEvent.injectionId);
                                                    }}
                                                    className="flex items-stretch cursor-pointer relative"
                                                >
                                                    {/* Left Time Panel */}
                                                    <div className={`w-[60px] md:w-[80px] flex items-center justify-center flex-shrink-0 transition-colors gel-blue-style`}>
                                                        <span className="text-sm md:text-lg font-black text-white tracking-tight tabular-nums drop-shadow-sm">
                                                            {format(primaryEvent.date, 'HH:mm')}
                                                        </span>
                                                    </div>

                                                    {/* Right Content */}
                                                    <div className="flex-1 flex items-center p-3 md:p-5 min-w-0">
                                                        <div className="flex-1 min-w-0 pr-2 md:pr-4">
                                                            <div className="flex items-center gap-3 md:gap-4 mb-0.5">
                                                                <div className="relative flex-shrink-0">
                                                                    <ProfileAvatar
                                                                        src={primaryEvent.patientImage}
                                                                        alt={primaryEvent.name}
                                                                        size={44}
                                                                        className="ring-2 ring-white shadow-sm"
                                                                        rounded="rounded-2xl"
                                                                        fallbackType="user"
                                                                    />
                                                                    {/* Session Badge */}
                                                                    {totalSessions > 1 && (
                                                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white shadow-sm z-10">
                                                                            +{totalSessions - 1}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-1 min-w-0">
                                                                        <span className="font-bold text-slate-900 truncate text-sm md:text-base">
                                                                            {primaryEvent.name}
                                                                        </span>
                                                                        {primaryEvent.tier === 'pro' && (
                                                                            <div className="flex-shrink-0 ml-1">
                                                                                <ProBadge size={20} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11px] md:text-xs text-slate-600 font-medium truncate mt-0.5">
                                                                        {primaryEvent.subtitle}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-3">
                                                            <span className={`
                                                                    hidden xl:flex px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider scale-95 origin-right
                                                                    ${primaryEvent.type === 'Operation' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}
                                                                `}>
                                                                {t(primaryEvent.type.toLowerCase()) || primaryEvent.type}
                                                            </span>

                                                            <div
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onViewPatient(patientId, primaryEvent.injectionId);
                                                                }}
                                                                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${primaryEvent.type === 'Operation'
                                                                    ? 'bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white'
                                                                    : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                                                                    }`}
                                                            >
                                                                <ChevronRight size={18} strokeWidth={2.5} className="md:w-5 md:h-5" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>




                                            </div>
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <div
                                    className="flex flex-col items-center justify-center h-[300px] text-slate-400 px-6 text-center"
                                >
                                    <div className="w-32 h-32 mb-2">
                                        <Lottie animationData={dateAnimation} loop={true} />
                                    </div>
                                    <p className="font-bold text-base md:text-lg text-slate-500 leading-snug max-w-[240px] md:max-w-none mx-auto">
                                        {t('no_events_day') || 'No events for this day'}
                                    </p>
                                </div>
                            )}

                        </div>
                    </div>
                    {displayedGroups.length > 2 && (
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none rounded-b-3xl z-10" />
                    )}
                </div>
            </div>

            <div className="lg:col-span-5 xl:col-span-4">
                <CalendarWidget
                    events={calendarEvents}
                    selectedDate={selectedDate}
                    onDateSelect={handleDateSelect}
                    className="shadow-apple border border-slate-100 h-full min-h-[420px]"
                />
            </div>
        </div>
    );
};


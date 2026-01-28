import React, { useState } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday
} from 'date-fns';
import { uz, ru, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export type EventType = 'Operation' | 'Injection' | 'Consultation';

export interface CalendarEvent {
    date: Date;
    type: EventType;
    id?: string;
}

interface CalendarWidgetProps {
    events?: CalendarEvent[];
    selectedDate: Date | null;
    onDateSelect: (date: Date) => void;
    className?: string;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
    events = [],
    selectedDate,
    onDateSelect,
    className = ''
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const { t, language } = useLanguage();

    // Map app language to date-fns locale
    const localeMap = {
        uz: uz,
        ru: ru,
        en: enUS
    };
    const currentLocale = localeMap[language] || enUS;

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    // Helper to check for events on a specific day
    const getEventsForDay = (day: Date) => {
        return events.filter(event => isSameDay(event.date, day));
    };

    return (
        <div className={`p-4 md:p-6 bg-white rounded-3xl ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800 tracking-tight pl-2 capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: currentLocale })}
                </h3>
                <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1 gap-1">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-slate-800 active:scale-95"
                    >
                        <ChevronLeft size={18} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-slate-800 active:scale-95"
                    >
                        <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                    // Create a dummy date for each day of the week to format it localized
                    // Start from a known Monday: 2024-01-01
                    const dummyDate = new Date(2024, 0, 1 + i);
                    const dayName = format(dummyDate, 'EE', { locale: currentLocale });
                    return (
                        <div key={day} className="text-center text-[11px] font-black text-promed-primary opacity-80 uppercase tracking-wider py-2">
                            {dayName}
                        </div>
                    );
                })}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                {calendarDays.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isTodayDate = isToday(day);

                    const hasOperation = dayEvents.some(e => e.type === 'Operation');
                    const hasInjection = dayEvents.some(e => e.type === 'Injection');

                    return (
                        <div key={day.toString()} className="flex justify-center relative group">
                            <button
                                onClick={() => onDateSelect(day)}
                                className={`
                  w-10 h-10 rounded-xl flex flex-col items-center justify-center text-sm font-bold relative transition-all duration-300
                  ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-600'}
                  ${isSelected ? 'bg-promed-primary text-white shadow-lg shadow-indigo-500/30 scale-105 z-10' : 'hover:bg-slate-50 hover:text-promed-primary'}
                  ${isTodayDate && !isSelected ? 'text-promed-primary ring-[1.5px] ring-promed-primary bg-promed-primary/5 font-black shadow-sm' : ''}
                `}
                            >
                                <span className={isSelected || isTodayDate ? "z-10 relative" : ""}>{format(day, 'd')}</span>

                                {/* Event Indicators - Improved */}
                                {!isSelected && dayEvents.length > 0 && (
                                    <div className="absolute bottom-1.5 flex gap-1 z-0">
                                        {hasOperation && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
                                        )}
                                        {hasInjection && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-promed-primary ring-2 ring-white" />
                                        )}
                                    </div>
                                )}
                                {/* Selected State Events (White dots) */}
                                {isSelected && dayEvents.length > 0 && (
                                    <div className="absolute bottom-1.5 flex gap-1 z-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/90" />
                                    </div>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Legend / Status */}
            <div className="mt-6 flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 border-t border-slate-50 pt-4">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-200" />
                    <span>{t('operation') || 'Operation'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-promed-primary shadow-sm shadow-indigo-200" />
                    <span>{t('injection') || 'Injection'}</span>
                </div>
            </div>
        </div>
    );
};

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from 'date-fns';
import { uz, ru, enUS } from 'date-fns/locale';
import { useLanguage } from '../../contexts/LanguageContext';

interface CustomCalendarProps {
    value: Date;
    onChange: (date: Date) => void;
}

export const CustomCalendar: React.FC<CustomCalendarProps> = ({ value, onChange }) => {
    const { language } = useLanguage();
    const [currentMonth, setCurrentMonth] = useState(new Date(value));

    // Map app language to date-fns locale
    const locale = language === 'uz' ? uz : language === 'ru' ? ru : enUS;

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between px-2 py-3">
                <button
                    type="button"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                >
                    <ChevronLeft size={24} strokeWidth={2.5} />
                </button>
                <div className="font-extrabold text-slate-900 capitalize text-lg tracking-tight">
                    {format(currentMonth, 'MMMM yyyy', { locale })}
                </div>
                <button
                    type="button"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                >
                    <ChevronRight size={24} strokeWidth={2.5} />
                </button>
            </div>
        );
    };

    const renderDays = () => {
        const dateFormat = "EEEE";
        const days = [];
        const startDate = startOfWeek(currentMonth, { locale });

        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i} className="text-xs font-black text-blue-600 uppercase tracking-wider text-center py-2">
                    {format(addDays(startDate, i), 'EEEEE', { locale })}
                </div>
            );
        }

        return <div className="grid grid-cols-7 mb-2">{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { locale });
        const endDate = endOfWeek(monthEnd, { locale });

        const dateFormat = "d";
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat, { locale });
                const cloneDay = day;

                const isSelected = isSameDay(day, value);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isDayToday = isToday(day);

                days.push(
                    <div
                        key={day.toString()}
                        className={`p-0.5 w-full aspect-square`}
                    >
                        <button
                            type="button"
                            disabled={!isCurrentMonth}
                            onClick={() => {
                                if (isCurrentMonth) onChange(cloneDay);
                            }}
                            aria-label={`Select ${formattedDate}, ${format(day, 'MMMM yyyy', { locale })}`}
                            className={`
                                w-full h-full flex items-center justify-center rounded-full text-sm font-bold transition-all duration-200
                                ${!isCurrentMonth
                                    ? 'text-slate-300 cursor-default hidden'
                                    : isSelected
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
                                        : isDayToday
                                            ? 'bg-blue-50 text-blue-600 relative'
                                            : 'text-slate-700 hover:bg-slate-100'
                                }
                            `}
                        >
                            {formattedDate}
                            {isDayToday && !isSelected && (
                                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                            )}
                        </button>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div key={day.toString()} className="grid grid-cols-7">
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="space-y-1">{rows}</div>;
    };

    return (
        <div className="w-full">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
        </div>
    );
};

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface DatePickerProps {
    label?: string;
    value: string;
    onChange: (date: string) => void;
    className?: string;
    minDate?: string;
    maxDate?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
    label,
    value,
    onChange,
    className = '',
    minDate,
    maxDate
}) => {
    const { language, t } = useLanguage();

    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse initial date or use today
    const initialDate = value ? new Date(value) : new Date();
    const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!isOpen) return;
            const dropdownEl = document.getElementById(portalId);
            if (containerRef.current && containerRef.current.contains(event.target as Node)) {
                return;
            }
            if (dropdownEl && dropdownEl.contains(event.target as Node)) {
                return;
            }
            setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); // 0 is Sunday

    const handleDayClick = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const year = newDate.getFullYear();
        const month = String(newDate.getMonth() + 1).padStart(2, '0');
        const d = String(newDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${d}`;

        onChange(dateString);
        setIsOpen(false);
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const renderCalendar = () => {
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const isSelected = value && new Date(value).toDateString() === date.toDateString();
            const isToday = new Date().toDateString() === date.toDateString();

            days.push(
                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                    key={day}
                    onClick={() => handleDayClick(day)}
                    type="button"
                    className={`
                    h-9 w-9 md:h-8 md:w-8 m-auto rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
                    ${isSelected
                            ? 'gel-blue-style text-white shadow-lg'
                            : isToday
                                ? 'text-blue-600 ring-[1.5px] ring-blue-600 bg-blue-50 font-black shadow-sm'
                                : 'text-slate-700 hover:bg-slate-100'
                        }
                `}
                >
                    {day}
                </motion.button>
            );
        }
        return days;
    };

    const monthNames = [
        t('january'), t('february'), t('march'), t('april'),
        t('may'), t('june'), t('july'), t('august'),
        t('september'), t('october'), t('november'), t('december')
    ];

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();

        return `${day} ${month} ${year}`;
    };

    const dayHeaders = [
        t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')
    ];

    const portalId = useRef(`datepicker-legacy-${Math.random().toString(36).substr(2, 9)}`).current;

    const renderDropdownContent = () => (
        <>
            <div className="flex items-center justify-between mb-4">
                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} type="button" onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition">
                    <ChevronLeft size={20} />
                </motion.button>
                <span className="font-bold text-slate-800 text-base capitalize">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} type="button" onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition">
                    <ChevronRight size={20} />
                </motion.button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {dayHeaders.map(day => (
                    <div key={day} className="text-[10px] md:text-xs font-black text-blue-600 uppercase tracking-wider py-1">{day}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
            </div>
        </>
    );

    return (
        <div className={`relative ${className} mb-6 sm:mb-0`} ref={containerRef}>
            {label && <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{label}</label>}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
            w-full p-3 bg-white border rounded-xl flex items-center justify-between cursor-pointer transition-all
            ${isOpen ? 'ring-2 ring-promed-primary border-promed-primary' : 'border-slate-400 hover:border-slate-500'}
        `}
            >
                <div className="flex items-center space-x-3 text-slate-700">
                    <Calendar className="w-5 h-5 text-slate-500/70" />
                    <span className={value ? 'font-medium' : 'text-slate-400'}>
                        {value ? formatDateDisplay(value) : t('select_date')}
                    </span>
                </div>
            </div>

            {isOpen && (
                <div id={portalId} className="absolute z-[100] mt-2 bg-white rounded-3xl shadow-xl border border-slate-100 p-5 w-full min-w-[300px] animate-in fade-in zoom-in-95 duration-200 slide-in-from-top-2 left-0 sm:left-auto">
                    {renderDropdownContent()}
                </div>
            )}
        </div>
    );
};

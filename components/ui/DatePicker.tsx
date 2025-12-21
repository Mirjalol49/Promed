import React, { useState, useEffect, useRef } from 'react';
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
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse initial date or use today
    const initialDate = value ? new Date(value) : new Date();
    const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); // 0 is Sunday

    // Adjust for Monday start (optional, standard is usually Sunday or Monday depending on locale)
    // Let's stick to Standard Sunday (0) - Saturday (6) for simplicity or match locale.
    // We'll use standard 0-6 Sunday start for grid.

    const handleDayClick = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        // Format YYYY-MM-DD manually to avoid timezone issues
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
        // Empty slots for days before first day of month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            // Compare ignoring time
            const isSelected = value && new Date(value).toDateString() === date.toDateString();
            const isToday = new Date().toDateString() === date.toDateString();

            days.push(
                <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    type="button"
                    className={`
                    h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
                    ${isSelected
                            ? 'bg-promed-primary text-white shadow-md shadow-promed-primary/30'
                            : isToday
                                ? 'bg-amber-100 text-amber-700 font-bold border border-amber-200'
                                : 'text-slate-700 hover:bg-slate-100'
                        }
                `}
                >
                    {day}
                </button>
            );
        }
        return days;
    };

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const monthNames = [
        t('january') || 'January', t('february') || 'February', t('march') || 'March', t('april') || 'April',
        t('may') || 'May', t('june') || 'June', t('july') || 'July', t('august') || 'August',
        t('september') || 'September', t('october') || 'October', t('november') || 'November', t('december') || 'December'
    ];

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{label}</label>}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
            w-full p-3 bg-white border rounded-xl flex items-center justify-between cursor-pointer transition-all
            ${isOpen ? 'ring-2 ring-promed-primary border-promed-primary' : 'border-slate-300 hover:border-slate-400'}
        `}
            >
                <div className="flex items-center space-x-3 text-slate-700">
                    <Calendar size={18} className="text-promed-primary" />
                    <span className={value ? 'font-medium' : 'text-slate-400'}>
                        {value ? formatDateDisplay(value) : 'Select date'}
                    </span>
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-72 animate-in fade-in zoom-in-95 duration-200 left-0 sm:left-auto">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="font-bold text-slate-800 text-base">
                            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </span>
                        <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="text-xs font-bold text-slate-400 uppercase">{day}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {renderCalendar()}
                    </div>
                </div>
            )}
        </div>
    );
};

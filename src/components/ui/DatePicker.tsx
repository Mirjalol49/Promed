import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    const [isMobile, setIsMobile] = useState(false);

    // Parse initial date or use today
    const initialDate = value ? new Date(value) : new Date();
    const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Prevent body scroll on mobile when picker is open
    useEffect(() => {
        if (isOpen && isMobile) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [isOpen, isMobile]);

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
                <button
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
                </button>
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
                <button type="button" onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition">
                    <ChevronLeft size={20} />
                </button>
                <span className="font-bold text-slate-800 text-base capitalize">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button type="button" onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition">
                    <ChevronRight size={20} />
                </button>
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

            <AnimatePresence>
                {isOpen && (
                    isMobile ? (
                        typeof document !== 'undefined' && createPortal(
                            <div className="fixed inset-0 z-[100000] bg-black/20 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
                                <motion.div
                                    id={portalId}
                                    initial={{ opacity: 0, y: 100 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 100 }}
                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 overflow-hidden pb-6 safe-area-bottom"
                                >
                                    <div className="flex justify-center pt-3 pb-2">
                                        <div className="w-10 h-1 bg-slate-300 rounded-full" />
                                    </div>
                                    <div className="px-4 pb-4">
                                        {renderDropdownContent()}
                                    </div>
                                </motion.div>
                            </div>, document.body
                        )
                    ) : (
                        <div id={portalId} className="absolute z-50 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-72 animate-in fade-in zoom-in-95 duration-200 left-0 sm:left-auto">
                            {renderDropdownContent()}
                        </div>
                    )
                )}
            </AnimatePresence>
        </div>
    );
};

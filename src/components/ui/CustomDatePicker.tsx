import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from 'date-fns';
import { uz, enUS, ru } from 'date-fns/locale';
import { useLanguage } from '../../contexts/LanguageContext';

interface CustomDatePickerProps {
    value: Date | null;
    onChange: (date: Date) => void;
    label?: string;
    minimal?: boolean;
    placeholder?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, label, minimal = false, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);
    const { language } = useLanguage();
    const locale = language === 'uz' ? uz : language === 'ru' ? ru : enUS;
    const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 0 });

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const updatePosition = () => {
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                    const dropdownHeight = 350; // Approx max height for calendar
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const showAbove = spaceBelow < dropdownHeight;

                    setCoords({
                        top: showAbove ? undefined : rect.bottom + 8,
                        bottom: showAbove ? window.innerHeight - rect.top + 8 : undefined,
                        left: rect.left,
                        width: rect.width
                    });
                }
            };

            updatePosition();
            window.addEventListener('resize', () => setIsOpen(false));
            window.addEventListener('scroll', () => setIsOpen(false), true);

            return () => {
                window.removeEventListener('resize', () => setIsOpen(false));
                window.removeEventListener('scroll', () => setIsOpen(false), true);
            };
        }
    }, [isOpen]);

    useEffect(() => {
        if (value) {
            setCurrentMonth(value);
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Check if click is outside BOTH the trigger button (containerRef) AND the portal content
            // We need a specific ref for the dropdown content, or rely on the logic that if it's not the container, close it?
            // Actually, since the dropdown is in a portal, containerRef.contains(event.target) won't work for the dropdown content.
            // We need to stop propagation on the dropdown or check a ref on the dropdown.
            // Let's rely on a separate ref for the dropdown content.
        };
        // Simplified: We'll close if we click anywhere else. 
        // We will perform the check inside the click handler:
        // If clicking inside the portal, don't close.
        // If clicking inside the trigger, don't close (handled by toggle).
        // If clicking elsewhere, close.
    }, []);

    // Better click outside logic that works with Portal
    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            if (!isOpen) return;
            // We need a ref for the dropdown portal content
            const dropdownEl = document.getElementById(portalId);
            if (containerRef.current?.contains(e.target as Node)) {
                return; // Clicked on trigger
            }
            if (dropdownEl?.contains(e.target as Node)) {
                return; // Clicked inside dropdown
            }
            setIsOpen(false);
        };
        window.addEventListener('mousedown', handleGlobalClick);
        return () => window.removeEventListener('mousedown', handleGlobalClick);
    }, [isOpen]);

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-4 px-2">
                <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-slate-800 font-bold capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale })}
                </span>
                <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        );
    };

    const renderDays = () => {
        const dateFormat = "EEEEE";
        const days = [];
        let startDate = startOfWeek(currentMonth, { locale });

        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i} className="text-center text-xs font-bold text-slate-400 uppercase py-1">
                    {format(addDays(startDate, i), dateFormat, { locale })}
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
                formattedDate = format(day, dateFormat);
                const cloneDay = day;

                const isSelected = value ? isSameDay(day, value) : false;
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isTodayDate = isToday(day);

                days.push(
                    <div
                        key={day.toString()}
                        className={`p-1 relative`}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                onChange(cloneDay);
                                setIsOpen(false);
                            }}
                            className={`
                                w-8 h-8 flex items-center justify-center rounded-xl text-sm font-bold transition-all relative z-10 mx-auto
                                ${!isCurrentMonth ? 'text-slate-300' : ''}
                                ${isSelected
                                    ? 'bg-promed-primary text-white shadow-lg shadow-promed-primary/30'
                                    : isCurrentMonth ? 'text-slate-700 hover:bg-slate-100' : ''
                                }
                                ${isTodayDate && !isSelected ? 'text-promed-primary bg-promed-light' : ''}
                            `}
                        >
                            {formattedDate}
                            {isTodayDate && !isSelected && (
                                <span className="absolute bottom-1 w-1 h-1 bg-promed-primary rounded-full" />
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
        return <div>{rows}</div>;
    };

    // Generate a unique ID for this instance if not provided
    const portalId = useRef(`datepicker-portal-${Math.random().toString(36).substr(2, 9)}`).current;

    // Portal Dropdown Content
    const dropdownContent = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    id={portalId}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        position: 'fixed',
                        top: coords.top,
                        bottom: coords.bottom,
                        left: coords.left,
                        width: '320px', // Fixed width for calendar looks better usually, or use coords.width
                        zIndex: 99999
                    }}
                    className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-300 overflow-hidden p-4"
                >
                    {renderHeader()}
                    {renderDays()}
                    {renderCells()}
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="relative" ref={containerRef}>
            {label && (
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                    {label}
                </label>
            )}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full text-left flex items-center gap-3 transition-all duration-200 outline-none group
                    ${minimal
                        ? 'bg-transparent border-none px-3 h-full'
                        : `bg-slate-50 border border-slate-300 rounded-2xl py-3.5 px-4 ${isOpen ? 'ring-4 ring-promed-primary/10 border-promed-primary bg-white' : 'hover:border-slate-400 hover:bg-white'}`
                    }
                    text-slate-700 font-bold
                `}
            >
                <CalendarIcon className={`w-5 h-5 text-slate-400 transition-colors ${isOpen ? 'text-promed-primary' : 'group-hover:text-slate-600'}`} />
                <span className="flex-1 whitespace-nowrap">
                    {value ? format(value, 'dd MMMM yyyy', { locale }) : (placeholder || 'Select Date')}
                </span>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-promed-primary' : ''}`} />
            </button>

            {/* Render Portal */}
            {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
        </div>
    );
};

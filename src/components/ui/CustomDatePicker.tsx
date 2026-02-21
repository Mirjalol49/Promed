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
    centered?: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, label, minimal = false, placeholder, centered = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);
    const { language, t } = useLanguage();
    const locale = language === 'uz' ? uz : language === 'ru' ? ru : enUS;
    const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 0 });
    const [isMobile, setIsMobile] = useState(false);

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

    useEffect(() => {
        if (isOpen && containerRef.current && !centered && !isMobile) {
            const updatePosition = () => {
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                    const dropdownHeight = 380; // Approx max height for calendar
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
    }, [isOpen, centered, isMobile]);

    useEffect(() => {
        if (value) {
            setCurrentMonth(value);
        }
    }, [value]);

    // Better click outside logic that works with Portal
    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            if (!isOpen) return;
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
                <button
                    type="button"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Previous month"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-slate-800 font-bold capitalize text-sm md:text-base">
                    {format(currentMonth, 'MMMM yyyy', { locale })}
                </span>
                <button
                    type="button"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Next month"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        );
    };

    const renderDays = () => {
        const dateFormat = isMobile ? "EE" : "EEEEE";
        const days = [];
        let startDate = startOfWeek(currentMonth, { locale });

        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i} className="text-center text-[10px] md:text-xs font-black text-blue-600 uppercase tracking-wider py-1 md:py-2">
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
                        className={`p-0.5 md:p-1 relative`}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                onChange(cloneDay);
                                setIsOpen(false);
                            }}
                            aria-label={format(cloneDay, 'PPPP', { locale })}
                            className={`
                                w-10 h-10 md:w-9 md:h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all relative z-10 mx-auto
                                ${!isCurrentMonth ? 'text-slate-300' : ''}
                                ${isSelected
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : isCurrentMonth ? 'text-slate-700 hover:bg-slate-100 active:bg-slate-200' : ''
                                }
                                ${isTodayDate && !isSelected ? 'text-blue-600 ring-[1.5px] ring-blue-600 bg-blue-50 font-black shadow-sm' : ''}
                            `}
                        >
                            {formattedDate}
                            {isTodayDate && !isSelected && (
                                <span className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
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

    // Generate a unique ID for this instance
    const portalId = useRef(`datepicker-portal-${Math.random().toString(36).substr(2, 9)}`).current;

    // Portal Dropdown Content
    const dropdownContent = (
        <AnimatePresence>
            {isOpen && (
                centered ? (
                    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/10 backdrop-blur-[1px]" onClick={() => setIsOpen(false)}>
                        <motion.div
                            id={portalId}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl shadow-blue-500/10 border border-slate-100 overflow-hidden p-6 w-[340px] max-w-[90vw]"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Date picker"
                        >
                            {renderHeader()}
                            {renderDays()}
                            {renderCells()}
                        </motion.div>
                    </div>
                ) : isMobile ? (
                    // Mobile: Bottom Sheet
                    <div
                        className="fixed inset-0 z-[100000] bg-black/20 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            id={portalId}
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            onClick={(e) => e.stopPropagation()}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 overflow-hidden pb-6 safe-area-bottom"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Date picker"
                        >
                            {/* Drag Handle */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-10 h-1 bg-slate-300 rounded-full" />
                            </div>

                            <div className="px-4 pb-4">
                                {renderHeader()}
                                {renderDays()}
                                {renderCells()}
                            </div>
                        </motion.div>
                    </div>
                ) : (
                    // Desktop: Dropdown
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
                            width: '320px',
                            zIndex: 99999
                        }}
                        className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Date picker"
                    >
                        {renderHeader()}
                        {renderDays()}
                        {renderCells()}
                    </motion.div>
                )
            )}
        </AnimatePresence>
    );

    return (
        <div className={`relative ${minimal ? 'h-full' : ''}`} ref={containerRef}>
            {label && (
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                    {label}
                </label>
            )}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-label={value ? `Selected date: ${format(value, 'PPP', { locale })}` : (placeholder || 'Select date')}
                className={`
                    w-full flex items-center justify-center gap-1 md:gap-2 transition-all duration-200 outline-none group
                    ${minimal
                        ? 'bg-transparent border-none px-2 md:px-3 h-full'
                        : `bg-slate-50 border border-slate-300 rounded-2xl py-3 md:py-3.5 px-3 md:px-4 ${isOpen ? 'ring-4 ring-blue-600/10 border-blue-600 bg-white' : 'hover:border-slate-400 hover:bg-white'}`
                    }
                    text-slate-700 font-bold
                `}
            >
                <CalendarIcon className={`w-4 h-4 md:w-5 md:h-5 text-slate-400 transition-colors ${isOpen ? 'text-blue-600' : 'group-hover:text-slate-600'} flex-shrink-0`} />
                <span className="flex-1 text-center whitespace-nowrap text-[11px] sm:text-[13px] tracking-wide">
                    {value ? format(value, 'dd MMMM yyyy', { locale }) : (placeholder || t('select_date') || 'Sanani tanlang')}
                </span>
                <ChevronDown className={`w-4 h-4 md:w-5 md:h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
            </button>

            {/* Render Portal */}
            {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
        </div >
    );
};

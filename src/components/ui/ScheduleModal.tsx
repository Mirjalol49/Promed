import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Search, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday as isDateToday,
    addDays,
    setHours,
    setMinutes
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (date: Date) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, onSchedule }) => {
    const { t } = useLanguage();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'custom'>('today');
    const [showCalendar, setShowCalendar] = useState(false);

    // Calendar Navigation State
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Initialize with next rounded time
    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const future = new Date(now.getTime() + 10 * 60000); // +10 mins
            future.setSeconds(0);
            future.setMilliseconds(0);

            // Round minutes to nearest 5
            const minutes = future.getMinutes();
            const rounded = Math.ceil(minutes / 5) * 5;
            future.setMinutes(rounded);

            setSelectedDate(future);
            setActiveTab('today');
            setShowCalendar(false);
            setCurrentMonth(new Date());
        }
    }, [isOpen]);

    const handleTimeChange = (type: 'hour' | 'minute', value: string) => {
        let numVal = parseInt(value);
        if (isNaN(numVal)) return;

        const newDate = new Date(selectedDate);
        if (type === 'hour') {
            numVal = Math.max(0, Math.min(23, numVal));
            newDate.setHours(numVal);
        } else {
            numVal = Math.max(0, Math.min(59, numVal));
            newDate.setMinutes(numVal);
        }
        setSelectedDate(newDate);
    };

    const handleDateSelect = (tab: 'today' | 'tomorrow') => {
        const now = new Date();
        const newDate = new Date(selectedDate);
        const hours = selectedDate.getHours();
        const minutes = selectedDate.getMinutes();

        if (tab === 'today') {
            newDate.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
        } else {
            const tomorrow = addDays(now, 1);
            newDate.setFullYear(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
        }

        // Preserve time
        newDate.setHours(hours);
        newDate.setMinutes(minutes);

        setActiveTab(tab);
        setSelectedDate(newDate);
        setShowCalendar(false);
    };

    const onCalendarDateClick = (day: Date) => {
        const newDate = new Date(day);
        // Preserve current selected time
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());

        setSelectedDate(newDate);

        // Determine tab
        if (isDateToday(newDate)) setActiveTab('today');
        else if (isSameDay(newDate, addDays(new Date(), 1))) setActiveTab('tomorrow');
        else setActiveTab('custom');

        setShowCalendar(false);
    };

    const renderCalendar = () => {
        const startDate = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }); // Monday start
        const endDate = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
        const dateFormat = "d";
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

        // Generate Days
        const allDays = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="animate-fade-in">
                {/* Month Nav */}
                <div className="flex items-center justify-between mb-4 px-1">
                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                        <ChevronLeft size={20} className="text-slate-500" />
                    </motion.button>
                    <span className="font-semibold text-slate-900">
                        {format(currentMonth, "MMMM yyyy")}
                    </span>
                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                        <ChevronRight size={20} className="text-slate-500" />
                    </motion.button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-2">
                    {weekDays.map((d) => (
                        <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {allDays.map((dateObj, i) => {
                        const isSelected = isSameDay(dateObj, selectedDate);
                        const isCurrentMonth = isSameMonth(dateObj, currentMonth);
                        const isTodayDate = isDateToday(dateObj);

                        return (
                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                key={i}
                                onClick={() => onCalendarDateClick(dateObj)}
                                className={`
                                    h-9 w-9 rounded-full flex items-center justify-center text-sm transition-all
                                    ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                                    ${isSelected ? 'bg-[#3390EC] text-white font-bold shadow-md scale-110' : 'hover:bg-slate-100'}
                                    ${isTodayDate && !isSelected ? 'ring-1 ring-[#3390EC] text-[#3390EC]' : ''}
                                `}
                            >
                                {format(dateObj, dateFormat)}
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Use React Portal to break out of any stacking context (like sticky headers)
    if (!isOpen) return null;

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatDateTab = () => {
        if (activeTab === 'today') return "Today";
        if (activeTab === 'tomorrow') return "Tomorrow";
        return format(selectedDate, "MMM d");
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in font-sans">
            <div
                className="bg-white text-slate-900 rounded-xl shadow-2xl w-[340px] overflow-hidden transform transition-all scale-100 border border-slate-100"
                style={{ boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="font-medium text-[17px] tracking-tight flex items-center gap-2 text-slate-900">
                        {showCalendar ? (
                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                onClick={() => setShowCalendar(false)}
                                className="flex items-center gap-1 text-[#3390EC] hover:text-[#3390EC]/80 transition-colors -ml-1"
                            >
                                <ChevronLeft size={18} />
                                {t('back')}
                            </motion.button>
                        ) : (
                            t('schedule_message_title')
                        )}
                    </h3>
                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-1 rounded-full">
                        <X size={18} />
                    </motion.button>
                </div>

                {/* Content */}
                <div className="p-5">

                    {!showCalendar ? (
                        <>
                            {/* Date Tabs */}
                            <div className="flex bg-slate-100 rounded-xl p-1 mb-6 border border-slate-300 relative isolate">
                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                    onClick={() => handleDateSelect('today')}
                                    className={`relative flex-1 py-2 text-sm rounded-lg transition-colors duration-200 z-10 font-bold ${activeTab === 'today' ? 'text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'}`}
                                >
                                    {activeTab === 'today' && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 rounded-lg bg-gradient-to-b from-[#4C6FFF] to-[#3344EC] shadow-[0_2px_4px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.35)]"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            style={{ zIndex: -1 }}
                                        />
                                    )}
                                    <span className="relative z-10 drop-shadow-sm">{t('schedule_today')}</span>
                                </motion.button>

                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                    onClick={() => handleDateSelect('tomorrow')}
                                    className={`relative flex-1 py-2 text-sm rounded-lg transition-colors duration-200 z-10 font-bold ${activeTab === 'tomorrow' ? 'text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'}`}
                                >
                                    {activeTab === 'tomorrow' && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 rounded-lg bg-gradient-to-b from-[#4C6FFF] to-[#3344EC] shadow-[0_2px_4px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.35)]"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            style={{ zIndex: -1 }}
                                        />
                                    )}
                                    <span className="relative z-10 drop-shadow-sm">{t('schedule_tomorrow')}</span>
                                </motion.button>

                                {/* Calendar Trigger */}
                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                    onClick={() => { setShowCalendar(true); setCurrentMonth(selectedDate); }}
                                    className={`relative px-3 py-1.5 rounded-lg transition-colors duration-200 flex items-center justify-center z-10 ${activeTab === 'custom' ? 'text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'}`}
                                    title={t('pick_date')}
                                >
                                    {activeTab === 'custom' && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 rounded-lg bg-gradient-to-b from-[#4C6FFF] to-[#3344EC] shadow-[0_2px_4px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.35)]"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            style={{ zIndex: -1 }}
                                        />
                                    )}
                                    <span className="relative z-10 drop-shadow-sm"><CalendarIcon size={18} /></span>
                                </motion.button>
                            </div>

                            {/* Time Inputs */}
                            <div className="flex flex-col items-center mb-8">
                                <div className="flex items-center justify-center gap-3">
                                    <div className="bg-white border-2 border-slate-300 rounded-2xl p-1 flex items-center justify-center shadow-sm w-[88px] h-[88px]">
                                        <input
                                            type="number"
                                            min="0"
                                            max="23"
                                            value={selectedDate.getHours().toString().padStart(2, '0')}
                                            onChange={(e) => handleTimeChange('hour', e.target.value)}
                                            className="bg-transparent w-full h-full text-center text-4xl font-medium focus:outline-none focus:text-[#3390EC] text-slate-800 transition-colors appearance-none [&::-webkit-inner-spin-button]:appearance-none m-0"
                                        />
                                    </div>
                                    <span className="text-4xl font-light text-slate-400 -mt-1">:</span>
                                    <div className="bg-white border-2 border-slate-300 rounded-2xl p-1 flex items-center justify-center shadow-sm w-[88px] h-[88px]">
                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={selectedDate.getMinutes().toString().padStart(2, '0')}
                                            onChange={(e) => handleTimeChange('minute', e.target.value)}
                                            className="bg-transparent w-full h-full text-center text-4xl font-medium focus:outline-none focus:text-[#3390EC] text-slate-800 transition-colors appearance-none [&::-webkit-inner-spin-button]:appearance-none m-0"
                                        />
                                    </div>
                                </div>
                                <div className="mt-3 text-xs text-slate-400 font-medium">
                                    {format(selectedDate, "MMMM d, yyyy")}
                                </div>
                            </div>

                            {/* Send Button */}
                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                onClick={() => {
                                    const now = new Date();
                                    if (selectedDate < now) {
                                        // Simple alert for now, or use toast if available in props (it's not, need to use hook)
                                        // We'll use window.alert for immediate feedback as getting useToast might break imports
                                        alert(t('alert_future_time'));
                                        return;
                                    }
                                    onSchedule(selectedDate);
                                }}
                                className={`w-full py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg ${selectedDate < new Date() ? 'bg-slate-200 text-slate-400 cursor-not-allowed font-medium' : 'btn-premium-blue font-bold tracking-wide'}`}
                            >
                                <span>
                                    {activeTab === 'today' && `${t('schedule_send_today')} ${formatTime(selectedDate)}`}
                                    {activeTab === 'tomorrow' && `${t('schedule_send_tomorrow')} ${formatTime(selectedDate)}`}
                                    {activeTab === 'custom' && `${t('schedule_send_date')} ${formatDateTab()} ${t('schedule_at')} ${formatTime(selectedDate)}`}
                                </span>
                            </motion.button>
                        </>
                    ) : (
                        renderCalendar()
                    )}

                </div>
            </div>

            {/* Backdrop click to close */}
            <div className="absolute inset-0 z-[-1]" onClick={onClose}></div>
        </div>,
        document.body
    );
};

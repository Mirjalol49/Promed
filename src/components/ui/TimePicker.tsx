import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface TimePickerProps {
    label?: string;
    value: string; // HH:mm
    onChange: (time: string) => void;
    className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
    label,
    value = "09:00",
    onChange,
    className = ''
}) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const [selectedHour, setSelectedHour] = useState(parseInt(value.split(':')[0]) || 9);
    const [selectedMinute, setSelectedMinute] = useState(parseInt(value.split(':')[1]) || 0);

    // Sync state
    useEffect(() => {
        if (value) {
            setSelectedHour(parseInt(value.split(':')[0]) || 9);
            setSelectedMinute(parseInt(value.split(':')[1]) || 0);
        }
    }, [value]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-scroll to selected time on open
    useEffect(() => {
        if (isOpen) {
            // Small delay to ensure render and animation completion
            setTimeout(() => {
                const hourEl = document.getElementById('selected-hour');
                const minuteEl = document.getElementById('selected-minute');

                if (hourEl) {
                    hourEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
                if (minuteEl) {
                    minuteEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            }, 300);
        }
    }, [isOpen]);

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

    const handleTimeChange = (h: number, m: number) => {
        const hStr = h.toString().padStart(2, '0');
        const mStr = m.toString().padStart(2, '0');
        onChange(`${hStr}:${mStr}`);
        setSelectedHour(h);
        setSelectedMinute(m);
    };

    return (
        <div className={`relative ${className} mb-6 sm:mb-0`} ref={containerRef}>
            {label && <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 ml-1">{label}</label>}

            {/* INPUT TRIGGER */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full p-3.5 bg-white border rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-200
                    ${isOpen
                        ? 'border-promed-primary ring-4 ring-promed-primary/10'
                        : 'border-slate-200 hover:border-promed-primary/30'
                    }
                `}
            >
                <div className="flex items-center space-x-3 text-slate-700">
                    <div className={`p-2 rounded-xl transition-colors ${isOpen ? 'bg-promed-light text-promed-primary' : 'bg-slate-100 text-slate-400'}`}>
                        <Clock className="w-5 h-5" />
                    </div>
                    {/* UPDATED: font-medium to match DatePicker, removed tracking-tight for cleaner look */}
                    <span className="font-medium text-lg text-slate-900">
                        {value}
                    </span>
                </div>
                <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-promed-primary' : ''}`} />
            </div>

            {/* DROPDOWN - Clean & Minimal */}
            {isOpen && (
                <div className="absolute z-50 mt-2 bg-white rounded-3xl shadow-xl border border-slate-100 p-5 w-full min-w-[300px] animate-in fade-in zoom-in-95 duration-200 slide-in-from-top-2 left-0">

                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-4">
                        {t('select_time')}
                    </div>

                    <div className="flex justify-between px-8 mb-2">
                        <span className="text-[10px] font-bold text-slate-300 uppercase">{t('hours')}</span>
                        <span className="text-[10px] font-bold text-slate-300 uppercase">{t('minutes')}</span>
                    </div>

                    {/* COLUMNS */}
                    <div className="flex h-40 mb-4 relative">
                        {/* Hours */}
                        <div className="flex-1 overflow-y-auto no-scrollbar py-[60px] text-center space-y-1 scroll-smooth">
                            {hours.map(h => (
                                <button
                                    key={h}
                                    id={selectedHour === h ? 'selected-hour' : undefined}
                                    onClick={() => handleTimeChange(h, selectedMinute)}
                                    className={`
                                        w-12 h-10 rounded-xl text-lg font-bold transition-all flex items-center justify-center mx-auto
                                        ${selectedHour === h
                                            ? 'bg-white border-2 border-promed-primary text-promed-primary shadow-sm z-10'
                                            : 'text-slate-300 hover:text-slate-500'
                                        }
                                    `}
                                >
                                    {h.toString().padStart(2, '0')}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center justify-center text-slate-200 text-xl font-light">:</div>

                        {/* Minutes */}
                        <div className="flex-1 overflow-y-auto no-scrollbar py-[60px] text-center space-y-1 scroll-smooth">
                            {minutes.map(m => (
                                <button
                                    key={m}
                                    id={selectedMinute === m ? 'selected-minute' : undefined}
                                    onClick={() => handleTimeChange(selectedHour, m)}
                                    className={`
                                        w-12 h-10 rounded-xl text-lg font-bold transition-all flex items-center justify-center mx-auto
                                        ${selectedMinute === m
                                            ? 'bg-white border-2 border-promed-primary text-promed-primary shadow-sm z-10'
                                            : 'text-slate-300 hover:text-slate-500'
                                        }
                                    `}
                                >
                                    {m.toString().padStart(2, '0')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => setIsOpen(false)}
                        className="btn-premium-blue w-full rounded-xl py-3 text-sm shadow-lg shadow-promed-primary/20"
                    >
                        {t('set_time')}
                    </button>

                </div>
            )}
        </div>
    );
};

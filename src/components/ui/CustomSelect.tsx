import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface CustomSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    renderOption?: (option: Option) => React.ReactNode;
    searchable?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange, placeholder = 'Select...', label, renderOption, searchable = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Calculate position
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const updatePosition = () => {
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                    const dropdownHeight = 300; // Increased height for search
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

            // Focus search input if searchable
            if (searchable && searchInputRef.current) {
                // Small timeout to allow animation to start and element to be mounted
                setTimeout(() => searchInputRef.current?.focus(), 50);
            }

            const handleScroll = (e: Event) => {
                const dropdownEl = document.getElementById('custom-select-portal');
                if (dropdownEl && dropdownEl.contains(e.target as Node)) {
                    return;
                }
                setIsOpen(false);
            };

            // Close on scroll/resize to prevent drifting, but allow internal scrolling
            window.addEventListener('resize', () => setIsOpen(false));
            window.addEventListener('scroll', handleScroll, true);

            return () => {
                window.removeEventListener('resize', () => setIsOpen(false));
                window.removeEventListener('scroll', handleScroll, true);
            };
        } else {
            // Reset search when closed
            const timeout = setTimeout(() => setSearchTerm(''), 200);
            return () => clearTimeout(timeout);
        }
    }, [isOpen, searchable]);

    // Click outside handler
    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            if (!isOpen) return;
            const dropdownEl = document.getElementById('custom-select-portal');
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

    const selectedOption = options.find(option => option.value === value);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(option =>
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    const dropdownContent = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    id="custom-select-portal"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        position: 'fixed',
                        top: coords.top,
                        bottom: coords.bottom,
                        left: coords.left,
                        width: coords.width,
                        zIndex: 99999
                    }}
                    className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-300 overflow-hidden flex flex-col max-h-[300px]"
                >
                    {searchable && (
                        <div className="p-2 border-b border-slate-100 bg-white sticky top-0 z-10">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    )}

                    <div className="p-1.5 space-y-1 overflow-y-auto custom-scrollbar flex-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`
                                        w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-colors text-left
                                        ${value === option.value ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        {renderOption ? renderOption(option) : option.label}
                                    </div>
                                    {value === option.value && <Check className="w-4 h-4 ml-2 flex-shrink-0" />}
                                </button>
                            ))
                        ) : (
                            <div className="py-8 text-center text-slate-400 text-sm font-medium">
                                No results found
                            </div>
                        )}
                    </div>
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
                    w-full h-[52px] bg-slate-50 border border-slate-300 rounded-2xl px-4 text-left flex items-center justify-between
                    text-slate-700 font-bold transition-all duration-200 outline-none
                    ${isOpen ? 'ring-4 ring-blue-500/10 border-blue-500 bg-white' : 'hover:border-slate-400 hover:bg-white'}
                `}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {selectedOption ? (renderOption ? renderOption(selectedOption) : selectedOption.label) : <span className="text-slate-400 font-normal">{placeholder}</span>}
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
            </button>

            {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
        </div>
    );
};

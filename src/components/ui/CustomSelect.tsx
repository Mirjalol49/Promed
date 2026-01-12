import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
}

interface CustomSelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    className = '',
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Get selected option label
    const selectedOption = options.find(opt => opt.value === value);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const handleSelect = (optValue: string) => {
        onChange(optValue);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
          w-full px-4 py-3 rounded-xl border text-left font-medium
          flex items-center justify-between gap-2
          transition-all duration-200 cursor-pointer
          ${disabled
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : isOpen
                            ? 'bg-white border-promed-primary ring-2 ring-promed-primary/20 shadow-lg'
                            : 'bg-white border-slate-400 hover:border-slate-500 shadow-sm hover:shadow'
                    }
        `}
            >
                <span className={selectedOption ? 'text-slate-900' : 'text-slate-400'}>
                    {selectedOption?.label || placeholder}
                </span>
                <ChevronDown
                    size={18}
                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-promed-primary' : ''}`}
                />
            </button>

            {/* Options Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 py-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSelect(option.value)}
                            className={`
                w-full px-4 py-3 text-left flex items-center justify-between gap-2
                transition-colors duration-150
                ${option.value === value
                                    ? 'bg-promed-bg text-promed-primary font-bold'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }
              `}
                        >
                            <span>{option.label}</span>
                            {option.value === value && (
                                <Check size={16} className="text-promed-primary" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;

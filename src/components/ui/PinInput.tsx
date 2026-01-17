import React, { useRef, useEffect } from 'react';

interface PinInputProps {
    value: string[];
    onChange: (value: string[]) => void;
    onComplete?: (code: string) => void;
    error?: boolean;
    autoFocus?: boolean;
}

export const PinInput: React.FC<PinInputProps> = ({
    value,
    onChange,
    onComplete,
    error = false,
    autoFocus = true
}) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (autoFocus && inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [autoFocus]);

    const handleChange = (index: number, val: string) => {
        // Allow only numbers
        if (!/^\d*$/.test(val)) return;

        const newPin = [...value];
        const lastChar = val.slice(-1); // Take last char if multiple pasted

        newPin[index] = lastChar;
        onChange(newPin);

        // Auto-advance
        if (lastChar && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Check completion
        if (index === 5 && lastChar && newPin.every(d => d !== '')) {
            onComplete?.(newPin.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !value[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // Handle paste
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
        if (pastedData.every(char => /^\d$/.test(char))) {
            const newPin = [...value];
            pastedData.forEach((char, i) => {
                if (i < 6) newPin[i] = char;
            });
            onChange(newPin);
            if (pastedData.length === 6) onComplete?.(newPin.join(''));
            // Focus last filled
            inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
        }
    };

    return (
        <div className="flex gap-2 sm:gap-4 justify-center w-full max-w-sm mx-auto">
            {value.map((digit, idx) => (
                <div key={idx} className="relative">
                    <input
                        ref={el => { inputRefs.current[idx] = el; }}
                        type="tel"
                        inputMode="numeric"
                        pattern="\d*"
                        value={digit}
                        onChange={(e) => handleChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={handlePaste}
                        className={`
                            peer
                            outline-none focus:outline-none 
                            w-12 h-14 sm:w-14 sm:h-16 
                            bg-white 
                            border-[2px] 
                            ${error
                                ? 'border-rose-500 focus:border-rose-600 ring-rose-300'
                                : 'border-slate-200 focus:border-[#f71590] focus:ring-4 focus:ring-[#f71590]'
                            }
                            ${digit ? 'border-slate-300' : ''}
                            rounded-[18px] 
                            text-center text-transparent cursor-pointer 
                            transition-all duration-200
                            shadow-sm
                            caret-transparent select-none
                            relative z-10
                        `}
                        maxLength={1}
                    />

                    {/* Blinking Cursor for Focus State */}
                    {!digit && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                            <div className="w-[3px] h-6 bg-[#f71590] opacity-0 peer-focus:opacity-100 peer-focus:animate-pulse rounded-full transition-opacity duration-200" />
                        </div>
                    )}

                    {/* Dot masking dot */}
                    {digit && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in zoom-in duration-200 z-20">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-slate-800 rounded-full shadow-sm" />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

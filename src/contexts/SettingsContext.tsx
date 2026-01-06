import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextType {
    soundEnabled: boolean;
    toggleSound: () => void;
    setSound: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [soundEnabled, setSoundEnabled] = useState(() => {
        const saved = localStorage.getItem('promed_sound_enabled');
        return saved !== null ? saved === 'true' : true;
    });

    useEffect(() => {
        localStorage.setItem('promed_sound_enabled', soundEnabled.toString());
    }, [soundEnabled]);

    const toggleSound = () => setSoundEnabled(prev => !prev);
    const setSound = (enabled: boolean) => setSoundEnabled(enabled);

    return (
        <SettingsContext.Provider value={{ soundEnabled, toggleSound, setSound }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

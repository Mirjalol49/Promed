import React, { createContext, useEffect, useState, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Check active session on mount
        const initSession = async () => {
            try {
                const { data: { session: initialSession }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error("Auth initialization error:", error);
                }
                setSession(initialSession);
                setUser(initialSession?.user ?? null);
            } catch (err) {
                console.error("Unexpected auth error:", err);
            } finally {
                setLoading(false);
            }
        };

        initSession();

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            console.log("🔐 Auth State Change:", _event, newSession?.user?.email);
            setSession(newSession);
            setUser(newSession?.user ?? null);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
    };

    const value = {
        session,
        user,
        loading,
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

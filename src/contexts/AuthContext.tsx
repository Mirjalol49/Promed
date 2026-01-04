import React, { createContext, useEffect, useState, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'; // Firebase imports
import { auth } from '../lib/firebase'; // Custom Firebase instance

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen for Firebase Auth changes
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            console.log("🔐 Auth State Change:", firebaseUser?.email);
            setUser(firebaseUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signOut = async () => {
        await firebaseSignOut(auth);
        setUser(null);
    };

    const value = {
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

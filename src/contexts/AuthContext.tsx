import React, { createContext, useEffect, useState, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'; // Firebase imports
import { auth, db } from '../lib/firebase'; // Custom Firebase instance
import { doc, getDoc } from 'firebase/firestore'; // Firestore imports

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
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log("🔐 Auth State Change:", firebaseUser?.email);

            try {
                if (firebaseUser) {
                    // SESSION GUARD: Check if profile actually exists
                    const profileRef = doc(db, 'profiles', firebaseUser.uid);
                    const profileSnap = await getDoc(profileRef);

                    if (!profileSnap.exists()) {
                        console.warn(`⛔ ACCOUNT DELETED: Profile for ${firebaseUser.uid} is missing. Forcing logout.`);
                        await firebaseSignOut(auth);
                        setUser(null);
                        setLoading(false);
                        return;
                    }
                }
                setUser(firebaseUser);
            } catch (error) {
                console.error("Auth State verification failed:", error);
                // In case of error, we arguably should log them out or at least let them proceed as null to avoid hanging
                // For safety, let's treat as logged out if verification fails hard
                setUser(null);
            } finally {
                setLoading(false);
            }
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

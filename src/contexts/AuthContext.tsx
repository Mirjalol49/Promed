import React, { createContext, useEffect, useState, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, setPersistence, browserLocalPersistence } from 'firebase/auth'; // Added persistence
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
        let mounted = true;

        const initAuth = async () => {
            // 1. Set Persistence (Best effort)
            try {
                await setPersistence(auth, browserLocalPersistence);
            } catch (error) {
                console.error("Auth Persistence warning:", error);
            }

            // 2. Listen for Auth Changes
            onAuthStateChanged(auth, async (firebaseUser) => {
                if (!mounted) return;
                console.log("🔐 Auth State Change:", firebaseUser?.email);

                if (firebaseUser) {
                    try {
                        // Quick Profile Check
                        const profileRef = doc(db, 'profiles', firebaseUser.uid);
                        // Timeout the profile check to prevent infinite loading on bad connection
                        const profilePromise = getDoc(profileRef);
                        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));

                        const profileSnap: any = await Promise.race([profilePromise, timeoutPromise]).catch(e => null);

                        if (profileSnap && profileSnap.exists()) {
                            setUser(firebaseUser);
                        } else if (profileSnap === null) {
                            // Timeout or error -> Assume offline/ok to proceed to avoid lockout
                            console.warn("⚠️ Profile check timed out/failed. Allowing access offline.");
                            setUser(firebaseUser);
                        } else {
                            // Profile definitely doesn't exist
                            console.warn(`⛔ Profile missing for ${firebaseUser.uid}. Forcing logout.`);
                            await firebaseSignOut(auth);
                            setUser(null);
                        }
                    } catch (e) {
                        console.error("Critical Auth Error:", e);
                        setUser(firebaseUser); // Fail open -> let them in, views will handle missing data
                    }
                } else {
                    setUser(null);
                }
                setLoading(false);
            });
        };

        initAuth();

        // Safety Valve: If nothing happens in 6 seconds, stop loading
        const safetyTimer = setTimeout(() => {
            if (loading) {
                console.warn("⚠️ Auth Safety Timer triggered. Forcing app load.");
                setLoading(false);
            }
        }, 6000);

        return () => {
            mounted = false;
            clearTimeout(safetyTimer);
        };
    }, []);

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
        } catch (error) {
            console.error("Sign Out Error:", error);
        }
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

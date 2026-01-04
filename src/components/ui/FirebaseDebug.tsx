import React, { useEffect, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

export const FirebaseDebug: React.FC = () => {
    const [status, setStatus] = useState<{
        auth: 'checking' | 'connected' | 'error';
        db: 'checking' | 'connected' | 'error';
        errorMsg?: string;
    }>({ auth: 'checking', db: 'checking' });

    useEffect(() => {
        // Check Auth
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log("🔥 [DEBUG] Auth Connected. User:", user ? user.email : "No User");
            setStatus(prev => ({ ...prev, auth: 'connected' }));

            // Try explicit DB ping
            const checkDb = async () => {
                try {
                    // Try to fetch 1 doc from patients to see if Rules allow read
                    // Using a limit query to be efficient
                    const q = collection(db, "patients");
                    await getDocs(q); // If this throws, we have a rules/connection error
                    console.log("🔥 [DEBUG] Firestore Connected");
                    setStatus(prev => ({ ...prev, db: 'connected' }));
                } catch (e: any) {
                    console.error("🔥 [DEBUG] Firestore Error:", e);
                    setStatus(prev => ({ ...prev, db: 'error', errorMsg: e.message }));
                }
            };
            checkDb();
        });

        return () => unsubscribe();
    }, []);

    // Initial timeout to detect hanging
    useEffect(() => {
        const timer = setTimeout(() => {
            setStatus(prev => {
                if (prev.auth === 'checking') return { ...prev, auth: 'error', errorMsg: "Auth check timed out" };
                return prev;
            });
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed bottom-4 right-4 z-[99999] bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/20 text-white shadow-2xl font-mono text-xs w-80">
            <h3 className="text-yellow-400 font-bold mb-2 uppercase tracking-wider border-b border-white/10 pb-1">
                System Diagnostics
            </h3>

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span>Firebase Auth:</span>
                    <StatusBadge status={status.auth} />
                </div>

                <div className="flex justify-between items-center">
                    <span>Firestore DB:</span>
                    <StatusBadge status={status.db} />
                </div>
            </div>

            {status.errorMsg && (
                <div className="mt-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-200 break-words">
                    CRITICAL ERROR: {status.errorMsg}
                </div>
            )}

            <div className="mt-4 pt-2 border-t border-white/10 text-[10px] text-gray-400">
                PROMED v1.25.0 | {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ status: 'checking' | 'connected' | 'error' }> = ({ status }) => {
    if (status === 'checking') return <span className="text-yellow-400 animate-pulse">Checking...</span>;
    if (status === 'connected') return <span className="text-green-400 font-bold">ONLINE ✓</span>;
    return <span className="text-red-500 font-bold animate-pulse">OFFLINE ✗</span>;
};

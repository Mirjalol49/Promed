import { motion } from 'framer-motion';

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const DbDebug = () => {
    const [status, setStatus] = useState('Checking...');
    const [error, setError] = useState<string | null>(null);

    const checkDb = async () => {
        setStatus('Attempting write...');
        setError(null);
        try {
            // Try to write to a test document in the 'promed' database
            await setDoc(doc(db, 'debug_tests', 'browser_test'), {
                ok: true,
                timestamp: new Date().toISOString()
            });
            setStatus('✅ Connected (Write Success)');
        } catch (err: any) {
            console.error("DB Debug Error:", err);
            setStatus('❌ Failed');
            setError(err.message + (err.code ? ` [Code: ${err.code}]` : ''));
        }
    };

    useEffect(() => {
        checkDb();
    }, []);

    if (status.includes('Connected')) return null; // Hide if working? or maybe show small indicator.

    return (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-[9999] max-w-sm border border-slate-700">
            <h3 className="font-bold text-sm mb-2 text-yellow-400">Database Connection Debug</h3>
            <div className="text-xs font-mono mb-2">
                Status: {status}
            </div>
            {error && (
                <div className="text-xs text-red-300 bg-red-900/30 p-2 rounded mb-2 break-words">
                    {error}
                </div>
            )}
            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                onClick={checkDb}
                className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded"
            >
                Retry
            </motion.button>
        </div>
    );
};

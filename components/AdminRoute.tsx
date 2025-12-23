import React, { useEffect } from 'react';
import { useAccount } from '../contexts/AccountContext';

interface AdminRouteProps {
    children: React.ReactNode;
    onAccessDenied: () => void;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children, onAccessDenied }) => {
    const { role, isLoading, isVerified } = useAccount();

    useEffect(() => {
        console.log("🛡️ AdminRoute: Checking Access...", { role, isLoading, isVerified });
        // Only redirect if authentication is done AND the role has been verified from the DB
        if (!isLoading && isVerified && role !== 'admin') {
            console.error("🚫 Access Denied: Role is", role);
            onAccessDenied();
        }
    }, [role, isLoading, isVerified, onAccessDenied]);

    if (isLoading || !isVerified) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">Syncing Admin Sovereignty...</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-200 transition-colors"
                >
                    Manual Sync
                </button>
            </div>
        );
    }

    if (role !== 'admin') {
        return null;
    }

    return <>{children}</>;
};

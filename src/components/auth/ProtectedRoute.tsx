import React from 'react';
import { useAccount } from '../../contexts/AccountContext';
import { DashboardLoader } from '../ui/DashboardLoader';
import { LoginScreen } from '../../features/auth/LoginScreen';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isLoggedIn, isLoading, setAccount } = useAccount();

    if (isLoading) {
        return <DashboardLoader />;
    }

    if (!isLoggedIn) {
        // If not authenticated, force the Login Screen
        return <LoginScreen onLogin={(accId, uId, name, email, password, role) => setAccount(accId, uId, name, email, role as any, true)} />;
    }

    // If authenticated, allow access
    return <>{children}</>;
};

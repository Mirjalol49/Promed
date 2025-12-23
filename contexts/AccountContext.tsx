import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AccountContextType {
  accountId: string;
  userId: string;
  accountName: string;
  role: 'admin' | 'doctor' | 'staff';
  setAccount: (id: string, userId: string, name: string, role?: 'admin' | 'doctor' | 'staff', verified?: boolean) => void;
  isLoggedIn: boolean;
  isLoading: boolean;
  isVerified: boolean;
  logout: () => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const STORAGE_KEY = 'graft_account';

interface StoredAccount {
  id: string;
  userId: string;
  name: string;
  role: 'admin' | 'doctor' | 'staff';
}

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accountId, setAccountId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [role, setRole] = useState<'admin' | 'doctor' | 'staff'>('doctor');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerified, setIsVerified] = useState<boolean>(false);

  // Load account from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    console.log('AccountProvider: Checking localStorage', stored);
    if (stored) {
      try {
        const account: StoredAccount = JSON.parse(stored);
        setAccountId(account.id);
        setUserId(account.userId || '');
        setAccountName(account.name);
        setRole(account.role || 'doctor');
      } catch (e) {
        console.error('Failed to parse stored account:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const setAccount = (id: string, userId: string, name: string, userRole: 'admin' | 'doctor' | 'staff' = 'doctor', verified: boolean = false) => {
    setAccountId(id);
    setUserId(userId);
    setAccountName(name);
    setRole(userRole);
    if (verified) setIsVerified(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, userId, name, role: userRole }));
  };

  const logout = () => {
    setAccountId('');
    setUserId('');
    setAccountName('');
    setRole('doctor');
    setIsVerified(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isLoggedIn = Boolean(accountId && userId);

  return (
    <AccountContext.Provider value={{ accountId, userId, accountName, role, setAccount, isLoggedIn, isLoading, isVerified, logout }}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = (): AccountContextType => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};

export default AccountContext;


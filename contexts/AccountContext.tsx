import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AccountContextType {
  accountId: string;
  userId: string;
  accountName: string;
  setAccount: (id: string, userId: string, name: string) => void;
  isLoggedIn: boolean;
  isLoading: boolean;
  logout: () => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const STORAGE_KEY = 'promed_account';

interface StoredAccount {
  id: string;
  userId: string;
  name: string;
}

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accountId, setAccountId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
      } catch (e) {
        console.error('Failed to parse stored account:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const setAccount = (id: string, userId: string, name: string) => {
    setAccountId(id);
    setUserId(userId);
    setAccountName(name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, userId, name }));
  };

  const logout = () => {
    setAccountId('');
    setUserId('');
    setAccountName('');
    localStorage.removeItem(STORAGE_KEY);
  };

  const isLoggedIn = Boolean(accountId && userId);

  return (
    <AccountContext.Provider value={{ accountId, userId, accountName, setAccount, isLoggedIn, isLoading, logout }}>
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


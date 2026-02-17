import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AccountContextType {
  accountId: string;
  userId: string;
  accountName: string;
  userEmail: string;
  role: 'admin' | 'doctor' | 'staff' | 'viewer' | 'seller' | 'nurse';
  setAccount: (id: string, userId: string, name: string, email: string, role?: 'admin' | 'doctor' | 'staff' | 'viewer' | 'seller' | 'nurse', verified?: boolean, image?: string) => void;
  isLoggedIn: boolean;
  isLoading: boolean;
  isVerified: boolean;
  userImage: string;
  subscriptionStatus: 'trial' | 'active' | 'frozen';
  subscriptionEnd: string | null;
  createdAt: string | null;
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const STORAGE_KEY = 'graft_account';

interface StoredAccount {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'doctor' | 'staff' | 'viewer' | 'seller' | 'nurse';
  image?: string;
  createdAt?: string;
}

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accountId, setAccountId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userImage, setUserImage] = useState<string>('');
  const [role, setRole] = useState<'admin' | 'doctor' | 'staff' | 'viewer' | 'seller' | 'nurse'>('doctor');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'trial' | 'active' | 'frozen'>('trial');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
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
        setUserEmail(account.email || '');
        setUserImage(account.image || '');
        setRole(account.role || 'doctor');
        setCreatedAt(account.createdAt || null);
      } catch (e) {
        console.error('Failed to parse stored account:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const setAccount = (id: string, userId: string, name: string, email: string, userRole: 'admin' | 'doctor' | 'staff' | 'viewer' | 'seller' | 'nurse' = 'doctor', verified: boolean = false, image: string = '', createdAtDate: string = '') => {
    setAccountId(id);
    setUserId(userId);
    setAccountName(name);
    setUserEmail(email);
    setRole(userRole);
    if (image) setUserImage(image);
    if (verified) setIsVerified(true);
    if (createdAtDate) setCreatedAt(createdAtDate);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, userId, name, email, role: userRole, image: image || userImage, createdAt: createdAtDate || createdAt }));
  };

  const refreshProfile = async () => {
    if (!userId) return;
    try {
      const { db } = await import('../lib/firebase');
      const { doc, getDoc } = await import('firebase/firestore');

      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        // Update Subscription
        setSubscriptionStatus(data.subscription_status as any || 'trial');
        setSubscriptionEnd(data.subscription_end || null);
        if (data.created_at) setCreatedAt(data.created_at);

        // Update Identity
        if (data.full_name || data.avatar_url || data.profile_image || data.role) {
          if (data.full_name) setAccountName(data.full_name);

          if (data.role) {
            setRole(data.role);
          }

          const newImage = data.avatar_url || data.profile_image;
          if (newImage) setUserImage(newImage);

          // Update localStorage
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (data.full_name) parsed.name = data.full_name;
            if (newImage) parsed.image = newImage;
            if (data.role) parsed.role = data.role;
            if (data.created_at) parsed.createdAt = data.created_at;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }
        }
      } else {
        console.warn('⚠️ AccountContext: Profile not found in Firestore. Forcing logout to clear stale state.');
        logout();
      }
    } catch (e) {
      console.error('Error refreshing profile:', e);
    }
  };

  // Auto-refresh profile on mount if logged in
  useEffect(() => {
    if (userId) refreshProfile();
  }, [userId]);

  const logout = async () => {
    try {
      const { auth } = await import('../lib/firebase');
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    } catch (e) {
      console.error('Firebase signOut error:', e);
    }

    setAccountId('');
    setUserId('');
    setAccountName('');
    setUserEmail('');
    setUserImage('');
    setRole('doctor');
    setIsVerified(false);
    setCreatedAt(null);
    localStorage.removeItem(STORAGE_KEY);

    // Force a reload to clear all states and re-initialize the app
    window.location.href = '/';
  };

  const isLoggedIn = Boolean(accountId && userId);

  return (
    <AccountContext.Provider value={{
      accountId, userId, accountName, userEmail, userImage, role, setAccount, isLoggedIn, isLoading, isVerified,
      subscriptionStatus, subscriptionEnd, createdAt, refreshProfile, logout
    }}>
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


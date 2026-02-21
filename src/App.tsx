import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { DashboardLoader } from './components/ui/DashboardLoader';
console.log("🛡️ PROMED SYSTEM BOOT: Version 1.25.0 - LockFix Loaded");

import { Dashboard } from './pages/Dashboard';
const LoginScreen = React.lazy(() => import('./features/auth/LoginScreen').then(m => ({ default: m.LoginScreen })));
const ResetPasswordScreen = React.lazy(() => import('./features/auth/ResetPasswordScreen').then(m => ({ default: m.ResetPasswordScreen })));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
import { PatientList, PatientDetail, AddPatientForm } from './features/patients/PatientList';
import { LeadsPage } from './pages/LeadsPage';
import { NotesPage } from './features/notes/NotesPage';
import { MessagesPage } from './features/messages/MessagesPage';
import { StaffPage } from './features/staff/StaffPage';
import { FinancePage } from './features/finance/FinancePage';
import { RolesPage } from './pages/RolesPage';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { EmergencySetup } from './pages/EmergencySetup'; // Added EmergencySetup
import { BannedScreen } from './features/auth/BannedScreen';
import Layout from './components/layout/Layout';
import { AdminRoute } from './components/layout/AdminRoute';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Users, UserPlus, Calendar, Activity, Bell, Shield, Smartphone, Lock, ArrowRight, LogOut, Eye, EyeOff } from 'lucide-react';
import { Patient, PageView, InjectionStatus, PatientImage, Transaction } from './types';
import { useLanguage } from './contexts/LanguageContext';
import { useAccount } from './contexts/AccountContext';
import { useToast } from './contexts/ToastContext';
import SyncToast from './components/ui/SyncToast';
import { useAppSounds } from './hooks/useAppSounds';
import {
  subscribeToPatients,
  addPatient,
  updatePatient,
  deletePatient as deletePatientFromDb,
  updatePatientInjections,
  addPatientAfterImage,
  deletePatientAfterImage,
  COLUMNS,
} from './lib/patientService';
import { subscribeToUserProfile, updateUserProfile } from './lib/userService';
import { addTransaction, subscribeToTransactions, calculateStats } from './lib/financeService';
import { uploadImage, uploadAvatar, setOptimisticImage, getOptimisticImage } from './lib/imageService';
import { ProfileAvatar } from './components/layout/ProfileAvatar';
import { useImagePreloader } from './lib/useImagePreloader';
import { isVideoFile } from './lib/imageOptimizer';
import ToastContainer from './components/ui/ToastContainer';
import DeleteModal from './components/ui/DeleteModal';
import { Trash2 } from 'lucide-react';
import { PinInput } from './components/ui/PinInput';
import { useReminderNotifications } from './hooks/useReminderNotifications';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/ui/PageTransition';
import { useRBAC } from './hooks/useRBAC';
import { SCOPES } from './config/permissions';

import { auth, db } from './lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { DbDebug } from './components/ui/DbDebug';
import { SuperAdmin } from './pages/SuperAdmin';
import { SettingsPage } from './pages/SettingsPage';

import { sendPasswordResetEmail } from 'firebase/auth';

import lockIcon from './assets/images/lock.png';
// New High-Res Assets for Toasts
import upsetIcon from './components/mascot/upset_mascot.png';
import operationIcon from './assets/images/operation.png';
import injectionIcon from './assets/images/injection.png';
import thinkingIcon from './components/mascot/thinking_mascot.png';

// --- Lock Screen Component ---
const LockScreen: React.FC<{ onUnlock: () => void; correctPassword: string }> = ({ onUnlock, correctPassword }) => {
  const { t } = useLanguage();
  const { playUnlock, playError } = useAppSounds();
  const [pin, setPin] = useState(['', '', '', '', '', '']);



  // Use a single ref for the array to ensure stability across re-renders
  // const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]); // Handled by PinInput now

  const [lockState, setLockState] = useState<'idle' | 'error' | 'success'>('idle');
  const [pinError, setPinError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPinType = /^\d{6}$/.test(correctPassword);



  const handleUnlock = (e?: React.FormEvent) => {
    e?.preventDefault();
    const enteredPin = pin.join('');

    if (enteredPin === correctPassword) {
      setLockState('success');
      playUnlock();
      setTimeout(onUnlock, 500);
    } else {
      setLockState('error');
      setPinError(true);
      playError(); // Play error sound on PIN failure

      // Reset back to idle after 1s
      setTimeout(() => {
        setPin(['', '', '', '', '', '']);
        setLockState('idle');
        setPinError(false);
        // Focus handling is internal to PinInput on re-render empty, or we can just leave it
      }, 1000);
    }
  };

  if (!t) {
    return <div className="fixed inset-0 bg-slate-900 flex items-center justify-center text-white">Loading Security...</div>;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-promed-deep flex flex-col items-center justify-center text-white animate-in fade-in duration-500">
      {/* Ambient Glow Effects (Consistent with Login) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-white/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-xl px-6">
        {/* Reactive Mascot */}
        <div className="relative mb-10 flex items-center justify-center">
          <div className="flex items-center justify-center animate-float">
            <img
              src={lockIcon}
              alt="Security Lock"
              className="w-24 h-24 md:w-32 md:h-32 object-contain relative z-10"
            />
          </div>

        </div>

        <h2 className="text-3xl md:text-4xl font-black mb-3 tracking-widest text-white text-center">
          {t('security_check')}
        </h2>
        <p className="text-white/80 mb-12 text-center font-medium max-w-xs">
          {isPinType ? t('remember_password') : "Hisob parolingizni kiriting"}
        </p>

        <form onSubmit={handleUnlock} className="w-full flex flex-col items-center space-y-8 md:space-y-10">
          {isPinType ? (
            <div className="space-y-4 w-full flex flex-col items-center">
              <PinInput
                value={pin}
                onChange={(val) => {
                  setPin(val);
                  if (pinError) setPinError(false); // Clear error on typing
                }}
                /* Auto-submit disabled: removed onComplete */
                error={pinError}
                autoFocus={true}
              />
              {/* Error Message */}
              {pinError && (
                <p className="text-rose-500 font-bold text-sm animate-pulse">
                  {t('wrong_password') || "Password was incorrect"}
                </p>
              )}
            </div>
          ) : (
            <div className="w-full max-w-sm relative group/pass">
              <input
                type={showPassword ? "text" : "password"}
                value={pin.join('')}
                onChange={(e) => {
                  setPin(e.target.value.split(''));
                  if (pinError) setPinError(false);
                }}
                className={`w-full py-5 px-6 bg-white border-2 
                  ${pinError ? 'border-rose-500 shake ' : 'border-white/20'}
                  rounded-[24px] text-center text-2xl font-black text-promed-primary focus:outline-none focus:border-white `}
                placeholder="Parolni kiriting"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-promed-primary/40 hover:text-promed-primary transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {/* Error Message for Text Input */}
              {pinError && (
                <div className="absolute -bottom-8 left-0 right-0 text-center">
                  <p className="text-rose-400 font-bold text-sm animate-pulse">
                    {t('wrong_password') || "Password was incorrect"}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="w-full max-w-sm space-y-6">
            <button
              type="submit"
              className="btn-glossy-blue group flex items-center justify-center !text-base"
            >
              <span className="flex items-center gap-2 relative z-10">
                {t('unlock') || 'Ochish'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            {/* Forgot Password Link REMOVED */}
          </div>
        </form>
      </div>

      {/* Emergency Bypass Modal */}

    </div>
  );
};




import { useAuth } from './contexts/AuthContext';

const App: React.FC = () => {
  const { accountId, userId, role, isLoading: accountLoading, accountName, userEmail, userImage, setAccount, isLoggedIn, logout } = useAccount();
  const { can } = useRBAC();
  const { loading: authLoading, user: authUser, signOut } = useAuth();
  const { playLock } = useAppSounds();

  // Enable global reminder notifications
  useReminderNotifications();


  const [view, setView] = useState<PageView>(() => {
    if (window.location.pathname.includes('/admin')) return 'SUPER_ADMIN';
    if (window.location.pathname.includes('/patients')) return 'PATIENTS';
    if (window.location.pathname.includes('/leads')) return 'LEADS';
    if (window.location.pathname.includes('/settings')) return 'SETTINGS';
    if (window.location.pathname.includes('/messages')) return 'MESSAGES';
    if (window.location.pathname.includes('/staff')) return 'STAFF';
    if (window.location.pathname.includes('/finance')) return 'FINANCE';
    if (window.location.pathname.includes('/roles')) return 'ROLES';

    // Role-aware default landing page
    try {
      const stored = localStorage.getItem('graft_account');
      if (stored) {
        const { role: storedRole } = JSON.parse(stored);
        if (storedRole === 'seller') return 'LEADS';
      }
    } catch { }

    return 'DASHBOARD';
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedInjectionId, setSelectedInjectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Initialize lock state from localStorage to persist across refreshes
  const [isLocked, setIsLocked] = useState(() => {
    const savedLockState = localStorage.getItem('appLockState');
    return savedLockState === 'true';
  });
  const [isBanned, setIsBanned] = useState(false);
  const [isLockEnabled, setIsLockEnabled] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [userPassword, setUserPassword] = useState('000000');
  // userImage now comes from AccountContext for persistence
  const [saving, setSaving] = useState(false);

  // Password Reset State
  const [resetCode, setResetCode] = useState<string | null>(null);

  const { t } = useLanguage();
  const { success, error: showError } = useToast();

  useEffect(() => {
    // Check for Firebase Action URL (Password Reset)
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');

    if (mode === 'resetPassword' && oobCode) {
      console.log("🔑 App: Detected Password Reset Mode");
      setResetCode(oobCode);
    }

    // Request Notification Permission - REMOVED: Requires user gesture
    // if ('Notification' in window && Notification.permission !== 'granted') {
    //   Notification.requestPermission();
    // }
  }, []);

  // 🔥 GLOBAL NOTIFICATION LISTENER
  const prevUnreadCountRef = React.useRef(0);
  const { playNotification } = useAppSounds();

  useEffect(() => {
    // Calculate total currently unread
    const currentUnread = patients.reduce((acc, p) => acc + (p.unreadCount || 0), 0);

    // If count INCREASED and we are NOT on messages page
    if (currentUnread > prevUnreadCountRef.current && view !== 'MESSAGES' && !loading) {
      console.log("🔔 New Message Detected! Previous:", prevUnreadCountRef.current, "Current:", currentUnread);

      playNotification();

      // Find who sent it (heuristic: patient with unread > 0 and latest message time)
      const activePatient = patients.find(p => (p.unreadCount || 0) > 0);
      const senderName = activePatient ? activePatient.fullName : t('patient');

      // Browser Notification
      if (Notification.permission === 'granted') {
        new Notification(t('new_message'), {
          body: `${senderName} ${t('sent_message') || 'sent a message'}`,
          icon: '/favicon.ico' // or happyIcon if valid URL
        });
      }



    }

    // Update ref for next render
    prevUnreadCountRef.current = currentUnread;
  }, [patients, view, loading, playNotification, t]);

  // Handle Supabase Auth Events (especially password recovery)
  // MOVED TO AuthContext - skipping specific listener here for now or assuming AuthContext handles it.

  useEffect(() => {
    // Placeholder for potential Auth State interactions if needed
  }, []);

  // Persist lock state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('appLockState', isLocked.toString());
  }, [isLocked]);

  // 🔥 URL SYNC: Update URL when view changes
  useEffect(() => {
    let path = '/';
    if (view === 'SUPER_ADMIN') path = '/admin';
    else if (view === 'PATIENTS') path = '/patients';
    else if (view === 'SETTINGS') path = '/settings';
    else if (view === 'LEADS') path = '/leads';
    else if (view === 'MESSAGES') path = '/messages';
    else if (view === 'STAFF') path = '/staff';
    else if (view === 'FINANCE') path = '/finance';
    else if (view === 'ROLES') path = '/roles';

    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  }, [view]);

  useEffect(() => {
    // 🔥 ROUTING: Check URL path on load
    const path = window.location.pathname;
    if (path === '/admin') {
      setView('SUPER_ADMIN');
    } else if (path === '/patients') {
      setView('PATIENTS');
    } else if (path === '/leads') {
      setView('LEADS');
    } else if (path === '/settings') {
      setView('SETTINGS');
    } else if (path === '/messages') {
      setView('MESSAGES');
    } else if (path === '/staff') {
      setView('STAFF');
    } else if (path === '/finance') {
      setView('FINANCE');
    } else if (path === '/roles') {
      setView('ROLES');
    }
  }, []); // Run ONCE on mount

  // --- Role Enforcer (RBAC) ---
  useEffect(() => {
    if (accountLoading) return;

    // Define required permission for each view
    const viewPermissions: Record<PageView, string> = {
      'DASHBOARD': SCOPES.canViewDashboard,
      'PATIENTS': SCOPES.canViewPatients,
      'PATIENT_DETAIL': SCOPES.canViewPatients,
      'ADD_PATIENT': SCOPES.canEditPatients,
      'EDIT_PATIENT': SCOPES.canEditPatients,
      'LEADS': SCOPES.canViewLeads,
      'MESSAGES': SCOPES.canViewMessages,
      'NOTES': SCOPES.canViewNotes,
      'STAFF': SCOPES.canViewStaff,
      'FINANCE': SCOPES.canViewFinance,
      'SETTINGS': SCOPES.canViewSettings,
      'ROLES': SCOPES.canViewRoles,
      'ADMIN_DASHBOARD': SCOPES.canViewAdmin,
      'SUPER_ADMIN': SCOPES.canViewAdmin
    };

    const requiredScope = viewPermissions[view];

    // If view requires a scope and user doesn't have it
    if (requiredScope && !can(requiredScope as any)) {
      console.warn(`⛔ Access Denied: Role '${role}' cannot view '${view}'`);

      // Redirect to safe default
      if (can(SCOPES.canViewDashboard)) {
        setView('DASHBOARD');
        window.history.replaceState({}, '', '/');
      } else if (can(SCOPES.canViewPatients)) {
        setView('PATIENTS');
        window.history.replaceState({}, '', '/patients');
      } else if (can(SCOPES.canViewLeads)) {
        setView('LEADS');
        window.history.replaceState({}, '', '/leads');
      } else {
        // Fallback for weird edge cases
        setView('SETTINGS');
        window.history.replaceState({}, '', '/settings');
      }
    }
  }, [role, view, accountLoading, can]);

  useEffect(() => {
    if (authUser) {
      const persistedAccountId = localStorage.getItem('accountId');
      const sessionUserId = authUser.uid;

      if (persistedAccountId && persistedAccountId !== sessionUserId) {
        console.warn('⚠️ Session mismatch detected! Clearing corrupted state...');
        localStorage.clear();
        logout();
        window.location.reload();
        return;
      }

      // Only set account if userId isn't already set
      if (!userId) {
        // Restore full account from localStorage (preserves accountId, role, image for sub-users)
        const storedData = localStorage.getItem('graft_account');
        if (storedData) {
          const parsed = JSON.parse(storedData);
          setAccount(
            parsed.id || sessionUserId,       // accountId — critical for sub-users (nurse, call operator)
            sessionUserId,                      // userId — always the Firebase UID
            parsed.name || accountName || '',
            parsed.email || authUser.email || '',
            parsed.role || 'doctor',
            false,
            parsed.image || ''
          );
        } else {
          setAccount(sessionUserId, sessionUserId, accountName || '', authUser.email || '', 'doctor', false);
        }
      }
    }
  }, [authUser, userId, accountName, setAccount]);

  // ===== PROFILE AND SETTINGS SYNC =====
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToUserProfile(
      userId,
      (profile) => {
        console.log("✓ Profile data received:", profile);
        if (profile) {
          // 🔥 STABILIZED LOGIC:
          // 1. Trust DB Profile (Single Source of Truth)
          // 2. Fallback to Current Session (if DB empty)
          // 3. Fallback to UserId (Absolute last resort)

          const databaseAccountId = profile.accountId;
          let finalAccountId = databaseAccountId || accountId;

          // Auto-Heal: If DB is empty, save what we are using (so we don't guess next time)
          if (!databaseAccountId && finalAccountId) {
            console.log("🛠️ Healing Profile: Syncing Account ID to DB:", finalAccountId);
            // Verify it's not a garbage ID before saving?
            // Trusting currentAccountId is usually safe if LoginScreen is correct.
            updateUserProfile(userId, { accountId: finalAccountId }).catch(e => console.error("Auto-sync error:", e));
          }

          console.log("🛡️ PROMED SECURITY SYNC (STABLE):", {
            profileRole: profile.role,
            dbAccount: databaseAccountId,
            sessionAccount: accountId,
            finalAccount: finalAccountId
          });

          // Optimization: Only update context if data CHANGED
          if (
            finalAccountId !== accountId ||
            (profile.role && profile.role !== role) ||
            (profile.fullName && profile.fullName !== accountName) ||
            (profile.profileImage && profile.profileImage !== userImage)
          ) {
            console.log("♻️ [Profile Sync] Updating Context due to change.");
            setAccount(finalAccountId || userId, userId, profile.fullName || accountName || '', userEmail, profile.role || 'doctor', true, profile.profileImage);
          }

          if (profile.lockEnabled !== undefined) {
            if (profile.lockEnabled !== isLockEnabled) setIsLockEnabled(profile.lockEnabled);
          }

          if (profile.lockPassword && profile.lockPassword !== userPassword) {
            console.log("🔐 [Profile Sync] Updating Lock Password from DB");
            setUserPassword(profile.lockPassword);
          }
          // ... rest of logic
        }
      },
      (error) => console.error("Profile subscription error:", error)
    );

    return () => unsubscribe();
  }, [userId, accountId, role, accountName, userImage]); // Dependencies for comparison

  useEffect(() => {
    let mounted = true;
    let patientSubscription: (() => void) | null = null;
    let transactionSubscription: (() => void) | null = null;

    if (!accountId) {
      if (userId) {
        console.log("⏳ [Subscription] Waiting for accountId (User Present)...");
        setLoading(true); // Keep loading if we are authorized but waiting for ID
      } else {
        setLoading(false);
      }
      return;
    }

    console.log("⚡ [Subscription] Starting for Account:", accountId);
    setLoading(true);

    patientSubscription = subscribeToPatients(
      accountId,
      (updatedPatients) => {
        if (mounted) {
          console.log("✅ [Subscription] Patient Data received. Count:", updatedPatients.length);
          setPatients(prev => {
            // 1. Filter out duplicates that arrived in the update // No change
            // 🔥 HARD DELETE PROTECTION: // No change
            const filteredIncoming = updatedPatients; // Simplification for brevity in replacement, assuming original logic is preserved by careful target content selection or manual re-implementation if necessary.
            // ACTUALLY, to avoid overwriting the complex logic, I should target specifically the insertion points.
            // But since this tool replaces a block, I must be careful.

            // Re-implementing the filter logic to be safe:
            const filteredIncomingSafe = updatedPatients
              .filter(p => !pendingDeletes.has(p.id))
              .map(p => ({
                ...p,
                injections: (p.injections || []).filter(inj => !pendingDeletes.has(inj.id)),
                afterImages: (p.afterImages || []).filter(img => !pendingDeletes.has(img.id))
              }));

            const optimisticPatients = prev.filter(p =>
              p.id.startsWith('temp-') && !filteredIncomingSafe.find(up => up.phone === p.phone && up.fullName === p.fullName)
            );
            return [...optimisticPatients, ...filteredIncomingSafe];
          });
          setLoading(false);
        }
      },
      (error) => {
        console.error('❌ [Subscription] Error:', error);
        if (mounted) setLoading(false);
      }
    );

    transactionSubscription = subscribeToTransactions(
      accountId,
      (txs) => {
        if (mounted) {
          console.log("✅ [Subscription] Transactions received. Count:", txs.length);
          setTransactions(txs);
        }
      }
    );

    return () => {
      mounted = false;
      if (patientSubscription) patientSubscription();
      if (transactionSubscription) transactionSubscription();
    };
  }, [accountId]); // Depends strictly on accountId for correct data isolation

  // Preload images for smoother navigation (Optimized: Only top 15 recent patients)
  const allImageUrls = useMemo(() => {
    return patients
      .slice(0, 15)
      .flatMap(p => [p.profileImage, p.beforeImage, ...(p.afterImages || []).map(img => img.url)])
      .filter(Boolean) as string[];
  }, [patients]);
  useImagePreloader(allImageUrls);

  // Computed Stats - MUST be before any early returns to follow Rules of Hooks
  const stats = useMemo(() => {
    const total = patients.length;
    const active = patients.filter(p => p.status === 'Active').length;
    const upcoming = patients.reduce((acc, p) =>
      acc + (p.injections || []).filter(i => i.status === InjectionStatus.SCHEDULED && new Date(i.date) >= new Date()).length
      , 0);

    // Count patients added this month
    const now = new Date();
    const thisMonth = patients.filter(p => {
      const opDate = new Date(p.operationDate);
      return opDate.getMonth() === now.getMonth() && opDate.getFullYear() === now.getFullYear();
    }).length;

    // Calculate Monthly Revenue
    const monthlyRevenue = transactions
      .filter(t => {
        if (!t.date || t.type !== 'income' || t.isVoided || t.returned) return false;
        const tDate = new Date(t.date);
        return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return { total, active, upcoming, newThisMonth: thisMonth, monthlyRevenue };
  }, [patients, transactions]);

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(p =>
      p.fullName.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.email?.toLowerCase().includes(q) ?? false)
    );
  }, [patients, searchQuery]);

  const handleNavigate = useCallback((page: PageView) => {
    setView(page);
    if (page !== 'PATIENT_DETAIL') {
      setSelectedPatientId(null);
      setSelectedInjectionId(null);
    }
  }, []);

  const handleSelectPatient = useCallback((id: string, injectionId?: string) => {
    setSelectedPatientId(id);
    setSelectedInjectionId(injectionId || null);
    setView('PATIENT_DETAIL');
  }, []);

  const handleLogin = async (id: string, userId: string, name: string, email: string, password?: string, role: string = 'doctor') => {
    console.log("🔑 [Universal Login] handleLogin triggered:", { userId, email, role, hasPassword: !!password });
    setAccount(id, userId, name, email, role as any, true);
    setIsLocked(false);

    // Role-aware landing page after login
    if (role === 'seller') {
      setView('LEADS');
    } else if (role === 'nurse') {
      setView('DASHBOARD');
    }

    // 🔥 AUTO-SYNC PIN ON LOGIN
    if (password) {
      console.log("🛠️ [Universal Sync] Pushing Login Password to Lock PIN...");
      try {
        await updateUserProfile(userId, { lockPassword: password });
        console.log("✅ [Universal Sync] Lock PIN successfully updated from Login Password");
        // Update local state immediately to avoid waiting for subscription
        setUserPassword(password);
      } catch (e) {
        console.error("❌ [Universal Sync] Sync error during login:", e);
      }
    } else {
      console.warn("⚠️ [Universal Sync] No password provided during login, skipping sync.");
    }
  };

  const handleLogout = async () => {
    console.log("👋 Logging out...");
    await signOut(); // Use context signOut
    localStorage.clear();
    logout();
    setPatients([]);
    success(t('logout'), t('logout_desc'));
    setView('DASHBOARD');
    window.location.href = '/'; // Reset everything
  };

  // Consolidated Profile Update Handler
  const handleUpdateProfile = async (data: { name: string; image?: File | string; password?: string }) => {
    if (!userId) return;

    try {
      let avatarUrl = undefined;

      // 1. Handle Image Upload if provided
      if (data.image) {
        if (data.image instanceof File) {
          const blobUrl = URL.createObjectURL(data.image);
          setOptimisticImage(`${userId}_profile`, blobUrl);
          avatarUrl = await uploadAvatar(data.image, userId);
        } else if (typeof data.image === 'string') {
          avatarUrl = data.image;
        }
      }

      // 2. Handle Password (Lock Screen)
      if (data.password) {
        setUserPassword(data.password);
        // Save to database for persistence and sync
        await updateUserProfile(userId, { lockPassword: data.password });
      }

      // 3. Update Supabase Profile (Name + Avatar)
      // MATCH PATIENT LOGIC: property name is profileImage
      await updateUserProfile(userId, {
        fullName: data.name,
        profileImage: avatarUrl,
      });

      // 4. Update Local State
      setAccount(accountId!, userId, data.name, userEmail, 'doctor', true, avatarUrl || userImage); // Updates name & image context

      success(t('profile_updated_title'), t('profile_updated_msg'));

    } catch (err: any) {
      console.error("Error updating profile:", err);
      showError(t('toast_error_title'), `${t('toast_save_failed')}: ${err.message} `);
    }
  };

  const handleUpdatePassword = async (newPassword: string) => {
    // Deprecated in favor of handleUpdateProfile but kept for compatibility if needed
    handleUpdateProfile({ name: accountName, password: newPassword });
  };

  const handleUpdateUserImage = async (imageOrFile: string | File) => {
    // Deprecated in favor of handleUpdateProfile but kept for compatibility
    handleUpdateProfile({ name: accountName, image: imageOrFile });
  };

  const handleSavePatient = async (patientData: Patient, files?: { profileImage?: File; beforeImage?: File }, initialPayment?: number) => {
    if (!accountId) {
      alert('Please log in again.');
      logout();
      return;
    }

    setSaving(true);

    try {
      // 1) Optimistic UI update - do this BEFORE uploads for "instant" feel
      const isNewPatient = !patients.find(p => p.id === patientData.id);
      const optimisticPatient = { ...patientData };

      if (isNewPatient) {
        setPatients(prev => [optimisticPatient, ...prev]);
        // [GHOST FIX] SUCCESS TOAST MOVED TO AFTER DB VERIFICATION (Line 650)
      } else {
        setPatients(prev => prev.map(p => p.id === optimisticPatient.id ? optimisticPatient : p));
        success(t('patient_updated_title'), t('patient_updated_msg'));
      }

      // 2) Navigation moved to after successful save to prevent data loss on error
      // if (view === 'EDIT_PATIENT') { ... }

      // 3) Background uploads (Non-blocking: don't let image failure break the whole save)
      try {
        if (files?.profileImage) {
          const url = URL.createObjectURL(files.profileImage);
          setOptimisticImage(`${patientData.id}_profile`, url);
          const remoteUrl = await uploadImage(files.profileImage, `patients/${patientData.id}/profile`);
          patientData.profileImage = remoteUrl;
        }
      } catch (imgErr) {
        console.error("⚠️ Profile image upload failed, continuing with patient save:", imgErr);
      }

      try {
        if (files?.beforeImage) {
          const url = URL.createObjectURL(files.beforeImage);
          setOptimisticImage(`${patientData.id}_before`, url);
          const remoteUrl = await uploadImage(files.beforeImage, `patients/${patientData.id}/before`);
          patientData.beforeImage = remoteUrl;
        }
      } catch (imgErr) {
        console.error("⚠️ Before image upload failed, continuing with patient save:", imgErr);
      }

      if (isNewPatient) {
        console.log("📝 Adding new patient to DB...");
        const { id: tempId, ...patientWithoutId } = patientData;

        // Ensure we use the exact same accountId that our subscription is using
        // If accountId is still empty, we MUST wait or use the same fallback the listener uses
        const activeAccountId = accountId || (userEmail ? `account_${userEmail}` : userId);
        const realId = await addPatient(patientWithoutId, userId, activeAccountId);

        success(t('patient_added_title'), t('patient_added_msg'));

        // 🔥 HANDOVER: Link the local blob to the new real ID
        const profileBlob = getOptimisticImage(`${tempId}_profile`);
        if (profileBlob) setOptimisticImage(`${realId}_profile`, profileBlob);

        const beforeBlob = getOptimisticImage(`${tempId}_before`);
        if (beforeBlob) setOptimisticImage(`${realId}_before`, beforeBlob);

        // IMMEDIATE UPDATE: Swap temp ID for real ID in patients state
        // This prevents the patient from "disappearing" from the detail view 
        // while waiting for the real-time sync to catch up.
        setPatients(prev => {
          const alreadyHasReal = prev.find(p => p.id === realId);
          if (alreadyHasReal) {
            // Real one arrived via subscription already - just kill the temp one
            return prev.filter(p => p.id !== tempId);
          }
          // Swap the ID in place to maintain order and selection
          return prev.map(p => p.id === tempId ? { ...p, id: realId } : p);
        });

        // Update navigation to use real ID
        setSelectedPatientId(realId);
        // 🔥 FINANCE SYNC: Add Initial Payment Transaction if provided
        if (initialPayment && initialPayment > 0) {
          console.log("💰 Creating initial payment transaction...", initialPayment);
          try {
            await addTransaction({
              amount: initialPayment,
              currency: patientData.currency || 'USD',
              type: 'income',
              category: 'surgery',
              date: new Date().toISOString().split('T')[0],
              description: `Initial payment for ${patientData.fullName}`,
              patientId: realId,
              accountId: activeAccountId
            });
            success(t('payment_added'), `${t('initial_payment')}: ${initialPayment} ${patientData.currency || 'USD'}`);
          } catch (finErr) {
            console.error("Failed to create initial transaction:", finErr);
            showError("Finance Error", "Failed to record initial payment");
          }
        }
      } else {
        await updatePatient(patientData.id, patientData, accountId);
      }

      // 4) Navigate after success
      if (view === 'EDIT_PATIENT') {
        setSelectedPatientId(patientData.id);
        setView('PATIENT_DETAIL');
      } else {
        setView('PATIENTS');
      }
    } catch (err: any) {
      console.error('Error saving patient:', err);
      showError("Xatolik yuz berdi", `${t('toast_save_failed')}: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePatient = async () => {
    if (selectedPatientId) {
      setPatientToDelete(selectedPatientId);
      setIsDeleteModalOpen(true);
    }
  };

  const confirmDeletePatient = async () => {
    const deletedId = patientToDelete;
    if (!deletedId) return;

    try {
      // 1) Optimistic UI update: Remove from local state immediately
      setPatients(prev => prev.filter(p => p.id !== deletedId));

      // 🔥 HARD DELETE PROTECTION: Add to pending deletes to block re-appearance from sync
      setPendingDeletes(prev => {
        const next = new Set(prev);
        next.add(deletedId);
        return next;
      });

      // 2) Close modals and navigate back
      setSelectedPatientId(null);
      setPatientToDelete(null);
      setIsDeleteModalOpen(false);
      setView('PATIENTS');

      // 3) Show success toast immediately
      success(t('deleted_title'), t('patient_deleted_msg'), upsetIcon);

      // 4) Perform actual DB deletion
      await deletePatientFromDb(deletedId);

      // Successfully deleted on server, we can eventually remove from pendingDeletes 
      // but keeping it there for a few seconds is safer to avoid any late syncs
      setTimeout(() => {
        setPendingDeletes(prev => {
          const next = new Set(prev);
          next.delete(deletedId);
          return next;
        });
      }, 5000);
    } catch (err: any) {
      console.error('Error deleting patient:', err);

      // 🔥 CLEAR PENDING DELETE ON ERROR
      setPendingDeletes(prev => {
        const next = new Set(prev);
        next.delete(deletedId);
        return next;
      });

      const isPermissionError = err.code === 'permission-denied' || err.message?.includes('permission');
      const projectId = (db as any)._databaseId?.projectId || 'unknown';
      const databaseId = (db as any)._databaseId?.database || '(default)';

      const errorMessage = isPermissionError
        ? `${t('permission_denied')} (${err.code}) [${projectId}/${databaseId}]`
        : `${(t('toast_delete_failed') || "O'chirishda xatolik yuz berdi")} (${err.message || 'Unknown'}) [${projectId}/${databaseId}]`;

      showError(t('toast_error_title'), errorMessage);
    }
  };

  const handleUpdateInjection = async (patientId: string, injectionId: string, status: InjectionStatus, notes?: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const updatedInjections = patient.injections.map(inj => {
      if (inj.id !== injectionId) return inj;
      return { ...inj, status, notes: notes || inj.notes };
    });

    try {
      console.log('Updating injection status:', { patientId, injectionId, status });
      await updatePatientInjections(patientId, updatedInjections, accountId);
      // success(t('status_updated_title'), t('status_updated_msg'), injectionIcon); // User requested silent update
    } catch (err: any) {
      console.error('Error updating injection:', err);
      showError(t('toast_error_title'), `${t('toast_save_failed') || 'Update failed'}: ${err.message || 'Unknown error'}`);
    }
  };

  const handleAddInjection = async (patientId: string, date: string, notes: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const newInjection = {
      id: `inj-${Date.now()}`,
      date,
      status: InjectionStatus.SCHEDULED,
      notes
    };

    const updatedInjections = [...patient.injections, newInjection]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    try {
      console.log('Adding new injection:', { patientId, date, notes });
      await updatePatientInjections(patientId, updatedInjections, accountId);
      success(t('injection_added_title'), t('injection_added_msg'));

      // 🔥 NOTIFICATION LOGIC: Send Telegram Message for NEW Injection
      if (patient.telegramChatId) {
        console.log("📨 Sending NEW injection notification to", patient.fullName);
        const lang = patient.botLanguage || 'uz';
        const newDateObj = new Date(date);

        // Format Date: DD.MM.YYYY
        const dateDisplay = `${String(newDateObj.getDate()).padStart(2, '0')}.${String(newDateObj.getMonth() + 1).padStart(2, '0')}.${newDateObj.getFullYear()}`;
        // Format Time: HH:mm
        const timeDisplay = date.includes('T') ? date.split('T')[1].substring(0, 5) : "09:00";

        let messageText = "";

        if (lang === 'ru') {
          messageText = `Здравствуйте, **${patient.fullName}**! 🔔\n\n✅ Вам назначена новая процедура.\n\n🗓 Дата: **${dateDisplay}**\n⏰ Время: **${timeDisplay}**\n\nЖдем вас в клинике! 😊`;
        } else if (lang === 'en') {
          messageText = `Hello, **${patient.fullName}**! 🔔\n\n✅ A new injection has been scheduled for you.\n\n🗓 Date: **${dateDisplay}**\n⏰ Time: **${timeDisplay}**\n\nWe look forward to seeing you! 😊`;
        } else { // UZ default
          messageText = `Assalomu alaykum, **${patient.fullName}**! 🔔\n\n✅ Sizga yangi inyeksiya belgilandi.\n\n🗓 Sana: **${dateDisplay}**\n⏰ Vaqt: **${timeDisplay}**\n\nSizni klinikada kutamiz! 😊`;
        }

        // Add to Outbound Queue (Hardened Polling)
        await addDoc(collection(db, 'outbound_messages'), {
          telegramChatId: patient.telegramChatId,
          text: messageText,
          patientName: patient.fullName,
          botLanguage: patient.botLanguage || 'uz',
          action: 'SEND',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          type: 'INJECTION_NEW'
        });
      }
    } catch (err: any) {
      console.error('Error adding injection:', err);
      showError(t('toast_error_title'), `${t('toast_save_failed') || 'Add failed'}: ${err.message || 'Unknown error'}`);
    }
  };

  const handleEditInjection = async (patientId: string, injectionId: string, date: string, notes: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const oldInjection = patient.injections.find(i => i.id === injectionId);
    const updatedInjections = patient.injections
      .map(inj => inj.id !== injectionId ? inj : { ...inj, date, notes })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    try {
      console.log('Editing injection:', { patientId, injectionId, date, notes });
      await updatePatientInjections(patientId, updatedInjections, accountId);
      success(t('injection_updated_title'), t('injection_updated_msg'));

      // 🔥 NOTIFICATION LOGIC: Send Telegram Message if Date/Time Changed
      if (patient.telegramChatId && oldInjection && oldInjection.date !== date) {
        console.log("📨 Sending change notification to", patient.fullName);
        const lang = patient.botLanguage || 'uz';
        const newDateObj = new Date(date);

        // Format Date: DD.MM.YYYY
        const dateDisplay = `${String(newDateObj.getDate()).padStart(2, '0')}.${String(newDateObj.getMonth() + 1).padStart(2, '0')}.${newDateObj.getFullYear()}`;
        // Format Time: HH:mm
        const timeDisplay = date.includes('T') ? date.split('T')[1].substring(0, 5) : "09:00";

        let messageText = "";

        if (lang === 'ru') {
          messageText = `Здравствуйте, **${patient.fullName}**! 🔔\n\n⚠️ Время вашей процедуры было изменено.\n\n🗓 Новая дата: **${dateDisplay}**\n⏰ Новое время: **${timeDisplay}**\n\nПриносим извинения за неудобства, это изменение поможет нам обслужить вас лучше! 🙏`;
        } else if (lang === 'en') {
          messageText = `Hello, **${patient.fullName}**! 🔔\n\n⚠️ Your injection time has been changed.\n\n🗓 New Date: **${dateDisplay}**\n⏰ New Time: **${timeDisplay}**\n\nSorry for the inconvenience, this change helps us serve you better! 🙏`;
        } else { // UZ default
          messageText = `Assalomu alaykum, **${patient.fullName}**! 🔔\n\n⚠️ Sizning inyeksiya vaqtingiz o'zgardi.\n\n🗓 Yangi sana: **${dateDisplay}**\n⏰ Yangi vaqt: **${timeDisplay}**\n\nNoqulaylik uchun uzr so'raymiz, bu o'zgarish sizga yaxshiroq xizmat ko'rsatishimizga yordam beradi! 🙏`;
        }

        // Add to Outbound Queue (Hardened Polling)
        await addDoc(collection(db, 'outbound_messages'), {
          telegramChatId: patient.telegramChatId,
          text: messageText,
          patientName: patient.fullName,
          botLanguage: patient.botLanguage || 'uz',
          action: 'SEND',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          type: 'INJECTION_CHANGE'
        });
      }

    } catch (err: any) {
      console.error('Error editing injection:', err);
      showError(t('toast_error_title'), `${t('toast_save_failed') || 'Update failed'}: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteInjection = async (patientId: string, injectionId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const updatedInjections = patient.injections.filter(i => i.id !== injectionId);

    try {
      console.log('Deleting injection:', { patientId, injectionId });

      // 🔥 HARD DELETE PROTECTION
      setPendingDeletes(prev => {
        const next = new Set(prev);
        next.add(injectionId);
        return next;
      });

      await updatePatientInjections(patientId, updatedInjections, accountId);
      success(t('deleted_title'), t('toast_injection_deleted'));

      setTimeout(() => {
        setPendingDeletes(prev => {
          const next = new Set(prev);
          next.delete(injectionId);
          return next;
        });
      }, 5000);
    } catch (err: any) {
      console.error('Error deleting injection:', err);
      // 🔥 CLEAR PENDING DELETE ON ERROR
      setPendingDeletes(prev => {
        const next = new Set(prev);
        next.delete(injectionId);
        return next;
      });
      showError(t('toast_error_title'), `${t('toast_delete_failed') || 'Delete failed'}: ${err.message || 'Unknown error'}`);
    }
  };

  const handleAddAfterPhoto = async (patientId: string, photoOrFile: string | File, label: string) => {
    // 1. Generate stable ID outside try block for rollback access
    const stablePhotoId = `img-${Date.now()}`;

    try {
      const optimisticUrl = typeof photoOrFile === 'string' ? photoOrFile : URL.createObjectURL(photoOrFile);

      // 2. Fetch latest list from current closure to calculate update
      const targetPatient = patients.find(p => p.id === patientId);
      if (!targetPatient) {
        console.error("Patient not found for photo upload");
        return;
      }

      const optimisticImage: PatientImage = {
        id: stablePhotoId,
        url: optimisticUrl,
        date: new Date().toISOString(),
        label
      };

      // 3. Optimistic Update
      if (typeof photoOrFile !== 'string') {
        setOptimisticImage(stablePhotoId, optimisticUrl);
      }

      setPatients(prev => prev.map(p => {
        if (p.id !== patientId) return p;
        return { ...p, afterImages: [optimisticImage, ...(p.afterImages || [])] };
      }));

      success(t('photo_added_title'), t('photo_added_msg'));

      // 4. Background Upload
      let finalPhotoUrl = typeof photoOrFile === 'string' ? photoOrFile : '';
      if (photoOrFile instanceof File) {
        try {
          finalPhotoUrl = await uploadImage(photoOrFile, `patients/${patientId}/after_images/${stablePhotoId}`);
        } catch (e) {
          console.error('❌ Upload failed:', e);
          showError(t('toast_error_title'), t('toast_upload_failed'));
          // Rollback
          setPatients(prev => prev.map(p => (p.id === patientId ? { ...p, afterImages: p.afterImages.filter(img => img.id !== stablePhotoId) } : p)));
          return;
        }
      }

      // 5. Final DB Sync
      const type = (photoOrFile instanceof File && isVideoFile(photoOrFile)) ? 'video' : 'image';

      const finalImage: PatientImage = {
        id: stablePhotoId,
        url: finalPhotoUrl,
        label,
        date: new Date().toISOString(),
        type
      };

      // We use the images list from our initial 'targetPatient' check to ensure we don't duplicate
      await addPatientAfterImage(patientId, finalImage, targetPatient.afterImages, accountId || '');

    } catch (error: any) {
      console.error('❌ handleAddAfterPhoto error:', error);
      showError(t('toast_error_title'), `Save Failed: ${error.message}`);

      // Rollback Optimistic Update to prevent ghost images
      setPatients(prev => prev.map(p => {
        if (p.id !== patientId) return p;
        return { ...p, afterImages: (p.afterImages || []).filter(img => img.id !== stablePhotoId) };
      }));
    }
  };

  const handleDeleteAfterPhoto = async (patientId: string, photoId: string) => {
    try {
      const targetPatient = patients.find(p => p.id === patientId);
      if (!targetPatient) return;

      // 1. Optimistic Update
      setPatients(prev => prev.map(p => {
        if (p.id !== patientId) return p;
        return { ...p, afterImages: (p.afterImages || []).filter(img => img.id !== photoId) };
      }));

      // 2. DB & Storage Cleanup
      // 🔥 HARD DELETE PROTECTION
      setPendingDeletes(prev => {
        const next = new Set(prev);
        next.add(photoId);
        return next;
      });

      await deletePatientAfterImage(patientId, photoId, targetPatient.afterImages);

      success(t('photo_deleted_title'), t('photo_deleted_msg'));

      setTimeout(() => {
        setPendingDeletes(prev => {
          const next = new Set(prev);
          next.delete(photoId);
          return next;
        });
      }, 5000);
    } catch (error: any) {
      console.error('❌ handleDeleteAfterPhoto error:', error);
      // 🔥 CLEAR PENDING DELETE ON ERROR
      setPendingDeletes(prev => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
      showError(t('toast_error_title'), `${t('toast_delete_failed') || 'Delete failed'}: ${error.message}`);
    }
  };

  const renderContent = () => {
    // Only show full-screen loader if we have NO data and are loading.
    // If we have patients, keep showing them while refreshing in background.
    // MODIFIED: We no longer return early here. We allow the dashboard to render with Skeletons if loading.
    const showSkeleton = loading && patients.length === 0;

    // Keep-Alive Rendering Strategy for Dashboard and PatientList
    // Keep-Alive Rendering Strategy for Dashboard and PatientList
    return (
      <AnimatePresence mode="wait">
        {view === 'DASHBOARD' && (
          <PageTransition key="dashboard">
            <Dashboard
              stats={{
                total: stats.total,
                active: patients.length,
                upcoming: (patients || []).flatMap(p => p.injections || []).filter(i => i.status === InjectionStatus.SCHEDULED && new Date(i.date) >= new Date(new Date().setHours(0, 0, 0, 0))).length,
                newThisMonth: stats.newThisMonth,
                monthlyRevenue: stats.monthlyRevenue
              }}
              onNewPatient={() => setView('ADD_PATIENT')}
              onUploadPhoto={() => console.log('Upload Photo Clicked')}
              onPatientSelect={handleSelectPatient}
              patients={patients}
              isLoading={showSkeleton}
            />
          </PageTransition>
        )}

        {view === 'ROLES' && (
          <PageTransition key="roles">
            <RolesPage />
          </PageTransition>
        )}

        {view === 'ADMIN_DASHBOARD' && (
          <PageTransition key="admin">
            <AdminRoute onAccessDenied={() => setView('DASHBOARD')}>
              <AdminDashboard />
            </AdminRoute>
          </PageTransition>
        )}

        {view === 'SUPER_ADMIN' && (
          <PageTransition key="super-admin">
            <SuperAdmin />
          </PageTransition>
        )}

        {(view === 'PATIENTS' || view === 'ADD_PATIENT') && (
          <PageTransition key="patients-group">
            <PatientList
              patients={filteredPatients}
              onSelect={handleSelectPatient}
              searchQuery={searchQuery}
              onSearch={setSearchQuery}
              onAddPatient={() => setView('ADD_PATIENT')}
              isLoading={showSkeleton}
            />
            {view === 'ADD_PATIENT' && (
              <AddPatientForm
                onSave={handleSavePatient}
                onCancel={() => setView('PATIENTS')}
                saving={saving}
              />
            )}
          </PageTransition>
        )}

        {((view === 'PATIENT_DETAIL' || view === 'EDIT_PATIENT') && selectedPatientId) && (
          <PageTransition key="patient-detail">
            {(() => {
              const patient = patients.find(p => p.id === selectedPatientId);
              if (!patient) return null;
              return (
                <>
                  <PatientDetail
                    patient={patient}
                    initialInjectionId={selectedInjectionId || undefined}
                    onBack={() => { setView('PATIENTS'); setSelectedInjectionId(null); }}
                    onUpdateInjection={handleUpdateInjection}
                    onAddInjection={handleAddInjection}
                    onEditInjection={handleEditInjection}
                    onDeleteInjection={handleDeleteInjection}
                    onAddAfterPhoto={handleAddAfterPhoto}
                    onDeleteAfterPhoto={handleDeleteAfterPhoto}
                    onEditPatient={() => setView('EDIT_PATIENT')}
                    onDeletePatient={handleDeletePatient}
                  />
                  {view === 'EDIT_PATIENT' && (
                    <AddPatientForm
                      initialData={patient}
                      onSave={handleSavePatient}
                      onCancel={() => setView('PATIENT_DETAIL')}
                      saving={saving}
                    />
                  )}
                </>
              );
            })()}
          </PageTransition>
        )}

        {view === 'SETTINGS' && (
          <PageTransition key="settings">
            <SettingsPage userId={userId} />
          </PageTransition>
        )}

        {view === 'LEADS' && (
          <PageTransition key="leads">
            <LeadsPage />
          </PageTransition>
        )}

        {view === 'NOTES' && (
          <PageTransition key="notes">
            <NotesPage />
          </PageTransition>
        )}

        {view === 'STAFF' && (
          <PageTransition key="staff">
            <StaffPage />
          </PageTransition>
        )}

        {view === 'FINANCE' && (
          <PageTransition key="finance">
            <FinancePage onPatientClick={(id) => { setSelectedPatientId(id); setView('PATIENT_DETAIL'); }} />
          </PageTransition>
        )}

        {view === 'MESSAGES' && (
          <PageTransition key="messages">
            <MessagesPage patients={patients} isVisible={view === 'MESSAGES'} />
          </PageTransition>
        )}
      </AnimatePresence>
    );
  };

  // --- RENDERING ---
  if (authLoading) return <DashboardLoader />;

  // Render Password Reset Screen if active
  if (resetCode) {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <ResetPasswordScreen
          oobCode={resetCode}
          onSuccess={() => {
            setResetCode(null);
            // Clear URL params
            window.history.replaceState({}, '', '/');
          }}
          onCancel={() => {
            setResetCode(null);
            window.history.replaceState({}, '', '/');
          }}
        />
      </Suspense>
    );
  }

  // Show login screen if not logged in
  if (!authUser) {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <LoginScreen onLogin={handleLogin} />
      </Suspense>
    );
  }


  // Render Banned Screen
  if (isBanned) {
    return (
      <BannedScreen onLogout={() => {
        setIsBanned(false);
        handleLogout();
      }} />
    );
  }

  // PROTECTED ADMIN ROUTE INTERCEPTOR
  // This serves as our client-side middleware for the Vite SPA
  if (window.location.pathname.includes('/admin')) {
    return <EmergencySetup />;
  }

  // Render Lock Screen if locked
  if (isLocked) {
    console.log("🔓 App component: Rendering LockScreen", { hasPassword: !!userPassword });
    return (
      <ErrorBoundary>
        <LockScreen onUnlock={() => setIsLocked(false)} correctPassword={userPassword} />
      </ErrorBoundary>
    );
  }

  return (
    <Layout
      userId={userId}
      currentPage={view as PageView}
      onNavigate={handleNavigate}
      isLockEnabled={isLockEnabled}
      onToggleLock={async (enabled) => {
        console.log('Lock toggle clicked:', enabled);
        setIsLockEnabled(enabled);
        // Save to database
        if (userId) {
          try {
            await updateUserProfile(userId, { lockEnabled: enabled });
            console.log('✓ Lock toggle saved to database:', enabled);
          } catch (error) {
            console.error('✗ Failed to save lock toggle:', error);
          }
        }
      }}
      onLock={() => {
        playLock();
        setIsLocked(true);
      }}
      userPassword={userPassword}
      userImage={userImage}
      userEmail={userEmail}
      onUpdateProfile={handleUpdateProfile}
      userName={accountName}
      onLogout={handleLogout}
      patients={patients}
    >
      <ErrorBoundary>
        <React.Suspense fallback={<DashboardLoader />}>
          {renderContent()}
        </React.Suspense>
      </ErrorBoundary>
      <ToastContainer />
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPatientToDelete(null);
        }}
        onConfirm={confirmDeletePatient}
      />
    </Layout>
  );
};

export default App;

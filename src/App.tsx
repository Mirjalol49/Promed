import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { DashboardLoader } from './components/ui/DashboardLoader';
console.log("🛡️ PROMED SYSTEM BOOT: Version 1.25.0 - LockFix Loaded");

const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const LoginScreen = React.lazy(() => import('./features/auth/LoginScreen').then(m => ({ default: m.LoginScreen })));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PatientList = React.lazy(() => import('./features/patients/PatientList').then(m => ({ default: m.PatientList })));
const PatientDetail = React.lazy(() => import('./features/patients/PatientList').then(m => ({ default: m.PatientDetail })));
import { AddPatientForm } from './features/patients/PatientList';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

import Layout from './components/layout/Layout';
import { AdminRoute } from './components/layout/AdminRoute';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Users, UserPlus, Calendar, Activity, Bell, Shield, Smartphone, Lock, ArrowRight, LogOut, Eye, EyeOff } from 'lucide-react';
import { Patient, PageView, InjectionStatus, PatientImage } from './types';
import { useLanguage } from './contexts/LanguageContext';
import { useAccount } from './contexts/AccountContext';
import { useToast } from './contexts/ToastContext';
import SyncToast from './components/ui/SyncToast';
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
import { uploadImage, uploadAvatar, setOptimisticImage, getOptimisticImage } from './lib/imageService';
import { ProfileAvatar } from './components/layout/ProfileAvatar';
import { useImagePreloader } from './lib/useImagePreloader';
import ToastContainer from './components/ui/ToastContainer';
import DeleteModal from './components/ui/DeleteModal';
import { Trash2 } from 'lucide-react';

import { auth, db } from './lib/firebase';
import { DbDebug } from './components/ui/DbDebug';
import { SuperAdmin } from './pages/SuperAdmin';
import { SettingsPage } from './pages/SettingsPage';

import { sendPasswordResetEmail } from 'firebase/auth';

import lockIcon from './assets/images/lock.png';
// New High-Res Assets for Toasts
import happyIcon from './components/mascot/happy_mascot.png';
import upsetIcon from './components/mascot/upseet_mascot.png';
import operationIcon from './components/mascot/operation_mascot.png';
import injectionIcon from './components/mascot/injection_mascot.png';
import thinkingIcon from './components/mascot/thinking_mascot.png';

// --- Lock Screen Component ---
const LockScreen: React.FC<{ onUnlock: () => void; correctPassword: string }> = ({ onUnlock, correctPassword }) => {
  console.log("🔒 LockScreen: Starting render...");
  const { t } = useLanguage();
  const [pin, setPin] = useState(['', '', '', '', '', '']);

  // Use a single ref for the array to ensure stability across re-renders
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const [lockState, setLockState] = useState<'idle' | 'error' | 'success'>('idle');
  const [pinError, setPinError] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showEmergencyBypass, setShowEmergencyBypass] = useState(false);
  const [emergencyPassword, setEmergencyPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const isPinType = /^\d{6}$/.test(correctPassword);

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleEmergencyUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');

    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      // Use the email of the currently signed-in user (from AuthContext or auth.currentUser)
      const userEmail = auth.currentUser?.email;
      if (!userEmail) throw new Error("No active session found");

      await signInWithEmailAndPassword(auth, userEmail, emergencyPassword);

      // If we reach here, password is correct
      setLockState('success');
      setTimeout(onUnlock, 500);
    } catch (err: any) {
      setResetError(t('login_error_invalid_password') || 'Invalid account password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleUnlock = (e?: React.FormEvent) => {
    e?.preventDefault();
    const enteredPin = pin.join('');

    if (enteredPin === correctPassword) {
      setLockState('success');
      setTimeout(onUnlock, 500);
    } else {
      setLockState('error');
      setPinError(true);

      // Reset back to idle after 1s
      setTimeout(() => {
        setPin(['', '', '', '', '', '']);
        setLockState('idle');
        setPinError(false);
        inputRefs.current[0]?.focus();
      }, 1000);
    }
  };

  if (!t) {
    console.error("❌ LockScreen: t function is missing!");
    return <div className="fixed inset-0 bg-slate-900 flex items-center justify-center text-white">Loading Security...</div>;
  }

  console.log("✅ LockScreen: Reached JSX return phase");

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

        <h2 className="text-4xl font-black mb-3 tracking-widest text-white">
          {t('security_check')}
        </h2>
        <p className="text-white/80 mb-12 text-center font-medium max-w-xs">
          {isPinType ? t('remember_password') : "Hisob parolingizni kiriting"}
        </p>

        <form onSubmit={handleUnlock} className="w-full flex flex-col items-center space-y-10">
          {isPinType ? (
            <div className="flex gap-4 sm:gap-6 justify-center">
              {pin.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  value={digit}
                  onChange={(e) => handlePinChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={`w-12 h-14 sm:w-16 sm:h-20 bg-white border-2 
                    ${pinError ? 'border-rose-500 shake ' : 'border-white/20'}
                    rounded-2xl text-center text-3xl font-black text-promed-primary transition-all duration-200
                    focus:outline-none focus:border-white focus:ring-4 focus:ring-white/20
                    placeholder-slate-300 `}
                  maxLength={1}
                  autoFocus={idx === 0}
                />
              ))}
            </div>
          ) : (
            <div className="w-full max-w-sm relative group/pass">
              <input
                type={showPassword ? "text" : "password"}
                value={pin.join('')} // Reuse pin state or create new one? pin.join('') might be messy but let's use a single string if not pin
                onChange={(e) => setPin(e.target.value.split(''))}
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
            </div>
          )}

          <div className="w-full max-w-sm space-y-6">
            <button
              type="submit"
              className="btn-auth-premium group"
            >
              <span>
                {t('unlock')} <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>

            {/* Emergency Bypass Link - Only show for PIN type */}
            {isPinType && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmergencyBypass(true)}
                  className="text-white/30 hover:text-white text-[11px] font-black transition-colors uppercase tracking-[0.2em] block w-full"
                >
                  {t('forgot_password_link') || "Forgot PIN? Unlock with Account Password"}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Emergency Bypass Modal */}
      {showEmergencyBypass && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-promed-bg border border-promed-primary/10 rounded-2xl p-8 w-full max-w-sm ">
            <h3 className="text-xl font-bold text-promed-text mb-2 text-center">Emergency Unlock</h3>
            <p className="text-promed-muted text-[10px] font-bold uppercase tracking-widest mb-6 text-center">
              Verify your account password to bypass PIN
            </p>

            <form onSubmit={handleEmergencyUnlock} className="space-y-4">
              <input
                type="password"
                value={emergencyPassword}
                onChange={(e) => setEmergencyPassword(e.target.value)}
                className="w-full px-4 py-4 bg-white border border-promed-primary/10 rounded-2xl text-promed-text placeholder-promed-muted/40 focus:outline-none focus:ring-4 focus:ring-promed-primary/10 transition-all text-center font-bold"
                placeholder="Account Password"
                required
                autoFocus
              />

              {resetError && (
                <div className="text-rose-400 text-xs font-bold text-center animate-pulse">{resetError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmergencyBypass(false);
                    setResetError('');
                    setEmergencyPassword('');
                  }}
                  className="flex-1 py-4 px-4 bg-slate-100 hover:bg-slate-200 text-promed-muted font-bold text-[10px] uppercase tracking-widest rounded-2xl transition-all"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-[2] btn-premium-blue"
                >
                  {resetLoading ? (
                    <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto" />
                  ) : (
                    <span>Verify & Unlock</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};




import { useAuth } from './contexts/AuthContext';

const App: React.FC = () => {
  const { accountId, userId, accountName, userEmail, userImage, setAccount, isLoggedIn, logout } = useAccount();
  const { loading: authLoading, user: authUser, signOut } = useAuth();


  const [view, setView] = useState<PageView>('DASHBOARD');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Initialize lock state from localStorage to persist across refreshes
  const [isLocked, setIsLocked] = useState(() => {
    const savedLockState = localStorage.getItem('appLockState');
    return savedLockState === 'true';
  });
  const [isLockEnabled, setIsLockEnabled] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [userPassword, setUserPassword] = useState('000000');
  // userImage now comes from AccountContext for persistence
  const [saving, setSaving] = useState(false);

  const { t } = useLanguage();
  const { success, error: showError } = useToast();

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
    }
  }, []); // Run ONCE on mount

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
        setAccount(sessionUserId, sessionUserId, accountName || '', authUser.email || '', 'doctor', false);
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
          // 🔥 FIX: ALWAYS prioritize the account_id from the database profile
          const databaseAccountId = profile.accountId;
          const currentAccountId = accountId;
          const fallbackAccountId = profile.email ? `account_${profile.email}` : userId;

          const finalAccountId = databaseAccountId || currentAccountId || fallbackAccountId;

          // 🔥 AUTOMATIC SYNC: If DB is missing the accountId, push it now!
          // But only if we have a stable fallback that isn't just the userId
          if (!databaseAccountId && fallbackAccountId && fallbackAccountId !== userId) {
            console.log("🛠️ Auto-Syncing Account ID to Database Profile:", fallbackAccountId);
            updateUserProfile(userId, { accountId: fallbackAccountId }).catch(e => console.error("Auto-sync error:", e));
          }

          console.log("🛡️ PROMED SECURITY SYNC:", {
            profileRole: profile.role,
            dbAccount: databaseAccountId,
            stateAccount: currentAccountId,
            finalAccount: finalAccountId
          });

          setAccount(finalAccountId, userId, profile.name || accountName || '', userEmail, profile.role || 'doctor', true, profile.profileImage); // Now VERIFIED
          if (profile.lockEnabled !== undefined) {
            console.log("  • Lock Enabled:", profile.lockEnabled);
            setIsLockEnabled(profile.lockEnabled);
          }
          if (profile.lockPassword) {
            console.log("🛡️ [Security Sync] Setting User Password from Profile:", !!profile.lockPassword, profile.lockPassword === '000000' ? '(DEFAULT 000000)' : '(CUSTOM)');
            setUserPassword(profile.lockPassword);
          } else {
            console.warn("⚠️ [Security Sync] Profile has NO lockPassword field! Falling back to 000000");
            setUserPassword('000000');
          }
          if (profile.profileImage) {
            console.log("  • Image URL:", profile.profileImage);
            // Context handles this now via setAccount above
          }


          // 🔥 SECURITY ALERT: If account is restricted (frozen or banned), log out immediately
          if (profile.status === 'frozen' || profile.status === 'banned') {
            console.warn(`🛡️ Account RESTRICTED (${profile.status}) detected for user:`, userId);
            const message = profile.status === 'banned'
              ? 'Your account has been banned due to a policy violation. Please contact the administrator.'
              : 'Your account has been suspended. Please contact support.';
            alert(message);
            handleLogout(); // Force immediate session termination
          }

        }
      },
      (error) => console.error("Profile subscription error:", error)
    );

    return () => unsubscribe();
  }, [userId]); // Removed 'view' to prevent unnecessary re-subscriptions on navigation

  useEffect(() => {
    let mounted = true;
    let patientSubscription: (() => void) | null = null;

    if (!accountId) {
      console.log("⏳ [Subscription] Waiting for accountId...");
      setLoading(false);
      return;
    }

    console.log("⚡ [Subscription] Starting for Account:", accountId);
    setLoading(true);

    patientSubscription = subscribeToPatients(
      accountId,
      (updatedPatients) => {
        if (mounted) {
          console.log("✅ [Subscription] Data received. Count:", updatedPatients.length);
          setPatients(prev => {
            // 1. Filter out duplicates that arrived in the update
            const incomingIds = new Set(updatedPatients.map(p => p.id));

            // 🔥 HARD DELETE PROTECTION: 
            // 1. Filter out deleted patients
            const filteredIncoming = updatedPatients
              .filter(p => !pendingDeletes.has(p.id))
              .map(p => ({
                ...p,
                // 2. Filter out deleted injections within patients
                injections: (p.injections || []).filter(inj => !pendingDeletes.has(inj.id)),
                // 3. Filter out deleted photos within patients
                afterImages: (p.afterImages || []).filter(img => !pendingDeletes.has(img.id))
              }));

            // 2. Keep optimistic patients that haven't been "claimed" by a real ID yet
            const optimisticPatients = prev.filter(p =>
              p.id.startsWith('temp-') && !filteredIncoming.find(up => up.phone === p.phone && up.fullName === p.fullName)
            );

            return [...optimisticPatients, ...filteredIncoming];
          });
          setLoading(false);
        }
      },
      (error) => {
        console.error('❌ [Subscription] Error:', error);
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      if (patientSubscription) patientSubscription();
    };
  }, [accountId]); // Depends strictly on accountId for correct data isolation

  // Preload images for smoother navigation
  const allImageUrls = useMemo(() => {
    return patients.flatMap(p => [p.profileImage, p.beforeImage, ...(p.afterImages || []).map(img => img.url)]).filter(Boolean) as string[];
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

    return { total, active, upcoming, newThisMonth: thisMonth };
  }, [patients]);

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(p =>
      p.fullName.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  }, [patients, searchQuery]);

  const handleNavigate = useCallback((page: PageView) => {
    setView(page);
    if (page !== 'PATIENT_DETAIL') setSelectedPatientId(null);
  }, []);

  const handleSelectPatient = useCallback((id: string) => {
    setSelectedPatientId(id);
    setView('PATIENT_DETAIL');
  }, []);

  const handleLogin = async (id: string, userId: string, name: string, email: string, password?: string) => {
    console.log("🔑 [Universal Login] handleLogin triggered:", { userId, email, hasPassword: !!password });
    setAccount(id, userId, name, email, 'doctor', true);
    setIsLocked(false);

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
    success(t('logout'), t('logout_desc'), happyIcon);
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

      success(t('profile_updated_title'), t('profile_updated_msg'), happyIcon);

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

  const handleSavePatient = async (patientData: Patient, files?: { profileImage?: File; beforeImage?: File }) => {
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
        success(t('patient_updated_title'), t('patient_updated_msg'), happyIcon);
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

        success(t('patient_added_title'), t('patient_added_msg'), operationIcon);

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

      showError(t('toast_error_title'), errorMessage, upsetIcon);
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
      success(t('status_updated_title'), t('status_updated_msg'), injectionIcon);
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
      success(t('injection_added_title'), t('injection_added_msg'), injectionIcon);
    } catch (err: any) {
      console.error('Error adding injection:', err);
      showError(t('toast_error_title'), `${t('toast_save_failed') || 'Add failed'}: ${err.message || 'Unknown error'}`);
    }
  };

  const handleEditInjection = async (patientId: string, injectionId: string, date: string, notes: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const updatedInjections = patient.injections
      .map(inj => inj.id !== injectionId ? inj : { ...inj, date, notes })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    try {
      console.log('Editing injection:', { patientId, injectionId, date, notes });
      await updatePatientInjections(patientId, updatedInjections, accountId);
      success(t('injection_updated_title'), t('injection_updated_msg'), injectionIcon);
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
      success(t('deleted_title'), t('toast_injection_deleted'), upsetIcon);

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
      showError(t('toast_error_title'), `${t('toast_delete_failed') || 'Delete failed'}: ${err.message || 'Unknown error'}`, upsetIcon);
    }
  };

  const handleAddAfterPhoto = async (patientId: string, photoOrFile: string | File, label: string) => {
    try {
      // 1. Generate stable ID and optimistic URL
      const stablePhotoId = `img-${Date.now()}`;
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

      success(t('photo_added_title'), t('photo_added_msg'), happyIcon);

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
      const finalImage: PatientImage = {
        id: stablePhotoId,
        url: finalPhotoUrl,
        label,
        date: new Date().toISOString()
      };

      // We use the images list from our initial 'targetPatient' check to ensure we don't duplicate
      await addPatientAfterImage(patientId, finalImage, targetPatient.afterImages, accountId || '');

    } catch (error) {
      console.error('❌ handleAddAfterPhoto error:', error);
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

      success(t('photo_deleted_title'), t('photo_deleted_msg'), happyIcon);

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
      showError(t('toast_error_title'), `${t('toast_delete_failed') || 'Delete failed'}: ${error.message}`, upsetIcon);
    }
  };

  const renderContent = () => {
    // Only show full-screen loader if we have NO data and are loading.
    // If we have patients, keep showing them while refreshing in background.
    // MODIFIED: We no longer return early here. We allow the dashboard to render with Skeletons if loading.
    const showSkeleton = loading && patients.length === 0;

    // Keep-Alive Rendering Strategy for Dashboard and PatientList
    return (
      <div className="space-y-8 animate-in fade-in duration-500">

        {/* Dashboard View - Always Mounted, Hidden when inactive */}
        <div style={{ display: view === 'DASHBOARD' ? 'block' : 'none' }}>
          <Dashboard
            stats={{
              total: stats.total,
              active: patients.length,
              upcoming: (patients || []).flatMap(p => p.injections || []).filter(i => i.status === InjectionStatus.SCHEDULED).length,
              newThisMonth: stats.newThisMonth
            }}
            onNewPatient={() => setView('ADD_PATIENT')}
            onUploadPhoto={() => console.log('Upload Photo Clicked')}
            onPatientSelect={handleSelectPatient}
            patients={patients}
            isLoading={showSkeleton}
          />
        </div>



        {/* Admin Dashboard View - Protected Route */}
        {view === 'ADMIN_DASHBOARD' && (
          <AdminRoute onAccessDenied={() => setView('DASHBOARD')}>
            <AdminDashboard />
          </AdminRoute>
        )}

        {/* Super Admin View - Hidden when inactive */}
        <div style={{ display: view === 'SUPER_ADMIN' ? 'block' : 'none' }}>
          <SuperAdmin />
        </div>

        {/* Patient List View - Always Mounted, Hidden when inactive */}
        <div style={{ display: view === 'PATIENTS' || view === 'ADD_PATIENT' ? 'block' : 'none' }}>
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
        </div>

        {/* Detail Views - Conditional (depend on selected ID) */}
        {
          ((view === 'PATIENT_DETAIL' || view === 'EDIT_PATIENT') && selectedPatientId) && (
            (() => {
              const patient = patients.find(p => p.id === selectedPatientId);
              if (!patient) return null;
              return (
                <>
                  <PatientDetail
                    patient={patient}
                    onBack={() => setView('PATIENTS')}
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
              )
            })()
          )
        }

        {/* Settings View */}
        {
          view === 'SETTINGS' && (
            <SettingsPage userId={userId} />
          )
        }

      </div >
    );
  };

  // If authentication or initial data is loading, show the mascot loader
  if (authLoading) {
    return <DashboardLoader />;
  }

  // Show login screen if not logged in
  if (!authUser) {
    return <LoginScreen onLogin={handleLogin} />;
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
      userId={userId || ''}
      currentPage={view}
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

        setIsLocked(true);
      }}
      userPassword={userPassword}
      userImage={userImage}
      userEmail={userEmail}
      onUpdateProfile={handleUpdateProfile}
      userName={accountName}
      onLogout={handleLogout}
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

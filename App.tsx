import React, { useState, useMemo, useEffect, useCallback } from 'react';
console.log("🛡️ PROMED SYSTEM BOOT: Version 1.25.0 - LockFix Loaded");
import { Dashboard } from './pages/Dashboard';
import Layout from './components/Layout';
import { StatCard, StatsChart, UpcomingInjections } from './components/Widgets';
import { PatientList, PatientDetail, AddPatientForm } from './components/PatientViews';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminRoute } from './components/AdminRoute';
import { Users, UserPlus, Calendar, Activity, Bell, Shield, Smartphone, Lock, ArrowRight, LogOut } from 'lucide-react';
import { Patient, PageView, InjectionStatus, PatientImage } from './types';
import { useLanguage } from './contexts/LanguageContext';
import { useAccount } from './contexts/AccountContext';
import { useToast } from './contexts/ToastContext';
import {
  subscribeToPatients,
  addPatient,
  updatePatient,
  deletePatient as deletePatientFromDb,
  updatePatientInjections,
  addPatientAfterImage,
  COLUMNS,
} from './lib/patientService';
import { updateUserProfile, subscribeToUserProfile } from './lib/userService';
import { billingService } from './lib/billingService';
import { uploadImage, uploadAvatar, setOptimisticImage, getOptimisticImage } from './lib/imageService';
import { ProfileAvatar } from './components/ProfileAvatar';
import { useImagePreloader } from './lib/useImagePreloader';
import ToastContainer from './components/ToastContainer';
import ConfirmationModal from './components/ConfirmationModal';
import { Trash2 } from 'lucide-react';

import { supabase } from './lib/supabaseClient';

// --- Lock Screen Component ---
const LockScreen: React.FC<{ onUnlock: () => void; correctPassword: string }> = ({ onUnlock, correctPassword }) => {
  console.log("🔒 LockScreen: Starting render...");
  const { t } = useLanguage();
  const [pin, setPin] = useState(['', '', '', '', '', '']);

  // Use a single ref for the array to ensure stability across re-renders
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const [pinError, setPinError] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

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

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetMessage('');

    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin,
      });

      if (authError) throw authError;
      setResetMessage(t('reset_link_sent') || 'Reset link sent to your email');
    } catch (err: any) {
      setResetError(err.message || 'Failed to send reset link');
    } finally {
      setResetLoading(false);
    }
  };

  const handleUnlock = (e?: React.FormEvent) => {
    e?.preventDefault();
    const enteredPin = pin.join('');
    if (enteredPin === correctPassword) {
      onUnlock();
    } else {
      setPinError(true);
      setPin(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setTimeout(() => setPinError(false), 1000);
    }
  };

  if (!t) {
    console.error("❌ LockScreen: t function is missing!");
    return <div className="fixed inset-0 bg-slate-900 flex items-center justify-center text-white">Loading Security...</div>;
  }

  console.log("✅ LockScreen: Reached JSX return phase");

  return (
    <div className="fixed inset-0 z-[100] bg-[#0d3d38] flex flex-col items-center justify-center text-white animate-in fade-in duration-500">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-xl px-6">
        <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mb-10 shadow-2xl">
          <Lock size={32} className="text-slate-400" strokeWidth={2} />
        </div>

        <h2 className="text-4xl font-black mb-3 tracking-tighter text-white">{t('app_locked')}</h2>
        <p className="text-white/60 mb-12 text-center font-medium">{t('login_subtitle')}</p>

        <form onSubmit={handleUnlock} className="w-full flex flex-col items-center space-y-10">
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
                className={`w-14 h-18 sm:w-16 sm:h-20 bg-white border-2 ${pinError ? 'border-red-500 shake' : 'border-emerald-500/10'} 
                  rounded-2xl text-center text-3xl font-bold text-[#0d3d38] transition-all duration-200
                  focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20
                  placeholder-slate-300 shadow-lg`}
                maxLength={1}
                autoFocus={idx === 0}
              />
            ))}
          </div>

          <div className="w-full max-w-sm space-y-6">
            <button
              type="submit"
              className="w-full bg-white text-[#0d3d38] font-black py-5 rounded-[22px] hover:bg-slate-100 transition-all transform active:scale-95 flex items-center justify-center space-x-3 shadow-xl"
            >
              <span className="uppercase tracking-widest text-xs">{t('unlock')}</span>
              <ArrowRight size={18} />
            </button>

            {pinError && <p className="text-red-400 text-sm text-center font-bold tracking-tight animate-pulse">{t('wrong_password')}</p>}

            {/* Forgot Password Link */}
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-white/40 hover:text-white text-sm font-bold transition-colors uppercase tracking-widest block w-full"
              >
                {t('forgot_password_link')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d3d38] border border-white/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 text-center">{t('forgot_password_link')}</h3>
            <p className="text-white/60 text-sm mb-6 text-center">
              {t('reset_password_desc')}
            </p>

            <form onSubmit={handleSendMagicLink} className="space-y-4">
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all text-center"
                placeholder={t('email_placeholder')}
                required
                autoFocus
              />

              {resetError && (
                <div className="text-red-300 text-sm text-center">{resetError}</div>
              )}

              {resetMessage && (
                <div className="text-green-300 text-sm text-center">{resetMessage}</div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setResetError('');
                    setResetMessage('');
                    setResetEmail('');
                  }}
                  className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-2xl transition-all"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-3 px-4 bg-white text-[#0f4a44] font-bold rounded-2xl transition-all disabled:opacity-50"
                >
                  {resetLoading ? (
                    <div className="w-5 h-5 border-2 border-teal-300 border-t-teal-700 rounded-full animate-spin mx-auto" />
                  ) : (
                    t('send_link')
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




const App: React.FC = () => {
  const { accountId, userId, accountName, setAccount, isLoggedIn, isLoading: isAuthLoading, logout } = useAccount();
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
  const [userPassword, setUserPassword] = useState('password123');
  const [userImage, setUserImage] = useState<string>("https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff&size=128");
  const [saving, setSaving] = useState(false);

  const { t } = useLanguage();
  const { success, error: showError } = useToast();

  // Handle Supabase Auth Events (especially password recovery)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔔 Supabase Auth Event:", event);
      if (event === 'PASSWORD_RECOVERY') {
        console.log("🔑 Password recovery detected! Bypassing lock screen...");
        setIsLocked(false);
        localStorage.setItem('appLockState', 'false');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Persist lock state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('appLockState', isLocked.toString());
  }, [isLocked]);

  // 🔥 URL SYNC: Update URL when view changes
  useEffect(() => {
    let path = '/';
    if (view === 'ADMIN_DASHBOARD') path = '/admin';
    else if (view === 'PATIENTS') path = '/patients';
    else if (view === 'SETTINGS') path = '/settings';

    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  }, [view]);

  // Validate session consistency
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // 🔥 ROUTING: Check URL path on load
      const path = window.location.pathname;
      if (path === '/admin') {
        setView('ADMIN_DASHBOARD');
      } else if (path === '/patients') {
        setView('PATIENTS');
      }

      if (session) {
        const persistedAccountId = localStorage.getItem('accountId');
        const sessionUserId = session.user.id;

        if (persistedAccountId && persistedAccountId !== sessionUserId) {
          console.warn('⚠️ Session mismatch detected! Clearing corrupted state...');
          localStorage.clear();
          logout();
          window.location.reload();
          return;
        }

        // Only set account if userId isn't already set
        if (!userId) {
          setAccount(sessionUserId, sessionUserId, accountName || '', 'doctor', false); // Not verified yet
        }
      }
    };
    checkSession();
  }, []);

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
          const fallbackAccountId = userId;

          const finalAccountId = databaseAccountId || currentAccountId || fallbackAccountId;

          console.log("🛡️ PROMED SECURITY SYNC:", {
            profileRole: profile.role,
            dbAccount: databaseAccountId,
            stateAccount: currentAccountId,
            finalAccount: finalAccountId
          });

          setAccount(finalAccountId, userId, profile.name || accountName || '', profile.role || 'doctor', true); // Now VERIFIED
          if (profile.lockEnabled !== undefined) {
            console.log("  • Lock Enabled:", profile.lockEnabled);
            setIsLockEnabled(profile.lockEnabled);
          }
          if (profile.lockPassword) {
            console.log("  • Password exists:", !!profile.lockPassword);
            setUserPassword(profile.lockPassword);
          }
          if (profile.profileImage) {
            console.log("  • Image URL:", profile.profileImage);
            setUserImage(profile.profileImage);
          }

          // 🔥 SECURITY ALERT: If account is frozen, log out immediately
          if (profile.status === 'frozen') {
            console.warn("❄️ Account Frozen detected for user:", userId);
            alert('Your account has been suspended. Please contact support.');
            handleLogout(); // Use the robust logout we just fixed
          }

          // ❄️ AUTO-FREEZE: Check subscription health (periodic check on active sessions)
          if (profile.role !== 'admin' && profile.status === 'active') {
            billingService.checkAndEnforceSubscription(userId);
          }
        }
      },
      (error) => console.error("Profile subscription error:", error)
    );

    return () => unsubscribe();
  }, [userId]);

  // Subscribe to real-time patient updates when logged in
  useEffect(() => {
    if (!isLoggedIn || !accountId) {
      setPatients([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeToPatients(
      accountId,
      (updatedPatients) => {
        setPatients(updatedPatients);
        setLoading(false);
      },
      (error: any) => {
        console.error('Error subscribing to patients:', error);
        setLoading(false);
        if (error.code === 'permission-denied') {
          alert('Permission denied. Please log in again.');
          logout();
        }
      }
    );

    // Safety timeout: Forced stop loading after 3 seconds if DB hangs
    const safetyTimer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("Forcing loading to false due to timeout");
          return false;
        }
        return prev;
      });
    }, 10000);

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [isLoggedIn, accountId]);

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

  // If authentication is still loading, show a splash screen or spinner
  // This prevents the "Login Screen" from flashing while we check localStorage
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-promed-primary"></div>
      </div>
    );
  }
  const handleNavigate = (page: PageView) => {
    setView(page);
    if (page !== 'PATIENT_DETAIL') setSelectedPatientId(null);
  };

  const handleSelectPatient = (id: string) => {
    setSelectedPatientId(id);
    setView('PATIENT_DETAIL');
  };

  const handleLogin = (id: string, userId: string, name: string) => {
    setAccount(id, userId, name);
  };

  const handleLogout = async () => {
    console.log("👋 Logging out...");
    await supabase.auth.signOut();
    localStorage.clear();
    logout();
    setPatients([]);
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
      setAccount(accountId!, userId, data.name); // Updates name context
      if (avatarUrl) setUserImage(avatarUrl);

      success(t('toast_profile_saved'));

    } catch (err: any) {
      console.error("Error updating profile:", err);
      showError(`${t('toast_save_failed')}: ${err.message}`);
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
        success(t('toast_patient_added'));
      } else {
        setPatients(prev => prev.map(p => p.id === optimisticPatient.id ? optimisticPatient : p));
        success(t('toast_profile_saved'));
      }

      // 2) Navigate immediately for responsiveness
      if (view === 'EDIT_PATIENT') {
        setSelectedPatientId(patientData.id);
        setView('PATIENT_DETAIL');
      } else {
        setView('PATIENTS');
      }

      // 3) Background uploads & Supabase DB write
      if (files?.profileImage) {
        const url = URL.createObjectURL(files.profileImage);
        setOptimisticImage(`${patientData.id}_profile`, url);
        const remoteUrl = await uploadImage(files.profileImage, `patients/${patientData.id}/profile`);
        patientData.profileImage = remoteUrl;
      }

      if (files?.beforeImage) {
        const url = URL.createObjectURL(files.beforeImage);
        setOptimisticImage(`${patientData.id}_before`, url);
        const remoteUrl = await uploadImage(files.beforeImage, `patients/${patientData.id}/before`);
        patientData.beforeImage = remoteUrl;
      }

      if (isNewPatient) {
        const { id: tempId, ...patientWithoutId } = patientData;
        const realId = await addPatient(patientWithoutId, accountId);

        // 🔥 HANDOVER: Link the local blob to the new real ID
        const profileBlob = getOptimisticImage(`${tempId}_profile`);
        if (profileBlob) setOptimisticImage(`${realId}_profile`, profileBlob);

        const beforeBlob = getOptimisticImage(`${tempId}_before`);
        if (beforeBlob) setOptimisticImage(`${realId}_before`, beforeBlob);

        // Update navigation to use real ID
        setSelectedPatientId(realId);
      } else {
        await updatePatient(patientData.id, patientData, accountId);
      }
    } catch (err: any) {
      console.error('Error saving patient:', err);
      showError(`${t('toast_save_failed')}: ${err.message || 'Unknown error'}`);
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
    if (!patientToDelete) return;

    try {
      // 1) Optimistic UI update: Remove from local state immediately
      const deletedId = patientToDelete;
      setPatients(prev => prev.filter(p => p.id !== deletedId));

      // 2) Close modals and navigate back
      setSelectedPatientId(null);
      setPatientToDelete(null);
      setIsDeleteModalOpen(false);
      setView('PATIENTS');

      // 3) Show success toast immediately
      success(t('toast_patient_deleted'));

      // 4) Perform actual DB deletion in background
      await deletePatientFromDb(deletedId);
    } catch (err) {
      console.error('Error deleting patient:', err);
      showError(t('toast_delete_failed'));
      // Note: In case of catastrophic failure, real-time sync would eventually restore 
      // the list if the delete actually failed on server, or we could manually re-fetch here.
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
      success(t('toast_profile_saved') || 'Updated successfully');
    } catch (err: any) {
      console.error('Error updating injection:', err);
      showError(`${t('toast_save_failed') || 'Update failed'}: ${err.message || 'Unknown error'}`);
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
      success(t('toast_profile_saved') || 'Added successfully');
    } catch (err: any) {
      console.error('Error adding injection:', err);
      showError(`${t('toast_save_failed') || 'Add failed'}: ${err.message || 'Unknown error'}`);
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
      success(t('toast_profile_saved') || 'Saved successfully');
    } catch (err: any) {
      console.error('Error editing injection:', err);
      showError(`${t('toast_save_failed') || 'Update failed'}: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteInjection = async (patientId: string, injectionId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const updatedInjections = patient.injections.filter(i => i.id !== injectionId);

    try {
      console.log('Deleting injection:', { patientId, injectionId });
      await updatePatientInjections(patientId, updatedInjections, accountId);
      success(t('toast_profile_saved') || 'Deleted successfully');
    } catch (err: any) {
      console.error('Error deleting injection:', err);
      showError(`${t('toast_save_failed') || 'Delete failed'}: ${err.message || 'Unknown error'}`);
    }
  };

  const handleAddAfterPhoto = async (patientId: string, photoOrFile: string | File, label: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    try {
      // Optimistic UI update for instant photo appearance
      const optimisticUrl = typeof photoOrFile === 'string' ? photoOrFile : URL.createObjectURL(photoOrFile);
      const tempId = `img-${Date.now()}`;

      // Seed cache for after photo
      if (typeof photoOrFile !== 'string') {
        setOptimisticImage(tempId, optimisticUrl);
      }

      const optimisticImage: PatientImage = {
        id: tempId,
        url: optimisticUrl,
        date: new Date().toISOString(),
        label
      };

      setPatients(prev => prev.map(p => {
        if (p.id !== patientId) return p;
        return { ...p, afterImages: [...(p.afterImages || []), optimisticImage] };
      }));

      success(t('toast_profile_saved')); // Generic profile saved toast works here

      let photoUrl = typeof photoOrFile === 'string' ? photoOrFile : '';

      if (photoOrFile instanceof File) {
        try {
          const timestamp = Date.now();
          photoUrl = await uploadImage(photoOrFile, `patients/${patientId}/after_images/${timestamp}`);
        } catch (e) {
          console.error('Failed to upload after photo', e);
          showError(t('toast_upload_failed'));
          return;
        }
      }

      // Save image with URL
      const newImage: PatientImage = {
        id: `img-${Date.now()}`,
        url: photoUrl,
        label,
        date: new Date().toISOString()
      };

      await addPatientAfterImage(patientId, newImage, patient.afterImages, accountId);
    } catch (error) {
      console.error('Error adding after photo:', error);
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
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="text-xl font-bold text-gray-800 tracking-tight">{t('settings')}</h3>
                  <p className="text-sm text-gray-500 mt-1">Manage your profile, preferences, and security</p>
                </div>

                <div className="p-8 space-y-8">
                  {/* Profile Card */}
                  <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-gradient-to-r from-promed-light/50 to-white rounded-2xl border border-promed-primary/10 shadow-sm">
                    <div className="flex items-center space-x-5 mb-4 md:mb-0">
                      <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg shadow-promed-primary/30">
                        <ProfileAvatar src={userImage} alt="Profile" size={64} className="w-full h-full" fallbackType="user" />
                      </div>
                      <div>
                        <p className="font-bold text-lg text-gray-800">{accountName || t('dr_name')}</p>
                        <p className="text-sm text-promed-primary font-bold mt-1">Account: {accountId}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {/* Removed direct edit button here, using Edit Profile Modal triggered from Sidebar */}
                      {/* This button could trigger the same modal if needed */}
                      <button className="px-6 py-2.5 bg-white text-gray-700 font-bold text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm">
                        Edit Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        className="px-6 py-2.5 bg-red-50 text-red-600 font-bold text-sm border border-red-200 rounded-xl hover:bg-red-100 transition shadow-sm flex items-center gap-2"
                        data-oid="logout-btn"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Preferences */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-400 uppercase text-xs tracking-wider mb-2">Preferences</h4>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition border border-transparent hover:border-gray-100 cursor-pointer group">
                        <div className="flex items-center space-x-3">
                          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition shadow-sm">
                            <Bell size={20} />
                          </div>
                          <span className="font-semibold text-gray-700">Notifications</span>
                        </div>
                        <div className="w-11 h-6 bg-promed-primary rounded-full relative shadow-inner">
                          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition border border-transparent hover:border-gray-100 cursor-pointer group">
                        <div className="flex items-center space-x-3">
                          <div className="p-2.5 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition shadow-sm">
                            <Smartphone size={20} />
                          </div>
                          <span className="font-semibold text-gray-700">App Appearance</span>
                        </div>
                        <span className="text-sm font-bold text-gray-400">Light</span>
                      </div>
                    </div>

                    {/* Security */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-400 uppercase text-xs tracking-wider mb-2">Security</h4>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition border border-transparent hover:border-gray-100 cursor-pointer group">
                        <div className="flex items-center space-x-3">
                          <div className="p-2.5 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition shadow-sm">
                            <Shield size={20} />
                          </div>
                          <span className="font-semibold text-gray-700">Two-Factor Auth</span>
                        </div>
                        <div className="w-11 h-6 bg-gray-200 rounded-full relative shadow-inner">
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }

      </div >
    );
  };

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }


  // Render Lock Screen if locked
  if (isLocked) {
    console.log("🔓 App component: Rendering LockScreen", { hasPassword: !!userPassword });
    return <LockScreen onUnlock={() => setIsLocked(false)} correctPassword={userPassword} />;
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
      onUpdateProfile={handleUpdateProfile}
      userName={accountName}
      onLogout={handleLogout}
    >
      {renderContent()}
      <ToastContainer />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPatientToDelete(null);
        }}
        onConfirm={confirmDeletePatient}
        title={t('delete_patient_title') || t('delete_patient') || 'Delete Patient'}
        description={t('delete_patient_confirm')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        icon={Trash2}
        variant="danger"
      />
    </Layout>
  );
};

export default App;

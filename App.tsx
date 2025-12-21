import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import { StatCard, StatsChart, UpcomingInjections } from './components/Widgets';
import { PatientList, PatientDetail, AddPatientForm } from './components/PatientViews';
import { LoginScreen } from './components/LoginScreen';
import AdminPanel from './components/AdminPanel';
import { Users, UserPlus, Calendar, Activity, Bell, Shield, Smartphone, Lock, ArrowRight, LogOut } from 'lucide-react';
import { Patient, PageView, InjectionStatus, PatientImage } from './types';
import { useLanguage } from './contexts/LanguageContext';
import { useAccount } from './contexts/AccountContext';
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
import { uploadImage, uploadAvatar } from './lib/imageService';
import { ProfileAvatar } from './components/ProfileAvatar';
import { useImagePreloader } from './lib/useImagePreloader';
import ToastContainer from './components/ToastContainer';

import { supabase } from './lib/supabaseClient';

// --- Lock Screen Component ---
const LockScreen: React.FC<{ onUnlock: () => void; correctPassword: string }> = ({ onUnlock, correctPassword }) => {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleUnlock = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (password === correctPassword) {

      onUnlock();
    } else {
      setError(true);
      setPassword('');
      setTimeout(() => setError(false), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-promed-dark flex flex-col items-center justify-center text-white animate-in fade-in duration-500">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-promed-primary/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-promed-light/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6">
        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-8 backdrop-blur-sm border border-white/20 shadow-2xl animate-bounce-slow">
          <Lock size={40} className="text-white drop-shadow-md" />
        </div>

        <h2 className="text-3xl font-bold mb-2 tracking-tight">{t('app_locked')}</h2>
        <p className="text-white/60 mb-8 text-center">{t('login_subtitle')}</p>

        <form onSubmit={handleUnlock} className="w-full space-y-4">
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full bg-white/10 border ${error ? 'border-red-400 shake' : 'border-white/20'} rounded-2xl py-4 px-6 text-center text-xl text-white placeholder-white/30 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all`}
              placeholder={t('enter_password')}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="w-full bg-white text-promed-dark font-bold py-4 rounded-2xl hover:bg-gray-100 transition active:scale-95 flex items-center justify-center space-x-2 shadow-lg"
          >
            <span>{t('unlock')}</span>
            <ArrowRight size={20} />
          </button>
          {error && <p className="text-red-300 text-sm text-center font-medium animate-pulse">{t('wrong_password')}</p>}
        </form>
      </div>
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
  const [userPassword, setUserPassword] = useState('password123');
  const [userImage, setUserImage] = useState<string>("https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff&size=128");
  const [userRole, setUserRole] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const { t } = useLanguage();

  // Persist lock state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('appLockState', isLocked.toString());
  }, [isLocked]);

  // Validate session consistency
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
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

        setAccount(sessionUserId, sessionUserId, '');
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
          // 🔥 FIX: Sync name to AccountContext for cross-device sync
          if (profile.name && profile.name !== accountName) {
            console.log("  • Name updated:", profile.name);
            setAccount(accountId!, userId, profile.name);
          }
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
          if (profile.role) {
            setUserRole(profile.role);
          }
        }
      },
      (error) => console.error("Profile subscription error:", error)
    );

    return () => unsubscribe();
  }, [isLoggedIn, userId, accountId]);

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

  const handleLogout = () => {
    logout();
    setPatients([]);
    setView('DASHBOARD');
  };

  // Consolidated Profile Update Handler
  const handleUpdateProfile = async (data: { name: string; image?: File | string; password?: string }) => {
    if (!userId) return;

    try {
      let avatarUrl = undefined;

      // 1. Handle Image Upload if provided
      if (data.image) {
        if (data.image instanceof File) {
          avatarUrl = await uploadAvatar(data.image, userId);
          console.log("2. Public URL generated:", avatarUrl); // LOG 2
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

      // 5. Force Refresh / Re-fetch is handled by the real-time subscription in useEffect!
      // But we update state immediately for UI responsiveness.

    } catch (error: any) {
      console.error("Error updating profile:", error);
      alert(`Failed to update profile: ${error.message}`);
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
      // 1) Upload images
      if (files?.profileImage) {
        const url = await uploadImage(files.profileImage, `patients/${patientData.id}/profile`);
        patientData.profileImage = url;
      }

      if (files?.beforeImage) {
        const url = await uploadImage(files.beforeImage, `patients/${patientData.id}/before`);
        patientData.beforeImage = url;
      }

      // 2) Supabase DB write
      const isNewPatient = !patients.find(p => p.id === patientData.id);

      if (isNewPatient) {
        const { id, ...patientWithoutId } = patientData;
        await addPatient(patientWithoutId, accountId);
      } else {
        await updatePatient(patientData.id, patientData, accountId);
      }

      // Navigate immediately after save
      if (view === 'EDIT_PATIENT') {
        setSelectedPatientId(patientData.id);
        setView('PATIENT_DETAIL');
      } else {
        setView('PATIENTS');
      }
    } catch (error: any) {
      console.error('Error saving patient:', error);
      alert(`Failed to save: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePatient = async () => {
    if (selectedPatientId && window.confirm(t('delete_patient_confirm'))) {
      try {
        await deletePatientFromDb(selectedPatientId);
        setSelectedPatientId(null);
        setView('PATIENTS');
      } catch (error) {
        console.error('Error deleting patient:', error);
        alert('Failed to delete patient. Please try again.');
      }
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
      await updatePatientInjections(patientId, updatedInjections, accountId);
    } catch (error) {
      console.error('Error updating injection:', error);
    }
  };

  const handleAddInjection = async (patientId: string, date: string, notes: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const newInjection = {
      id: `inj - ${Date.now()} `,
      date,
      status: InjectionStatus.SCHEDULED,
      notes
    };

    const updatedInjections = [...patient.injections, newInjection]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    try {
      await updatePatientInjections(patientId, updatedInjections, accountId);
    } catch (error) {
      console.error('Error adding injection:', error);
    }
  };

  const handleEditInjection = async (patientId: string, injectionId: string, date: string, notes: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const updatedInjections = patient.injections
      .map(inj => inj.id !== injectionId ? inj : { ...inj, date, notes })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    try {
      await updatePatientInjections(patientId, updatedInjections, accountId);
    } catch (error) {
      console.error('Error editing injection:', error);
    }
  };

  const handleDeleteInjection = async (patientId: string, injectionId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const updatedInjections = patient.injections.filter(i => i.id !== injectionId);

    try {
      await updatePatientInjections(patientId, updatedInjections, accountId);
    } catch (error) {
      console.error('Error deleting injection:', error);
    }
  };

  const handleAddAfterPhoto = async (patientId: string, photoOrFile: string | File, label: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    try {
      let photoUrl = typeof photoOrFile === 'string' ? photoOrFile : '';

      if (photoOrFile instanceof File) {
        try {
          const timestamp = Date.now();
          photoUrl = await uploadImage(photoOrFile, `patients/${patientId}/after_images/${timestamp}`);
        } catch (e) {
          console.error('Failed to upload after photo', e);
          alert('Failed to upload photo');
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
          {/* Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              label={t('total_patients')}
              value={stats.total}
              change=""
              icon={Users}
              colorClass="bg-[#0f766e]"
              shadowColor="rgba(15, 118, 110, 0.4)"
              isLoading={showSkeleton}
            />
            <StatCard
              label={t('new_patients_stat')}
              value={stats.newThisMonth}
              change=""
              icon={UserPlus}
              colorClass="bg-[#115e59]"
              shadowColor="rgba(17, 94, 89, 0.4)"
              isLoading={showSkeleton}
            />
            <StatCard
              label={t('total_appointments')}
              value={stats.upcoming}
              change=""
              icon={Calendar}
              colorClass="bg-[#134e4a]"
              shadowColor="rgba(19, 78, 74, 0.4)"
              isLoading={showSkeleton}
            />
            <StatCard
              label={t('requests')}
              value={0}
              change=""
              icon={Activity}
              colorClass="bg-[#0f5148]"
              shadowColor="rgba(15, 81, 72, 0.4)"
              isLoading={showSkeleton}
            />
          </div>

          {/* Middle Section: Chart and Upcoming */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <StatsChart />
            <UpcomingInjections patients={patients} onViewPatient={handleSelectPatient} />
          </div>
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
        {((view === 'PATIENT_DETAIL' || view === 'EDIT_PATIENT') && selectedPatientId) && (
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
        )}

        {/* Settings View */}
        {view === 'SETTINGS' && (
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
                      <p className="text-gray-500">{t('specialist')}</p>
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
        )}

      </div>
    );
  };

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }


  // Render Lock Screen if locked
  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} correctPassword={userPassword} />;
  }

  return (
    <Layout
      userId={userId || ''}
      currentPage={view}
      onNavigate={handleNavigate}
      onAddPatient={() => setView('ADD_PATIENT')}
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
      userRole={userRole}
    >
      {renderContent()}
      <ToastContainer />
    </Layout>
  );
};

export default App;

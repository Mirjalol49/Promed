
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Menu,
  X,
  PlusCircle,
  Camera,
  Eye,
  EyeOff,
  ChevronDown,
  Check,
  Globe,
  Lock,
  LogOut
} from 'lucide-react';
import { PageView } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { ProfileAvatar } from './ProfileAvatar';
import { supabase } from '../lib/supabaseClient';
import { uploadAvatar } from '../lib/imageService';
import { useToast } from '../contexts/ToastContext';
import { compressImage } from '../lib/imageOptimizer';

interface LayoutProps {
  children: React.ReactNode;
  userId: string;
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  onAddPatient: () => void;
  isLockEnabled: boolean;
  onToggleLock: (enabled: boolean) => void;
  onLock: () => void;
  userPassword: string;
  userImage: string;
  onUpdateProfile: (data: { name: string; image?: File | string; password?: string }) => Promise<void>;
  userName: string;
  userRole?: string;
}

// --- Edit Profile Modal Component ---
interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLockEnabled: boolean;
  onToggleLock: (enabled: boolean) => void;
  userPassword: string;
  userImage: string;
  onUpdateProfile: (data: { name: string; image?: File | string; password?: string }) => Promise<void>;
  userId: string;
  userName: string;
  userRole?: string;
}


const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, isLockEnabled, onToggleLock, userPassword, onUpdateProfile, userImage, userId, userName, userRole }) => {
  const { t } = useLanguage();
  const { success, error: showError } = useToast();
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [profileImage, setProfileImage] = useState<string>(userImage);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Local state for inputs
  const [nameInput, setNameInput] = useState(userName);
  const [currentPassInput, setCurrentPassInput] = useState(userPassword);
  const [newPassInput, setNewPassInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync with global state when modal opens
  useEffect(() => {
    if (isOpen) {
      setNameInput(userName);
      setCurrentPassInput(userPassword);
      setNewPassInput('');
      setProfileImage(userImage);
      setSelectedFile(null);
      setIsSaving(false);
    }
  }, [isOpen, userPassword, userImage, userName]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfileImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ROBUST SAVE LOGIC
  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalAvatarUrl = userImage;

      // 1. UPDATE PASSWORD (Auth API)
      if (newPassInput && newPassInput.trim() !== '') {
        if (newPassInput.length < 6) {
          throw new Error("Password must be at least 6 characters long");
        }

        console.log("1. Updating Password...");
        const { error: passError } = await supabase.auth.updateUser({
          password: newPassInput
        });

        if (passError) {
          console.error("Password Error:", passError);
          throw new Error(`Password update failed: ${passError.message}`);
        }
        console.log("✓ Password updated");
      }

      // 2. UPLOAD IMAGE (if new file selected)
      if (selectedFile) {
        console.log("2. Compressing and uploading image...");

        // Compress image before upload
        const compressedFile = await compressImage(selectedFile);
        console.log('Profile image compressed:',
          `${(selectedFile.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);

        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `avatar_${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, compressedFile, { upsert: true });

        if (uploadError) {
          console.error("Upload Error:", uploadError);
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        finalAvatarUrl = data.publicUrl;
        console.log("✓ Image uploaded:", finalAvatarUrl);
      }

      // 3. UPDATE DATABASE
      const updates = {
        full_name: nameInput,
        avatar_url: finalAvatarUrl,
        profile_image: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: dbError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (dbError) {
        console.error("Database Error:", dbError);
        throw new Error(`Failed to save profile: ${dbError.message}`);
      }

      console.log("✓ Profile saved successfully!");

      // 4. Update local state (including password for lock screen)
      await onUpdateProfile({
        name: nameInput,
        image: finalAvatarUrl,
        password: newPassInput || undefined, // Sync lock screen password
      });

      success('Profile saved successfully!');
      onClose();

    } catch (error: any) {
      console.error("Save failed:", error);
      showError(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      {/* Light Theme Modal Container matching app design */}
      <div className="bg-white w-full max-w-[440px] rounded-2xl shadow-modal border border-slate-100 overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">{t('edit_profile')}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition rounded-lg p-1 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Profile Image */}
          <div className="flex justify-center mb-2">
            <div className="relative group cursor-pointer w-28 h-28">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-xl group-hover:border-slate-50 transition ring-1 ring-slate-100">
                <ProfileAvatar src={profileImage} alt="Profile" size={112} className="w-full h-full" />
              </div>
              {/* Hover Overlay */}
              <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                <Camera className="text-white drop-shadow-md" size={32} />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          {/* Security Toggle Section */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('security_settings')}</h4>

            <div className="flex items-center justify-between">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${isLockEnabled ? 'bg-promed-primary text-white' : 'bg-slate-200 text-slate-500'} transition-colors`}>
                  <Lock size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800">{t('enable_lock')}</p>
                  <p className="text-xs text-slate-500 leading-tight mt-0.5 pr-2">{t('lock_hint')}</p>
                </div>
              </div>

              <button
                onClick={() => onToggleLock(!isLockEnabled)}
                className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-promed-primary ${isLockEnabled ? 'bg-promed-primary' : 'bg-slate-200'
                  }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${isLockEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
          </div>

          {/* Inputs Form */}
          <div className="space-y-5">

            {/* Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('full_name')}</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-promed-primary/20 focus:border-promed-primary focus:bg-white transition-all text-sm shadow-sm"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('role')}</label>
              <input
                type="text"
                defaultValue={userRole || t('manager')}
                readOnly
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-500 focus:outline-none opacity-80 cursor-not-allowed text-sm shadow-sm font-medium"
              />
            </div>

            {/* Current Password - Read Only / Controlled Display */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('current_password')}</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassInput}
                  readOnly
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-promed-primary/20 focus:border-promed-primary focus:bg-white transition-all tracking-widest text-sm shadow-sm opacity-80"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                >
                  {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('new_password')}</label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  placeholder={t('optional_change')}
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-promed-primary/20 focus:border-promed-primary focus:bg-white transition-all text-sm shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                >
                  {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 mt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm text-slate-500 hover:text-slate-800 font-semibold transition hover:bg-slate-50 rounded-xl"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-promed-primary hover:bg-teal-800 text-white text-sm font-bold rounded-xl transition active:scale-95 shadow-md shadow-promed-primary/20"
            >
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Layout: React.FC<LayoutProps> = (props) => {
  const { children, currentPage, onNavigate, onAddPatient, isLockEnabled, onToggleLock, onLock, userPassword, userImage, userName, userRole } = props;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const NavItem = ({ page, icon: Icon, label }: { page: PageView; icon: any; label: string }) => {
    const isActive = currentPage === page;
    return (
      <button
        onClick={() => {
          onNavigate(page);
          setIsSidebarOpen(false);
        }}
        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 mb-1 group border border-transparent ${isActive
          ? 'bg-white/10 text-white shadow-inner backdrop-blur-sm border-white/5'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
      >
        <Icon size={18} className={isActive ? 'text-promed-light' : 'text-slate-500 group-hover:text-slate-300'} />
        <span className="font-medium tracking-wide text-sm">{label}</span>
      </button>
    );
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'DASHBOARD': return t('dashboard');
      case 'PATIENTS': return t('patient_list');
      case 'ADD_PATIENT': return t('add_new_patient');
      case 'PATIENT_DETAIL': return t('details');
      case 'SETTINGS': return t('settings');
      default: return '';
    }
  };

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'uz', label: "O'zbek" },
    { code: 'ru', label: 'Русский' }
  ];

  const currentLangLabel = languages.find(l => l.code === language)?.label || 'English';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/80 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-promed-dark flex flex-col transition-transform duration-300 ease-out shadow-2xl border-r border-white/5
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg shadow-black/20">
              <div className="w-4 h-4 bg-promed-primary rounded-full" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">PROMED</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-2 px-3 overflow-y-auto no-scrollbar space-y-1">
          <NavItem page="DASHBOARD" icon={LayoutDashboard} label={t('dashboard')} />
          <NavItem page="PATIENTS" icon={Users} label={t('patients')} />
        </nav>

        {/* Sidebar Footer with Profile & Lock */}
        <div className="p-4 mt-auto border-t border-white/10 bg-black/10">
          {isLockEnabled && (
            <button
              onClick={onLock}
              className="w-full flex items-center space-x-3 text-slate-400 hover:text-white hover:bg-white/5 px-3 py-2 rounded-lg font-medium transition active:scale-95 mb-3 text-xs"
            >
              <Lock size={16} />
              <span>{t('lock_app')}</span>
            </button>
          )}

          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="flex items-center w-full space-x-3 group p-2 rounded-lg hover:bg-white/5 transition duration-200 border border-transparent hover:border-white/5"
          >
            <div className="relative">
              <ProfileAvatar src={userImage} alt="Profile" size={36} className="rounded-lg shadow-lg shadow-black/20 border border-white/10 group-hover:scale-105 transition-transform" />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-promed-dark rounded-full"></div>
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-sm font-bold text-white truncate group-hover:text-promed-light transition">{userName || t('dr_name')}</p>
              <p className="text-[10px] text-white/60 truncate font-medium uppercase tracking-wide">{userRole || t('specialist')}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Header - Refactored for proper fixed z-index context */}
        <header className="sticky top-0 z-20 h-20">
          {/* Background Layer with Filter */}
          <div className="absolute inset-0 bg-white/90 backdrop-blur-md shadow-soft border-b border-slate-200" />

          {/* Content Layer */}
          <div className="relative z-10 h-full flex items-center justify-between px-6 md:px-10">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <Menu size={24} />
              </button>
              <h1 className="text-2xl font-bold text-slate-900 hidden md:block tracking-tight">
                {getPageTitle()}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Language Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className="flex items-center space-x-2 bg-white border border-slate-200 hover:border-promed-primary/50 text-slate-700 px-3 py-2 rounded-xl transition-all font-bold text-xs shadow-sm hover:shadow-md"
                >
                  <Globe size={14} className="text-slate-400" />
                  <span>{currentLangLabel}</span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLangMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsLangMenuOpen(false)}></div>

                    {/* Dropdown Menu */}
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code as any);
                            setIsLangMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-slate-50 transition flex items-center justify-between
                          ${language === lang.code ? 'text-promed-primary bg-promed-light/30' : 'text-slate-600'}
                        `}
                        >
                          <span>{lang.label}</span>
                          {language === lang.code && <Check size={16} className="text-promed-primary" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </header>

        {/* Content Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth z-0">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Modals */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        isLockEnabled={isLockEnabled}
        onToggleLock={onToggleLock}
        userPassword={userPassword}
        userImage={userImage}
        onUpdateProfile={props.onUpdateProfile}
        userId={props.userId}
        userName={userName}
        userRole={userRole}
      />
    </div>
  );
};

export default Layout;

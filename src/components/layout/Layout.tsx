import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Menu,
  X,
  Lock,
  Settings,
  Shield
} from 'lucide-react';
import { PageView } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { ProfileAvatar } from './ProfileAvatar';
import EditProfileModal from '../ui/EditProfileModal';
import { useAccount } from '../../contexts/AccountContext';
import { SystemAlertBanner } from './SystemAlertBanner';

interface LayoutProps {
  children: React.ReactNode;
  userId: string;
  userEmail: string;
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  isLockEnabled: boolean;
  onToggleLock: (enabled: boolean) => void;
  onLock: () => void;
  userPassword: string;
  userImage: string;
  onUpdateProfile: (data: { name: string; image?: File | string; password?: string }) => Promise<void>;
  userName: string;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  userId,
  userEmail,
  currentPage,
  onNavigate,
  isLockEnabled,
  onLock,
  userImage,
  userName,
  onLogout,
  onToggleLock,
  userPassword,
  onUpdateProfile
}) => {
  const { role } = useAccount();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const { t } = useLanguage();

  const NavItem = ({ page, icon: Icon, label, id }: { page: PageView; icon: any; label: string; id?: string }) => {
    const isActive = currentPage === page;
    return (
      <button
        id={id}
        onClick={() => {
          onNavigate(page);
          setIsSidebarOpen(false);
        }}
        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 mb-1 group border border-transparent ${isActive
          ? 'bg-white/10 text-white shadow-sm backdrop-blur-sm border-white/5'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
      >
        <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} />
        <span className="font-medium tracking-wide text-sm">{label}</span>
      </button>
    );
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'DASHBOARD': return t('dashboard');
      case 'ADMIN_DASHBOARD': return 'Admin Control Center';
      case 'PATIENTS': return t('patient_list');
      case 'ADD_PATIENT': return t('add_new_patient');
      case 'PATIENT_DETAIL': return t('details');
      case 'SETTINGS': return t('settings');
      default: return '';
    }
  };


  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans">
      <SystemAlertBanner />
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/80 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-[#134e4a] to-[#042f2e] flex flex-col transition-transform duration-300 ease-out shadow-2xl border-r border-white/10
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-white">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg shadow-black/20">
              <div className="w-4 h-4 bg-promed-primary rounded-full" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight">PROMED</span>
              {role === 'admin' && (
                <span className="bg-purple-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest -mt-0.5 self-start">Super Admin</span>
              )}
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-2 px-3 overflow-y-auto no-scrollbar space-y-1 text-white">
          <NavItem page="DASHBOARD" icon={LayoutDashboard} label={t('dashboard')} />
          <NavItem page="PATIENTS" icon={Users} label={t('patients')} id="add-patient-btn" />

          {role === 'admin' && (
            <div className="pt-4 mt-4 border-t border-white/5 space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Management</p>
              <NavItem page="ADMIN_DASHBOARD" icon={Shield} label="Admin Panel" />
            </div>
          )}
        </nav>

        {/* Sidebar Footer with Profile & Lock */}
        <div className="p-4 mt-auto border-t border-white/10 bg-black/20">
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
              <ProfileAvatar src={userImage} alt="Profile" size={36} className="rounded-lg shadow-lg shadow-black/20 border border-white/10 group-hover:scale-105 transition-transform" optimisticId={`${userId}_profile`} />

            </div>
            <div className="text-left overflow-hidden">
              <p className="text-sm font-bold text-white truncate group-hover:text-promed-light transition">{userName || t('dr_name')}</p>
            </div>
            <Settings size={14} className="ml-auto text-white/30 group-hover:text-white/70 transition-colors" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 md:h-20">
          <div className="absolute inset-0 bg-white/90 backdrop-blur-md shadow-soft border-b border-slate-200" />
          <div className="relative z-10 h-full flex items-center justify-between px-4 md:px-10">

            {/* Left Section: Logo (Mobile) or Title (Desktop) */}
            <div className="flex items-center">
              {/* Mobile Logo */}
              <div className="flex items-center md:hidden gap-2">
                <div className="w-8 h-8 bg-promed-primary rounded-lg flex items-center justify-center shadow-lg shadow-promed-primary/20">
                  <div className="w-4 h-4 bg-white rounded-full" />
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">PROMED</span>
              </div>

              {/* Desktop Title */}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 hidden md:block tracking-tight">
                {getPageTitle()}
              </h1>
            </div>

            {/* Right Section: Mobile Menu Trigger */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </header>

        {/* Main Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth z-0">
          <div className="max-w-[1600px] mx-auto text-white">
            <div className="text-slate-900">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        isLockEnabled={isLockEnabled}
        onToggleLock={onToggleLock}
        userPassword={userPassword}
        userImage={userImage}
        userEmail={userEmail}
        onUpdateProfile={onUpdateProfile}
        userId={userId}
        userName={userName}
        onLogout={onLogout}
      />
    </div>
  );
};

export default Layout;

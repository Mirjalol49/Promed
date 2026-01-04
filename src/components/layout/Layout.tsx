import React, { useState, useEffect } from 'react';
import { AnimateIcon } from '../ui/AnimateIcon';
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
import { useAccount } from '../../contexts/AccountContext';
import { SystemAlertBanner } from './SystemAlertBanner';
import { NotificationBell } from './NotificationBell';
import { useSystemAlert } from '../../contexts/SystemAlertContext';
import lockIcon from '../../assets/images/lock.png';
import logoImg from '../../assets/images/logo.png';

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
  const { t } = useLanguage();

  const NavItem = ({ page, icon: Icon, label, id, iconImg }: { page: PageView; icon: any; label: string; id?: string; iconImg?: string }) => {
    const isActive = currentPage === page;
    return (
      <button
        id={id}
        onClick={() => {
          onNavigate(page);
          setIsSidebarOpen(false);
        }}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 mb-1 group border border-transparent ${isActive
          ? 'bg-[hsl(204deg,67%,92%)] border-slate-200 text-slate-900 shadow-sm'
          : 'text-slate-900 hover:bg-[hsl(204deg,67%,92%)]'
          }`}
      >
        {iconImg ? (
          <img src={iconImg} alt={label} className={`w-8 h-8 object-contain transition-transform duration-300 group-hover:scale-110 ${isActive ? 'scale-110' : 'opacity-100'}`} />
        ) : (
          <AnimateIcon>
            <Icon size={20} className={`transition-colors ${isActive ? 'text-promed-primary' : 'text-slate-900'}`} />
          </AnimateIcon>
        )}
        <span className={`text-base font-sans transition-all duration-200 ${isActive ? 'font-semibold' : 'font-medium group-hover:font-semibold'}`}>{label}</span>
      </button >
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
        fixed md:static inset-y-0 left-0 z-40 w-[260px] bg-[#ffffff] flex flex-col transition-transform duration-300 ease-out shadow-soft border-r border-[#E2E8F0]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-slate-900">
            {/* Logo Image Only - No Background */}
            <img src={logoImg} alt="Promed Logo" className="w-40 h-auto object-contain" />
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-900">
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-2 px-4 overflow-y-auto no-scrollbar space-y-2 text-slate-900">
          <NavItem page="DASHBOARD" icon={LayoutDashboard} label={t('dashboard')} />
          <NavItem page="PATIENTS" icon={Users} label={t('patients')} id="add-patient-btn" />

          {role === 'admin' && (
            <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
              <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Management</p>
              <NavItem page="ADMIN_DASHBOARD" icon={Shield} label="Admin Panel" />
            </div>
          )}
        </nav>

        {/* Sidebar Footer with Profile & Lock */}
        <div className="p-4 mt-auto border-t border-slate-100 bg-white space-y-2">

          {isLockEnabled && (
            <button
              onClick={onLock}
              className="w-full flex items-center space-x-3 text-slate-900 hover:bg-[hsl(204deg,67%,92%)] px-4 py-3 rounded-xl font-medium transition active:scale-95 group"
            >
              <Lock size={20} />
              <span className="text-base font-sans font-medium group-hover:font-semibold transition-all duration-200">{t('lock_app')}</span>
            </button>
          )}

          <button
            onClick={() => {
              onNavigate('SETTINGS');
              setIsSidebarOpen(false);
            }}
            className="flex items-center w-full space-x-3 group px-4 py-3 rounded-xl hover:bg-[hsl(204deg,67%,92%)] transition duration-200 border border-transparent hover:border-slate-200"
          >
            <div className="relative">
              <ProfileAvatar src={userImage} alt="Profile" size={44} className="rounded-lg  shadow-slate-200 border border-slate-100 group-hover:border-slate-300 transition-colors" optimisticId={`${userId}_profile`} />

            </div>
            <div className="text-left overflow-hidden flex-1">
              <p className="text-sm font-sans font-medium group-hover:font-semibold text-slate-900 truncate group-hover:text-promed-primary transition-all duration-200">{userName || t('dr_name')}</p>
            </div>
            <Settings
              size={20}
              className="ml-auto text-slate-900 transition-colors"
            />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[hsl(204deg,67%,92%)]">
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 md:h-20">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xl shadow-soft border-b border-promed-primary/5" />
          <div className="relative z-10 h-full flex items-center justify-between px-4 md:px-10">

            {/* Left Section: Logo (Mobile) or Title (Desktop) */}
            <div className="flex items-center">
              {/* Mobile Logo */}
              <div className="flex items-center md:hidden gap-2">
                <div className="w-8 h-8 bg-transparent rounded-lg flex items-center justify-center">
                  <img src={logoImg} alt="Promed Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">PROMED</span>
              </div>

              {/* Desktop Title */}
              <h1 className="text-3xl font-bold text-slate-900 hidden md:block tracking-tight">
                {getPageTitle()}
              </h1>
            </div>

            {/* Right Section: Notification & Profile */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <NotificationBell />

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
    </div>
  );
};


export default Layout;

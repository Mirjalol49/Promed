
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
import EditProfileModal from './EditProfileModal';

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
}






const Layout: React.FC<LayoutProps> = (props) => {
  const { children, currentPage, onNavigate, onAddPatient, isLockEnabled, onToggleLock, onLock, userPassword, userImage, userName } = props;
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
      />
    </div>
  );
};

export default Layout;

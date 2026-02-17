import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimateIcon } from '../ui/AnimateIcon';
import {
  LayoutDashboard,
  Users,
  Menu,
  X,
  Lock,
  Settings,
  Shield,
  LayoutList,
  StickyNote,
  MessageSquare,
  Briefcase,
  Wallet,
  UserCog
} from 'lucide-react';
import { Patient, PageView } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { ProfileAvatar } from './ProfileAvatar';
import { useAccount } from '../../contexts/AccountContext';
import { NotificationBell } from './NotificationBell';
import { useSystemAlert } from '../../contexts/SystemAlertContext';
import { useRBAC } from '../../hooks/useRBAC';
import { SCOPES } from '../../config/permissions';
import lockIcon from '../../assets/images/lock.png';
const logoImg = "/images/logo_graft.png";
// MobileDock removed


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
  patients?: Patient[];
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
  onUpdateProfile,
  patients = []
}) => {
  const { role, can } = useRBAC();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useLanguage();

  const totalUnread = patients.reduce((acc, p) => acc + (p.unreadCount || 0), 0);

  const NavItem = ({ page, icon: Icon, label, id, iconImg, badge }: { page: PageView; icon: any; label: string; id?: string; iconImg?: string; badge?: number }) => {
    const isActive = currentPage === page;
    return (
      <motion.button
        id={id}
        onClick={() => {
          onNavigate(page);
          setIsSidebarOpen(false);
          setIsMobileMenuOpen(false);
        }}
        whileHover="hover"
        initial="idle"
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-200 mb-1 group border border-transparent outline-none relative overflow-hidden active-scale ${isActive
          ? 'gel-blue-style text-white'
          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
      >
        {iconImg ? (
          <motion.img
            src={iconImg}
            alt={label}
            variants={{
              idle: { scale: isActive ? 1.1 : 1 },
              hover: {
                scale: 1.2,
                rotate: [0, -5, 5, 0],
                transition: {
                  type: "spring" as const,
                  stiffness: 300,
                  damping: 10,
                  duration: 0.4
                }
              }
            }}
            className={`w-8 h-8 object-contain transition-transform duration-300 ${isActive ? '' : 'opacity-100'}`}
          />
        ) : (
          <AnimateIcon>
            <Icon size={20} className={`transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'}`} />
          </AnimateIcon>
        )}
        <span className={`text-base font-sans transition-all duration-200 flex-1 text-left ${isActive ? 'font-semibold' : 'font-medium group-hover:font-semibold'}`}>{label}</span>
        {
          badge && badge > 0 ? (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-promed-primary text-white text-[10px] font-bold rounded-full shadow-sm ml-auto">
              {badge}
            </span>
          ) : null
        }
      </motion.button >
    );
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'DASHBOARD': return t('dashboard');
      case 'ADMIN_DASHBOARD': return t('admin_control_center');
      case 'PATIENTS': return t('patient_list');
      case 'ADD_PATIENT': return t('add_new_patient');
      case 'PATIENT_DETAIL': return t('details');
      case 'SETTINGS': return t('settings');
      case 'LEADS': return t('leads');
      case 'STAFF': return t('staff') || 'Staff';
      case 'FINANCE': return t('finance') || 'Finance';
      case 'ROLES': return t('roles_management') || 'Roles Management';
      default: return '';
    }
  };


  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans">

      {/* Sidebar (Desktop Only - lg and up) */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-white/80 backdrop-blur-2xl h-full border-r border-slate-200/60 z-40 relative shadow-[5px_0_30px_-10px_rgba(0,0,0,0.03)]">
        {/* Logo */}
        <div className="p-4 md:p-6 flex items-center justify-end md:justify-between">
          <div className="hidden md:flex items-center space-x-3 text-slate-900">
            {/* Logo Image Only - No Background */}
            <img src={logoImg} alt="Promed Logo" className="w-32 md:w-36 h-auto object-contain" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-2 px-4 overflow-y-auto no-scrollbar space-y-2 text-slate-900">
          {(can(SCOPES.canViewDashboard) || role === 'nurse') && <NavItem page="DASHBOARD" icon={LayoutDashboard} label={t('dashboard')} />}
          {can(SCOPES.canViewPatients) && <NavItem page="PATIENTS" icon={Users} label={t('patients')} id="add-patient-btn" />}
          {can(SCOPES.canViewLeads) && <NavItem page="LEADS" icon={LayoutList} label={t('leads')} />}
          {can(SCOPES.canViewMessages) && <NavItem page="MESSAGES" icon={MessageSquare} label={t('messages')} badge={totalUnread} />}
          {can(SCOPES.canViewNotes) && <NavItem page="NOTES" icon={StickyNote} label={t('notes')} />}
          {can(SCOPES.canViewStaff) && <NavItem page="STAFF" icon={Briefcase} label={t('staff')} />}
          {can(SCOPES.canViewFinance) && role !== 'nurse' && <NavItem page="FINANCE" icon={Wallet} label={t('finance')} />}

          {(can(SCOPES.canViewRoles) || can(SCOPES.canViewAdmin)) && (
            <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
              <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t('management')}</p>
              {can(SCOPES.canViewRoles) && <NavItem page="ROLES" icon={UserCog} label={t('roles') || 'Roles'} />}

            </div>
          )}
        </nav>

        {/* Sidebar Footer with Profile & Lock */}
        <div className="p-4 mt-auto border-t border-slate-100 bg-premium-card space-y-2">

          {isLockEnabled && (
            <button
              onClick={onLock}
              className="w-full flex items-center space-x-3 text-slate-900 hover:bg-promed-primary/10 px-4 py-3 rounded-2xl font-medium transition active:scale-95 group"
            >
              <Lock size={20} />
              <span className="text-base font-sans font-medium group-hover:font-semibold transition-all duration-200">{t('lock_app')}</span>
            </button>
          )}

          <button
            onClick={() => {
              onNavigate('SETTINGS');
              setIsSidebarOpen(false);
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center w-full space-x-3 group px-4 py-3 rounded-2xl hover:bg-promed-primary/5 transition duration-200 border border-transparent hover:border-promed-primary/10"
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
      <div className="flex-1 flex flex-col min-w-0 bg-premium-card pb-0"> {/* Removed bottom padding from mobile dock */}
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 md:h-20">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xl shadow-premium border-b border-promed-primary/5" />
          <div className="relative z-10 h-full flex items-center justify-between px-4 md:px-10">

            {/* Left Section: Burger (Mobile) & Title */}
            <div className="flex items-center gap-4">

              {/* Mobile Burger Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Menu size={24} />
              </button>

              {/* Logo (Mobile/Tablet) */}
              <div className="flex items-center lg:hidden gap-2">
                <div className="h-8 bg-transparent flex items-center justify-center">
                  <img src={logoImg} alt="Promed Logo" className="h-full w-auto object-contain" />
                </div>
              </div>

              {/* Desktop Title */}
              <h1 className="text-3xl font-bold text-slate-900 hidden lg:block tracking-tight">
                {getPageTitle()}
              </h1>
            </div>

            {/* Right Section: Notification & Profile */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Main Area */}
        <main className={`flex-1 overflow-x-hidden scroll-smooth z-0 ${currentPage === 'MESSAGES' ? 'overflow-hidden px-2 pb-2 pt-1 md:px-6 md:pb-6 md:pt-2 lg:px-8 lg:pb-8' : 'overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8'}`}>
          <div className="max-w-[1600px] mx-auto text-white">
            <div className="text-slate-900">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 lg:hidden"
            />

            {/* Slide-in Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-white/95 backdrop-blur-2xl z-50 lg:hidden shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-6 flex items-center justify-between border-b border-slate-100">
                <img src={logoImg} alt="Promed Logo" className="w-32 h-auto object-contain" />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Drawer Nav */}
              <div className="flex-1 overflow-y-auto py-4 px-4 space-y-2 no-scrollbar">
                {can(SCOPES.canViewDashboard) && <NavItem page="DASHBOARD" icon={LayoutDashboard} label={t('dashboard')} />}
                {can(SCOPES.canViewPatients) && <NavItem page="PATIENTS" icon={Users} label={t('patients')} id="add-patient-btn-mobile" />}
                {can(SCOPES.canViewLeads) && <NavItem page="LEADS" icon={LayoutList} label={t('leads')} />}
                {can(SCOPES.canViewMessages) && <NavItem page="MESSAGES" icon={MessageSquare} label={t('messages')} badge={totalUnread} />}
                {can(SCOPES.canViewNotes) && <NavItem page="NOTES" icon={StickyNote} label={t('notes')} />}
                {can(SCOPES.canViewStaff) && <NavItem page="STAFF" icon={Briefcase} label={t('staff')} />}
                {can(SCOPES.canViewFinance) && role !== 'nurse' && <NavItem page="FINANCE" icon={Wallet} label={t('finance')} />}

                {(can(SCOPES.canViewRoles) || can(SCOPES.canViewAdmin)) && (
                  <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
                    <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t('management')}</p>
                    {can(SCOPES.canViewRoles) && <NavItem page="ROLES" icon={UserCog} label={t('roles') || 'Roles'} />}

                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
                {isLockEnabled && (
                  <button
                    onClick={() => {
                      onLock();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 text-slate-700 hover:bg-white hover:shadow-sm px-4 py-3 rounded-2xl font-medium transition active:scale-95 group border border-transparent hover:border-slate-200"
                  >
                    <Lock size={20} />
                    <span className="text-base font-sans font-medium">{t('lock_app')}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onNavigate('SETTINGS');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full space-x-3 group px-4 py-3 rounded-2xl hover:bg-white hover:shadow-sm transition duration-200 border border-transparent hover:border-slate-200"
                >
                  <div className="relative">
                    <ProfileAvatar src={userImage} alt="Profile" size={40} className="rounded-lg shadow-sm" optimisticId={`mobile_${userId}_profile`} />
                  </div>
                  <div className="text-left overflow-hidden flex-1">
                    <p className="text-sm font-sans font-bold text-slate-900 truncate">{userName || t('dr_name')}</p>
                    <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                  </div>
                  <Settings size={18} className="text-slate-400" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};


export default Layout;

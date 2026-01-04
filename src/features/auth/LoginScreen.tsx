import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, AlertCircle, Globe, Mail, KeyRound } from 'lucide-react';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { loginSchema, safeValidate } from '../../lib/validation';
import lockIcon from '../../assets/images/lock.png';
import keyIcon from '../../assets/images/key.png';


interface LoginScreenProps {
  onLogin: (accountId: string, userId: string, name: string, email: string, password?: string) => void;
}

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'uz', name: "O'zbekcha", flag: '🇺🇿' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { t, language, setLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Forgot Password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  // Handle forgot password - Send Magic Link
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetMessage('');

    try {
      // Use sendPasswordResetEmail from Firebase
      await sendPasswordResetEmail(auth, resetEmail);

      setResetMessage(t('magic_link_sent') || 'Password reset link sent! Check your email.');
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetMessage('');
        setResetEmail('');
      }, 5000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setResetError(err.message || 'Failed to send reset link');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 🛡️ SECURITY: Validate input before sending to Firebase
      const validation = safeValidate(loginSchema, { email, password });
      if (validation.success === false) {
        throw new Error(validation.error);
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user) {
        // 🛡️ SECURITY: Check account status in Firestore before proceeding
        const { db } = await import('../../lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const profileDoc = await getDoc(doc(db, 'profiles', user.uid));

        if (profileDoc.exists()) {
          const profileData = profileDoc.data();
          if (profileData.status === 'banned' || profileData.status === 'frozen') {
            const msg = profileData.status === 'banned'
              ? 'This account has been banned.'
              : 'This account is currently frozen.';
            setError(msg);
            const { signOut } = await import('firebase/auth');
            await signOut(auth);
            setLoading(false);
            return;
          }
        }

        onLogin('account_' + user.email, user.uid, user.email?.split('@')[0] || 'User', user.email || '', password);
      }

    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError(t('login_error_invalid_password'));
      } else {
        setError(err.message || t('login_error_generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-promed-primary flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-white/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">

        {/* Lock Icon */}
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-8 border border-promed-primary/10 shadow-2xl shadow-promed-primary/10">
          <img src={lockIcon} alt="Secure" className="w-10 h-10 object-contain" />
        </div>

        {/* Title */}
        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2 tracking-wider">
          {t('login_welcome')}
        </h1>
        <p className="text-white/80 text-center mb-10 font-medium">
          {t('login_subtitle')}
        </p>

        {/* Login Form - Minimal Design */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {/* Email Input */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-promed-muted/40" size={20} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-promed-primary/10 rounded-2xl text-promed-text placeholder-promed-muted/30 focus:outline-none focus:ring-4 focus:ring-promed-primary/10 transition-all text-center font-bold"
              placeholder={t('email_placeholder')}
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <img src={keyIcon} alt="Key" className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 object-contain opacity-40" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-promed-primary/10 rounded-2xl text-promed-text placeholder-promed-muted/30 focus:outline-none focus:ring-4 focus:ring-promed-primary/10 transition-all text-center font-bold"
              placeholder={t('enter_password')}
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center justify-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-300 text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-white text-promed-primary font-bold py-4 px-6 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-black/10 hover:shadow-2xl text-xl"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-promed-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{t('login_btn')}</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>

          {/* Forgot Password Link */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setResetEmail(email);
              }}
              className="text-white/70 hover:text-white text-sm font-bold transition-colors"
            >
              {t('forgot_password_link')}
            </button>
          </div>
        </form>

        {/* Language Selector - Bottom */}
        <div className="mt-12">
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white hover:bg-white/20 shadow-sm transition-all backdrop-blur-sm"
            >
              <Globe size={16} className="text-white" />
              <span className="text-sm">{languages.find(l => l.code === language)?.flag}</span>
              <span className="text-sm font-bold">{languages.find(l => l.code === language)?.name}</span>
            </button>

            {showLanguageMenu && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-promed-dark/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLanguageMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-all ${language === lang.code ? 'bg-white/20 text-white' : 'text-white/80'
                      }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className="font-medium">{lang.name}</span>
                    {language === lang.code && (
                      <svg className="w-4 h-4 ml-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-promed-bg border border-promed-primary/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-promed-text mb-2">{t('reset_password_title')}</h3>
            <p className="text-promed-muted text-sm mb-6 font-medium">
              {t('reset_password_desc')}
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-4 py-4 bg-white border border-promed-primary/10 rounded-2xl text-promed-text placeholder-promed-muted/30 focus:outline-none focus:ring-4 focus:ring-promed-primary/10 transition-all font-bold text-center"
                placeholder={t('email_placeholder')}
                required
                autoFocus
              />

              {resetError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-300 text-sm">
                  <AlertCircle size={18} />
                  <span>{resetError}</span>
                </div>
              )}

              {resetMessage && (
                <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/30 rounded-2xl text-green-300 text-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{resetMessage}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetError('');
                    setResetMessage('');
                  }}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-promed-muted font-bold rounded-2xl transition-all"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-3 px-4 bg-promed-primary text-white font-bold rounded-2xl transition-all shadow-xl shadow-promed-primary/20 disabled:opacity-50"
                >
                  {resetLoading ? (
                    <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin mx-auto" />
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

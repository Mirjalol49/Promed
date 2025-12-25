import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, Globe, Mail, KeyRound } from 'lucide-react';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabaseClient';
import { loginSchema, safeValidate } from '../../lib/validation';


interface LoginScreenProps {
  onLogin: (accountId: string, userId: string, name: string, email: string) => void;
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
      // Use signInWithOtp to send a magic link (logs user in directly when clicked)
      const { error } = await supabase.auth.signInWithOtp({
        email: resetEmail,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (error) throw error;

      setResetMessage(t('magic_link_sent') || 'Magic link sent! Check your email to log in.');
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetMessage('');
        setResetEmail('');
      }, 5000);
    } catch (err: any) {
      console.error('Magic link error:', err);
      setResetError(err.message || 'Failed to send magic link');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 🛡️ SECURITY: Validate input before sending to Supabase
      const validation = safeValidate(loginSchema, { email, password });
      if (validation.success === false) {
        throw new Error(validation.error);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          throw new Error(t('login_error_invalid_password'));
        }
        throw error;
      }

      if (data.user) {
        // First try to find profile by EMAIL (for email-based data linking)
        let profile = null;

        const { data: profileByEmail } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', data.user.email)
          .single();

        if (profileByEmail) {
          profile = profileByEmail;
        } else {
          // Fallback: lookup by user ID (legacy profiles)
          const { data: profileById } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          profile = profileById;
        }

        if (profile) {
          if (profile.is_disabled) {
            await supabase.auth.signOut();
            setError(t('login_error_disabled'));
            return;
          }
          onLogin(profile.account_id, data.user.id, profile.full_name, data.user.email || '');
        } else {
          // No profile found - use email-based account_id for new data
          onLogin('account_' + data.user.email, data.user.id, 'User', data.user.email || '');
        }
      }

    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || t('login_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d3d38] via-[#0f4a44] to-[#134e4a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">

        {/* Lock Icon */}
        <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-8 border border-white/20 shadow-2xl">
          <Lock size={36} className="text-white/90" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
          {t('login_welcome')}
        </h1>
        <p className="text-white/60 text-center mb-10">
          {t('login_subtitle')}
        </p>

        {/* Login Form - Minimal Design */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {/* Email Input */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all text-center"
              placeholder={t('email_placeholder')}
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all text-center"
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
            className="w-full flex items-center justify-center gap-2 bg-white text-[#0f4a44] font-bold py-4 px-6 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-teal-300 border-t-teal-700 rounded-full animate-spin" />
            ) : (
              <>
                <span>{t('login_btn')}</span>
                <ArrowRight size={18} />
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
              className="text-white/50 hover:text-white text-sm font-medium transition-colors"
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
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-white transition-all"
            >
              <Globe size={16} />
              <span className="text-sm">{languages.find(l => l.code === language)?.flag}</span>
              <span className="text-sm font-medium">{languages.find(l => l.code === language)?.name}</span>
            </button>

            {showLanguageMenu && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#0d3d38]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLanguageMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-all ${language === lang.code ? 'bg-teal-600/20 text-teal-400' : 'text-white/80'
                      }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className="font-medium">{lang.name}</span>
                    {language === lang.code && (
                      <svg className="w-4 h-4 ml-auto text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d3d38] border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">{t('reset_password_title')}</h3>
            <p className="text-white/60 text-sm mb-6">
              {t('reset_password_desc')}
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all"
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

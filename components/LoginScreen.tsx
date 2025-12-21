import React, { useState } from 'react';
import { Building2, ArrowRight, AlertCircle, Globe } from 'lucide-react';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabaseClient';


interface LoginScreenProps {
  onLogin: (accountId: string, userId: string, accountName: string) => void;
}

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'uz', name: "O'zbekcha", flag: '🇺🇿' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

// Demo credentials hint
const DEMO_USERS = [
  { phone: '+998901234567', name: 'Dr. Ahmad', accountId: 'account_1' },
  { phone: '+998909876543', name: 'Dr. Mirjalol', accountId: 'account_2' },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { t, language, setLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Register flow disabled/hidden for now as we use Admin Panel for invites,
  // or we update register flow similarly.
  // For now I'll hide the register button or update it to use the new flow if accessible.
  // Given instructions, focusing on Login.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
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
        // Fetch profile to get real name, accountId, etc.
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          if (profile.is_disabled) {
            await supabase.auth.signOut();
            setError(t('login_error_disabled'));
            return;
          }

          console.log('[LoginScreen] Login successful:', {
            accountId: profile.account_id,
            userId: data.user.id,
            name: profile.full_name,
          });

          onLogin(profile.account_id, data.user.id, profile.full_name);
        } else {
          // Fallback if profile missing (shouldn't happen)
          onLogin('unknown', data.user.id, 'User');
        }
      }

    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || t('login_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  // ...

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex flex-col items-center justify-center p-4">
      {/* ... decorations ... */}

      <div className="relative z-10 w-full max-w-md">
        {/* Logo ... */}
        {/* ... */}

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                placeholder="doctor@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                {t('login_password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-900/30"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{t('login_signin')}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>



        {/* Language Selector */}
        <div className="mt-6 flex justify-center">
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white/80 hover:text-white transition-all"
            >
              <Globe size={18} />
              <span>{languages.find(l => l.code === language)?.flag}</span>
              <span className="text-sm font-medium">{languages.find(l => l.code === language)?.name}</span>
              <svg className={`w-4 h-4 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showLanguageMenu && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden">
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
    </div>
  );
};

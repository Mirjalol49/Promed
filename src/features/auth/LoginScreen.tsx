import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock as LockIcon, ArrowRight, AlertCircle, Globe, Mail, KeyRound, Phone, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { auth, functions } from '../../lib/firebase';
import { signInWithCustomToken, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { loginSchema, safeValidate } from '../../lib/validation';
import { useAppSounds } from '../../hooks/useAppSounds';
import { PinInput } from '../../components/ui/PinInput';
import { DashboardLoader } from '../../components/ui/DashboardLoader'; // Changed from DashboardSkeleton
import { useToast } from '../../contexts/ToastContext';
import lockIcon from '../../assets/images/lock.png';

interface LoginScreenProps {
  onLogin: (accountId: string, userId: string, name: string, email: string, password?: string, role?: string) => void;
}

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'uz', name: "O'zbekcha", flag: '🇺🇿' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { t, language, setLanguage } = useLanguage();
  const { playUnlock, playError } = useAppSounds();
  const { success, error: showError } = useToast();

  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone');
  const [loginStep, setLoginStep] = useState<'phone_entry' | 'otp_verify'>('phone_entry');

  const [email, setEmail] = useState('');
  const [pinCode, setPinCode] = useState(['', '', '', '', '', '']);

  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('+998');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false); // Controls the Loader

  // Forgot Password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetMessage('');

    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/?mode=resetPassword`,
        handleCodeInApp: true
      };

      await sendPasswordResetEmail(auth, resetEmail, actionCodeSettings);

      success(
        t('magic_link_sent') || 'Email Sent!',
        t('magic_link_desc') || 'Check your inbox for the reset link.'
      );

      setResetMessage(t('magic_link_sent') || 'Password reset link sent! Check your email.');

      setTimeout(() => {
        setShowForgotPassword(false);
        setResetMessage('');
        setResetEmail('');
      }, 5000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      let errorMsg = 'Failed to send reset link';
      if (err.code === 'auth/user-not-found') errorMsg = t('email_not_found') || 'Email not found.';
      else if (err.code === 'auth/invalid-email') errorMsg = t('invalid_email') || 'Invalid email.';
      else errorMsg = err.message || errorMsg;

      setResetError(errorMsg);
      showError(t('error'), errorMsg);

    } finally {
      setResetLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    let digits = raw;

    if (!digits.startsWith('998')) {
      if (digits.length < 3) {
        digits = '998';
      } else {
        if (!digits.startsWith('998')) digits = '998';
      }
    }

    const numberPart = digits.substring(3).slice(0, 9);
    let formatted = '+998';
    if (numberPart.length > 0) formatted += ' ' + numberPart.slice(0, 2);
    if (numberPart.length > 2) formatted += ' ' + numberPart.slice(2, 5);
    if (numberPart.length > 5) formatted += ' ' + numberPart.slice(5, 7);
    if (numberPart.length > 7) formatted += ' ' + numberPart.slice(7, 9);

    setPhone(formatted);
  };

  const handlePhonePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setError('');
    setLoading(true);
    // REMOVED Optimistic loading to prevent glitched view. Only loading spinner on button first.

    try {
      if (phone.includes('@')) {
        const password = pinCode.join('');
        const userCredential = await signInWithEmailAndPassword(auth, phone, password);
        await handleLoginSuccess(userCredential.user);
        return;
      }

      const cleanPhone = phone.replace(/\+/g, '').replace(/\s/g, '');
      const proxyEmail = `${cleanPhone}@promed.sys`;
      const password = pinCode.join('');

      const userCredential = await signInWithEmailAndPassword(auth, proxyEmail, password);
      await handleLoginSuccess(userCredential.user);
    } catch (err: any) {
      console.error("Login Error:", err);
      setPinCode(['', '', '', '', '', '']);
      setShake(true);
      playError();

      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError(t('login_error_invalid_password') || "Telefon raqam yoki parol noto'g'ri");
      } else {
        setError(err.message || t('login_error_generic'));
      }
      setTimeout(() => setShake(false), 500);
      setLoading(false);
      // No skeleton to hide since we didn't show it
    }
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const requestOtpFn = httpsCallable(functions, 'requestOtp');
      await requestOtpFn({ phoneNumber: phone });
      setLoginStep('otp_verify');
    } catch (err: any) {
      console.error("OTP Request Error:", err);
      let msg = err.message || "Failed to send code.";

      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('telegram')) {
        msg = "User not found or Telegram not linked. Opening Bot...";
        window.open('https://t.me/graft_code_bot', '_blank');
      }

      setError(msg);
      setShake(true);
      playError();
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setLoading(true);
    setError('');

    try {
      const verifyOtpFn = httpsCallable(functions, 'verifyOtp');
      const result = await verifyOtpFn({ phoneNumber: phone, code });
      const { token } = result.data as any;

      const userCredential = await signInWithCustomToken(auth, token);
      await handleLoginSuccess(userCredential.user);
    } catch (err: any) {
      console.error("OTP Verify Error:", err);
      setError("Invalid Code. Please try again.");
      setShake(true);
      playError();
      setOtp(['', '', '', '', '', '']);
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShake(false);
    setLoading(true);

    try {
      const password = pinCode.join('');
      const validation = safeValidate(loginSchema, { email, password });
      if (validation.success === false) throw new Error(validation.error);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleLoginSuccess(userCredential.user);

    } catch (err: any) {
      console.error('Login error:', err);
      setShake(true);
      playError();
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError(t('login_error_invalid_password'));
      } else {
        setError(err.message || t('login_error_generic'));
      }
      setTimeout(() => setShake(false), 500);
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (user: any) => {
    // 🔥 SHOW SPLASH LOADER NOW
    setShowSkeleton(true);

    // 🛡️ SECURITY CHECK
    const { db } = await import('../../lib/firebase');
    const { doc, getDoc } = await import('firebase/firestore');

    let profileData: any = {};
    let profileDoc = await getDoc(doc(db, 'profiles', user.uid));

    if (!profileDoc.exists()) {
      profileDoc = await getDoc(doc(db, 'users', user.uid));
    }

    if (profileDoc.exists()) {
      profileData = profileDoc.data();
      if (profileData.status === 'banned' || profileData.status === 'frozen') {
        const msg = profileData.status === 'banned' ? t('login_banned_msg') : t('login_frozen_msg');
        setError(msg);
        setShake(true);
        playError();
        const { signOut } = await import('firebase/auth');
        await signOut(auth);

        setShowSkeleton(false);
        setLoading(false);
        return;
      }
    }

    playUnlock();
    // Short delay to let the unlock sound start before unmounting, but UI shows loader
    setTimeout(() => {
      const targetRole = profileData.role || 'doctor';
      const isPrimaryTenant = targetRole === 'admin' || targetRole === 'doctor';

      // CRITICAL FIX: Primary tenants (Owners) MUST ONLY be tied to their own UIDs.
      // This enforces isolation across clinics even if browser localStorage is contaminated.
      let targetAccountId = profileData.account_id || profileData.accountId;
      if (isPrimaryTenant) {
        targetAccountId = 'account_' + user.uid;
      } else if (!targetAccountId) {
        // Fallback legacy behavior
        targetAccountId = 'account_' + user.uid;
      }

      console.log("🔐 Login Success: Target Tenant =", targetAccountId);

      onLogin(
        targetAccountId,
        user.uid,
        profileData.fullName || user.displayName || 'User',
        profileData.email || user.email || '',
        loginMode === 'email' ? pinCode.join('') : '',
        targetRole
      );
    }, 100);
  };

  if (showSkeleton) {
    // This is now the "Loading Effect" (Spinner/Mascot) instead of the Skeleton Structure
    return <DashboardLoader />;
  }

  return (
    <div className="min-h-screen bg-promed-deep flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-white/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Language Selector */}
      <div className="absolute top-6 right-6 z-50">
        <div className="relative">
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/10 rounded-xl text-white hover:bg-white/20 shadow-sm transition-all backdrop-blur-sm"
          >
            <span className="text-lg">{languages.find(l => l.code === language)?.flag}</span>
            <span className="text-sm font-bold">{languages.find(l => l.code === language)?.name}</span>
          </button>

          {showLanguageMenu && (
            <div className="absolute top-full right-0 mt-2 w-40 bg-promed-dark/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setShowLanguageMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-all ${language === lang.code ? 'bg-white/20 text-white' : 'text-white/80'}`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="font-medium text-sm">{lang.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <div className="relative mb-8 flex items-center justify-center">
          <div className="flex items-center justify-center animate-float">
            <img src={lockIcon} alt="Security Lock" className="w-24 h-24 md:w-32 md:h-32 object-contain relative z-10" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-6 tracking-wider">{t('login_welcome')}</h1>

        <div className="w-full space-y-4">
          {loginStep === 'phone_entry' && (
            <form onSubmit={handlePhonePasswordLogin} className="space-y-6">
              <div className="relative group">
                <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center text-promed-muted/40 group-focus-within:text-promed-primary transition-colors">
                  <Phone size={22} className="opacity-70" />
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={handlePhoneChange}
                  className={`w-full pl-14 pr-4 py-5 bg-white border-2 rounded-2xl text-promed-text placeholder-promed-muted/30 focus:outline-none transition-all text-left font-bold text-lg shadow-sm ${shake ? 'border-rose-500 shake focus:ring-4 focus:ring-rose-200' : 'border-white focus:border-promed-primary focus:ring-4 focus:ring-promed-primary/10'}`}
                  placeholder={t('phone_label') || "+998"}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-white/60 text-sm font-medium uppercase tracking-widest">{t('enter_password')}</p>
                </div>
                <PinInput
                  value={pinCode}
                  onChange={setPinCode}
                  error={shake}
                  autoFocus={false}
                />
                <div className="h-4" />
              </div>

              <button type="submit" disabled={loading} className="btn-glossy-blue group w-full py-4 rounded-2xl text-lg shadow-xl shadow-blue-500/20 active:scale-95 transition-all mt-4">
                {loading ? (
                  <div className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  <span>{t('login_btn')}</span>
                )}
              </button>

              {error && (
                <div className="mt-4 p-4 rounded-2xl bg-red-500/20 border border-red-500/30 backdrop-blur-md flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-2 shadow-lg shadow-red-900/20">
                  <AlertCircle className="w-5 h-5 text-red-200 shrink-0" />
                  <p className="text-white font-medium text-sm text-center drop-shadow-sm">{error}</p>
                </div>
              )}
            </form>
          )}

          {/* OTP and Email views omitted for brevity as phone is primary, but logic is handled if needed (using phone_entry only as requested) */}
        </div>
      </div>
    </div>
  );
};

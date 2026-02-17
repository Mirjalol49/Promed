import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock as LockIcon, ArrowRight, AlertCircle, Globe, Mail, KeyRound, Phone, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { auth, functions } from '../../lib/firebase'; // Added functions
import { signInWithCustomToken, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions'; // For calling OTP functions
import { loginSchema, safeValidate } from '../../lib/validation';
import { useAppSounds } from '../../hooks/useAppSounds';
import { PinInput } from '../../components/ui/PinInput'; // Import PinInput
import { DashboardSkeleton } from '../../components/skeletons/DashboardSkeleton'; // Import Skeleton

import { useToast } from '../../contexts/ToastContext';
import lockIcon from '../../assets/images/lock.png';
import happyIcon from '../../components/mascot/happy_mascot.png';
// import keyIcon from '../../assets/images/key.png';


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

  // Login Mode: 'phone' | 'email' (Email kept as fallback or specific use case)
  // For now we default to 'phone' as per request
  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone');
  const [loginStep, setLoginStep] = useState<'phone_entry' | 'otp_verify'>('phone_entry');

  // Input State
  const [email, setEmail] = useState('');
  // const [password, setPassword] = useState(''); // REPLACED BY PIN CODE
  const [pinCode, setPinCode] = useState(['', '', '', '', '', '']);

  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('+998');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false); // 🔥 Instant Entry State

  // Forgot Password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  // Smart Recovery State
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Handle forgot password - Send Magic Link
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetMessage('');

    try {
      console.log('Attempting to send reset email to:', resetEmail);

      // Construct URL to this app
      const actionCodeSettings = {
        url: `${window.location.origin}/?mode=resetPassword`,
        handleCodeInApp: true
      };

      await sendPasswordResetEmail(auth, resetEmail, actionCodeSettings);

      console.log('Reset email sent successfully');

      success(
        t('magic_link_sent') || 'Email Sent!',
        t('magic_link_desc') || 'Check your inbox for the reset link.',
        happyIcon
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

  // --- PHONE OTP HANDLERS ---
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    let core = raw;
    // If they kept the prefix '998', strip it to get the core number
    if (raw.startsWith('998')) {
      core = raw.substring(3);
    } else if (raw.length < 3) {
      // If they deleted part of the prefix, just reset the core (or keep what's left as accidental input? No, safer to reset if they are attacking the prefix)
      // Better UX: If they delete '8' of '998', we just restore '998' and keep the rest of the number?
      // Let's rely on the substring(3) approach but handle shorter lengths
      core = '';
    } else {
      // If they modified the prefix (e.g. 997...), treat 3rd char onwards as core
      // This is complex. Let's just assume we strictly enforce 998 context.
      // If it doesnt start with 998, we probably just want to reset to +998 for safety or take the last chars.
      // Simple approach:
      core = '';
    }

    // Capture "clean" core of digits (ignoring prefix abuse)
    // Actually, let's use a simpler logic: always strip non-digits. If the result doesn't start with 998, PREPEND 998?
    // User types "1" -> "1" -> core "1". Prepend 998 -> "9981". Formatted "+998 1".
    // User backspaces "8" -> "99". Prepend 998 -> "99899". Formatted "+998 99".
    // User deletes all -> "". Prepend 998 -> "998". Formatted "+998".

    // Let's refine:
    let digits = e.target.value.replace(/\D/g, '');

    // If the valid prefix '998' is missing/damaged, we essentially reset or we try to salvage?
    // Current input is "+998 ...". If they delete, they get "+99 ...". Digits "99...".
    // We want to force it back to "+998 ...". 
    // So we just take whatever is AFTER the prefix zone.
    if (!digits.startsWith('998')) {
      // They messed with prefix.
      // Let's just assume the whole thing is the number they wanted to type?
      // No, standard is non-deletable.
      // Let's simply ignore the change if it removes the prefix digits?
      // No, that feels buggy.
      // Let's just recover.
      if (digits.length < 3) {
        digits = '998'; // Reset
      } else {
        // Example: 99123... (deleted 8) -> Restore 998, keep 123...
        // This is hard to guess.
        // Simplest: Just take the substring(3) if valid, else empty.
        if (!digits.startsWith('998')) digits = '998';
      }
    }

    // Now we definitely have '998...'
    const numberPart = digits.substring(3).slice(0, 9); // Max 9 digits

    let formatted = '+998';
    if (numberPart.length > 0) formatted += ' ' + numberPart.slice(0, 2);
    if (numberPart.length > 2) formatted += ' ' + numberPart.slice(2, 5);
    if (numberPart.length > 5) formatted += ' ' + numberPart.slice(5, 7);
    if (numberPart.length > 7) formatted += ' ' + numberPart.slice(7, 9);

    setPhone(formatted);
  };

  // --- LOGIN HANDLERS ---

  const handlePhonePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setError('');
    setLoading(true);
    setShowSkeleton(true); // Optimistic: Show Skeleton immediately

    try {
      // 1. Check if input is an email (Legacy Login)
      if (phone.includes('@')) {
        const password = pinCode.join('');
        const userCredential = await signInWithEmailAndPassword(auth, phone, password);
        await handleLoginSuccess(userCredential.user);
        return;
      }

      // 2. Phone Login Logic
      // Construct proxy email from phone
      const cleanPhone = phone.replace(/\+/g, '').replace(/\s/g, '');
      const proxyEmail = `${cleanPhone}@promed.sys`;
      const password = pinCode.join('');

      const userCredential = await signInWithEmailAndPassword(auth, proxyEmail, password);
      await handleLoginSuccess(userCredential.user);
    } catch (err: any) {
      console.error("Login Error:", err);
      // Clear PIN on error
      setPinCode(['', '', '', '', '', '']);

      setShake(true);
      playError();
      // Logic for failed attempts/recovery modal removed by user request
      // const newAttempts = failedAttempts + 1;
      // setFailedAttempts(newAttempts);
      // if (newAttempts >= 3) {
      //   setShowRecoveryModal(true);
      // }

      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        const cleanPhoneDebug = phone.replace(/\+/g, '').replace(/\s/g, '');
        const proxyEmailDebug = `${cleanPhoneDebug}@promed.sys`;
        const debugMsg = t('login_error_invalid_password');
        // DEBUG: Show what we tried
        // DEBUG: Show what we tried
        setError(`${debugMsg} (Trying: ${proxyEmailDebug})`);
      } else {
        setError(err.message || t('login_error_generic'));
      }
      setTimeout(() => setShake(false), 500);
      setLoading(false);
      setShowSkeleton(false);
    } finally {
      // setLoading(false); // REMOVED: Keep loading true on success to transition to Skeleton
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

      // Smart detection for unlinked/missing accounts
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('telegram')) {
        msg = "User not found or Telegram not linked. Opening Bot...";
        // Auto-redirect to bot as requested
        window.open('https://t.me/graft_code_bot', '_blank');
      }

      setError(msg);
      setShake(true);
      playError();
      setLoading(false);
    } finally {
      // setLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setLoading(true);
    setShowSkeleton(true); // Optimistic: Show Skeleton immediately
    setError('');

    try {
      const verifyOtpFn = httpsCallable(functions, 'verifyOtp');
      const result = await verifyOtpFn({ phoneNumber: phone, code });
      const { token } = result.data as any;

      // Sign in with the custom token
      const userCredential = await signInWithCustomToken(auth, token);
      const user = userCredential.user;

      // Proceed to login success logic
      await handleLoginSuccess(user);
    } catch (err: any) {
      console.error("OTP Verify Error:", err);
      setError("Invalid Code. Please try again.");
      setShake(true);
      playError();
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      setLoading(false);
      setShowSkeleton(false);
    } finally {
      // setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShake(false);
    setError('');
    setShake(false);
    setLoading(true);
    setShowSkeleton(true); // Optimistic: Show Skeleton immediately

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
      setShowSkeleton(false);
    } finally {
      // setLoading(false);
    }
  };

  const handleLoginSuccess = async (user: any) => {
    // 🔥 INSTANT ENTRY: Show Skeleton immediately while checking profile
    setShowSkeleton(true);

    // 🛡️ SECURITY: Check account status in Firestore
    const { db } = await import('../../lib/firebase');
    const { doc, getDoc } = await import('firebase/firestore');

    let profileData: any = {};

    // Try 'profiles' first (Staff/Admins usually have this)
    let profileDoc = await getDoc(doc(db, 'profiles', user.uid));

    if (!profileDoc.exists()) {
      // Fallback to 'users' if mostly backend managed
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

        // Disable Skeleton and return to login
        setShowSkeleton(false);
        setLoading(false);
        return; // Stop here
      }
    }

    playUnlock();
    setTimeout(() => {
      // Determines the correct Account ID
      // If the user is a sub-user (viewer/seller), they MUST use the accountId from their profile.
      // If they are a main doctor/admin, their accountId is usually based on their email/uid.
      const targetAccountId = profileData.accountId || ('account_' + (user.email || user.uid));
      const targetRole = profileData.role || 'doctor';

      onLogin(
        targetAccountId,
        user.uid,
        profileData.fullName || user.displayName || 'User',
        profileData.email || user.email || '',
        loginMode === 'email' ? pinCode.join('') : '', // Use pinCode.join('')
        targetRole
      );
    }, 100);
  };

  if (showSkeleton) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-promed-deep flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-white/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Language Selector (Top Right) */}
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
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-all ${language === lang.code ? 'bg-white/20 text-white' : 'text-white/80'
                    }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="font-medium text-sm">{lang.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">

        {/* Lock Icon */}
        <div className="relative mb-8 flex items-center justify-center">
          <div className="flex items-center justify-center animate-float">
            <img src={lockIcon} alt="Security Lock" className="w-24 h-24 md:w-32 md:h-32 object-contain relative z-10" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-6 tracking-wider">{t('login_welcome')}</h1>

        {/* Login Form */}
        <div className="w-full space-y-4">

          {/* Main Login Flow: Phone + Password */}
          {loginStep === 'phone_entry' && (
            <form onSubmit={handlePhonePasswordLogin} className="space-y-6">

              {/* Phone Input */}
              <div className="relative group">
                <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center text-promed-muted/40 group-focus-within:text-promed-primary transition-colors">
                  <Phone size={22} className="opacity-70" />
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={handlePhoneChange}
                  className={`w-full pl-14 pr-4 py-5 bg-white border-2 rounded-2xl text-promed-text placeholder-promed-muted/30 focus:outline-none transition-all text-left font-bold text-lg shadow-sm
                                         ${shake ? 'border-rose-500 shake focus:ring-4 focus:ring-rose-200' : 'border-white focus:border-promed-primary focus:ring-4 focus:ring-promed-primary/10'}
                                    `}
                  placeholder={t('phone_label') || "+998"}
                  required
                  autoFocus
                />
              </div>

              {/* Password Input (PIN Style) */}
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

                {/* Forgot Password Link - REMOVED */}
                <div className="h-4" /> {/* Spacer */}
              </div>

              {/* Login Button */}
              <button type="submit" disabled={loading} className="btn-glossy-blue group w-full py-4 rounded-2xl text-lg shadow-xl shadow-blue-500/20 active:scale-95 transition-all mt-4">
                {loading ? (
                  <div className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  <span>{t('login_btn')}</span>
                )}
              </button>



              {/* Telegram Link Fallback - Shows only on specific error */}

            </form>
          )}

          {/* OTP Verification Step */}

        </div>

        {/* Smart Recovery Modal (After 3 failed attempts) */}
        {/* Smart Recovery Modal REMOVED by user request */}
      </div >
    </div >
  );
};

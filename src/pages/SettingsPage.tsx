
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Lock, Mail, User, LogOut, Shield, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAccount } from '../contexts/AccountContext';
import { ProfileAvatar } from '../components/layout/ProfileAvatar';
import { useImageUpload } from '../hooks/useImageUpload'; // Correct import
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, getAuth } from 'firebase/auth';
import happyIcon from '../components/mascot/happy_mascot.png';

interface SettingsPageProps {
    userId: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ userId }) => {
    const { t, language, setLanguage } = useLanguage();
    const { success, error: showError } = useToast();
    const { accountName, userEmail, userImage, logout, refreshProfile } = useAccount();
    const auth = getAuth();

    const [nameInput, setNameInput] = useState(accountName);
    const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
    const [currentPinDigits, setCurrentPinDigits] = useState(['', '', '', '', '', '']);
    const [showCurrentPin, setShowCurrentPin] = useState(false);
    const [showNewPin, setShowNewPin] = useState(false);
    const [useLongPassword, setUseLongPassword] = useState(false);
    const [useLongNewPin, setUseLongNewPin] = useState(false);
    const [longPasswordInput, setLongPasswordInput] = useState('');
    const [longNewPinInput, setLongNewPinInput] = useState('');
    const [loading, setLoading] = useState(false);
    const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
    const currentPinRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(userImage || null);
    const [lockEnabled, setLockEnabled] = useState(false);

    // Correct hook usage matching usage in EditProfileModal
    const {
        previewUrl,
        uploading: imageUploading,
        handleImageSelect
    } = useImageUpload({
        pathPrefix: `avatars/${userId}`,
        onUploadComplete: (url) => {
            setUploadedAvatarUrl(url);
            success(t('photo_added_title') || 'Photo Updated', t('toast_photo_added') || 'Profile photo uploaded successfully');
        },
        onUploadError: (err) => {
            showError(t('toast_error_title'), t('toast_upload_failed'));
        }
    });

    useEffect(() => {
        setNameInput(accountName);
    }, [accountName]);

    // Keep uploadedAvatarUrl in sync with global userImage if it's currently null or refreshing
    useEffect(() => {
        if (userImage && !uploadedAvatarUrl) {
            setUploadedAvatarUrl(userImage);
        }
    }, [userImage, uploadedAvatarUrl]);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!userId) return;
            try {
                const { db } = await import('../lib/firebase');
                const { doc, getDoc } = await import('firebase/firestore');
                const snap = await getDoc(doc(db, 'profiles', userId));
                if (snap.exists()) {
                    const data = snap.data();
                    const password = data.lock_password || data.lockPassword;

                    if (data.lock_enabled !== undefined) setLockEnabled(data.lock_enabled);

                    // Pull profile image/avatar
                    const profileImg = data.profile_image || data.avatar_url || data.profileImage;
                    if (profileImg) setUploadedAvatarUrl(profileImg);

                    if (password) {
                        const isPin = /^\d{6}$/.test(password);
                        if (isPin) {
                            setCurrentPinDigits(password.split(''));
                            setUseLongPassword(false);
                        } else {
                            setLongPasswordInput(password);
                            setUseLongPassword(true);
                        }
                    }
                }
            } catch (e) {
                console.error("Fetch settings error:", e);
            }
        };
        fetchSettings();
    }, [userId]);

    const handleSave = async () => {
        setLoading(true);
        try {
            console.log("🚀 SettingsPage: Starting handleSave...");
            // 1. Re-authenticate if PIN change is requested
            const newPin = useLongNewPin ? longNewPinInput : pinDigits.join('');
            const currentPin = pinDigits.join(''); // legacy, not used for re-auth if useLongPassword
            const user = auth.currentUser;

            console.log("🛠️ Sync Diagnostics:", {
                hasNewPin: !!newPin,
                newPinLength: newPin.length,
                isLongNewPin: useLongNewPin,
                hasCurrentUser: !!user,
                userEmail: user?.email
            });

            if (newPin && user && user.email) {
                // Minimum password length check (Firebase requirement usually 6)
                if (newPin.length < 6) {
                    showError(t('toast_error_title'), "Parol kamida 6 ta belgidan iborat bo'lishi kerak");
                    setLoading(false);
                    return;
                }

                const reauthPassword = useLongPassword ? longPasswordInput : currentPinDigits.join('');

                if (!reauthPassword) {
                    showError(t('toast_error_title'), useLongPassword ? "Davom etish uchun hisob parolini kiriting" : "Davom etish uchun amaldagi PIN kodni kiriting");
                    setLoading(false);
                    return;
                }

                console.log("🔐 Re-authenticating for password sync...");
                const credential = EmailAuthProvider.credential(user.email, reauthPassword);
                await reauthenticateWithCredential(user, credential);
                console.log("✅ Re-authentication successful");

                // Update Auth Password (the PIN)
                await updatePassword(user, newPin);
                console.log("✅ Auth Password updated to new PIN");
            }

            // 2. Update Firestore Profile
            const { updateUserProfile } = await import('../lib/userService');
            const updates: any = {
                fullName: nameInput,
                lockEnabled: lockEnabled
            };
            if (uploadedAvatarUrl) {
                updates.profileImage = uploadedAvatarUrl;
            }
            if (newPin) {
                updates.lockPassword = newPin;
            }

            await updateUserProfile(userId, updates);

            // 3. Finalize
            if (newPin) {
                success(t('toast_success_title'), "Parol va PIN muvaffaqiyatli sinxronlandi! (Universal)", happyIcon);
                setPinDigits(['', '', '', '', '', '']);
                setCurrentPinDigits(['', '', '', '', '', '']);

                // Optional: Logout or refresh
                setTimeout(() => {
                    logout(); // User requested to "sync it with log in password", suggesting a full update
                }, 2000);
            } else {
                success(t('toast_success_title'), t('profile_updated_msg'), happyIcon);
            }

            refreshProfile();
        } catch (err: any) {
            console.error(err);
            let msg = err.message;
            if (err.code === 'auth/wrong-password') {
                msg = "Joriy hisob paroli noto'g'ri";
            }
            showError('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">


            {/* Profile Section (Inline) */}
            <div className="bg-white rounded-2xl p-6  border border-gray-100">
                <div className="flex flex-col items-center mb-8">
                    <div className="relative group/avatar cursor-pointer" onClick={() => document.getElementById('file-upload-settings')?.click()}>
                        {/* Main Avatar Container */}
                        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white relative bg-slate-100 transition-all duration-300 group-hover/avatar:ring-4 group-hover/avatar:ring-promed-primary/20">
                            {/* Show Preview if exists, else ProfileAvatar */}
                            {previewUrl ? (
                                <img src={previewUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-110" alt="Preview" />
                            ) : (
                                <ProfileAvatar src={uploadedAvatarUrl} alt={accountName || 'User'} size={112} className="w-full h-full transition-transform duration-500 group-hover/avatar:scale-110" fallbackType='user' />
                            )}

                            {/* Hover Overlay: Central Camera Icon - Added z-30 to ensure it's on top */}
                            <div className="absolute inset-0 z-30 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
                                <Camera className="text-white w-10 h-10 transform scale-75 group-hover/avatar:scale-100 transition-all duration-300" />
                            </div>
                        </div>

                        {/* Side Badge */}
                        <div className="absolute bottom-1 right-1 z-40 bg-promed-primary p-2.5 rounded-full border-2 border-white text-white transform transition-all duration-300 group-hover/avatar:scale-110 group-hover/avatar:rotate-12">
                            <Camera size={18} fill="currentColor" fillOpacity={0.2} />
                        </div>
                    </div>

                    <button
                        onClick={() => document.getElementById('file-upload-settings')?.click()}
                        className="mt-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-promed-primary transition-colors flex items-center gap-2"
                    >
                        {t('upload_photo') || "Rasm yuklash"}
                    </button>

                    <input
                        id="file-upload-settings"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageSelect}
                    />
                    {imageUploading && <p className="text-xs text-promed-primary mt-2 animate-pulse font-bold uppercase tracking-tighter">Protocol: Uploading...</p>}
                </div>

                <div className="space-y-6">
                    {/* Language */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t('language')}</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['en', 'uz', 'ru'].map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => setLanguage(lang as any)}
                                    className={`py-2 px-4 rounded-xl text-sm font-bold border transition-all ${language === lang
                                        ? 'bg-promed-primary text-white border-promed-primary '
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {lang === 'en' ? 'English' : lang === 'uz' ? "O'zbek" : 'Русский'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Full Name */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t('full_name')}</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-promed-primary/20 focus:border-promed-primary outline-none transition-all font-medium text-gray-800"
                            />
                        </div>
                    </div>

                    {/* Email Display (Read-Only) */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t('email') || "Email Adres"}</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <Mail size={18} />
                            </div>
                            <input
                                type="text"
                                value={userEmail || ''}
                                readOnly
                                disabled
                                className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl font-medium text-gray-500 cursor-not-allowed select-none"
                            />
                        </div>
                    </div>

                    {/* Security - Moved Above PIN Fields */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t('security')}</label>
                        <div className="bg-blue-50/50 p-5 rounded-[24px] border border-blue-100 flex items-center justify-between mb-8 group/security transition-all hover:bg-blue-50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl text-promed-primary  border border-promed-primary/10 group-hover/security:scale-110 transition-transform">
                                    <Shield size={22} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-[14px]">{t('enable_lock')}</h4>
                                    <p className="text-xs text-slate-500 font-medium">{t('lock_hint')}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setLockEnabled(!lockEnabled)}
                                className={`w-14 h-7 rounded-full transition-all duration-300 relative focus:outline-none flex-shrink-0 ${lockEnabled ? 'bg-promed-primary ' : 'bg-slate-200 '}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${lockEnabled ? 'left-8' : 'left-1'}`} />
                            </button>
                        </div>

                        {/* Current PIN (Required for Sync) */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                                    {t('current_password') || "Joriy Parol"}
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPin(!showCurrentPin)}
                                        className="flex items-center gap-2 text-[10px] font-black text-promed-primary uppercase tracking-widest hover:bg-promed-light px-3 py-1.5 rounded-lg transition-all"
                                    >
                                        {showCurrentPin ? <EyeOff size={14} /> : <Eye size={14} />}
                                        <span>{showCurrentPin ? t('hide') : t('show')}</span>
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-2 sm:gap-3 justify-start">
                                {currentPinDigits.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => { currentPinRefs.current[idx] = el; }}
                                        type={showCurrentPin ? "text" : "password"}
                                        inputMode="numeric"
                                        pattern="\d*"
                                        value={digit}
                                        onChange={(e) => {
                                            const fullVal = e.target.value;
                                            const val = fullVal.slice(-1); // Take the latest character
                                            if (!/^\d*$/.test(val)) return;

                                            const newCurrent = [...currentPinDigits];
                                            newCurrent[idx] = val;
                                            setCurrentPinDigits(newCurrent);

                                            if (val && idx < 5) {
                                                currentPinRefs.current[idx + 1]?.focus();
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Backspace' && !currentPinDigits[idx] && idx > 0) {
                                                currentPinRefs.current[idx - 1]?.focus();
                                            }
                                        }}
                                        autoComplete="off"
                                        className={`w-10 h-10 sm:w-12 sm:h-12 bg-white border
                                                ${digit ? 'border-promed-primary ring-2 ring-promed-primary/10 shadow-sm' : 'border-slate-200'}
                                                rounded-xl text-center text-lg font-bold text-slate-900 transition-all duration-200
                                                focus:outline-none focus:border-promed-primary focus:ring-4 focus:ring-promed-primary/10
                                                placeholder:text-slate-300`}
                                        placeholder="•"
                                        maxLength={1}
                                    />
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* 6-Digit PIN Boxes (New PIN) */}
                    <div className="pt-2">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{t('new_password')}</label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNewPin(!showNewPin)}
                                    className="flex items-center gap-2 text-[10px] font-black text-promed-primary uppercase tracking-widest hover:bg-promed-light px-3 py-1.5 rounded-lg transition-all"
                                >
                                    {showNewPin ? <EyeOff size={14} /> : <Eye size={14} />}
                                    <span>{showNewPin ? t('hide') : t('show')}</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2 sm:gap-3 justify-start">
                            {pinDigits.map((digit, idx) => (
                                <input
                                    key={idx}
                                    ref={el => { pinRefs.current[idx] = el; }}
                                    type={showNewPin ? "text" : "password"}
                                    inputMode="numeric"
                                    pattern="\d*"
                                    value={digit}
                                    onChange={(e) => {
                                        const fullVal = e.target.value;
                                        const val = fullVal.slice(-1); // Take the latest digit
                                        if (!/^\d*$/.test(val)) return;

                                        const newPin = [...pinDigits];
                                        newPin[idx] = val;
                                        setPinDigits(newPin);

                                        if (val && idx < 5) {
                                            pinRefs.current[idx + 1]?.focus();
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Backspace' && !pinDigits[idx] && idx > 0) {
                                            pinRefs.current[idx - 1]?.focus();
                                        }
                                    }}
                                    autoComplete="off"
                                    className={`w-10 h-10 sm:w-12 sm:h-12 bg-white border
                                        ${digit ? 'border-promed-primary ring-2 ring-promed-primary/10 shadow-sm' : 'border-slate-200'}
                                        rounded-xl text-center text-lg font-bold text-slate-900 transition-all duration-200
                                        focus:outline-none focus:border-promed-primary focus:ring-4 focus:ring-promed-primary/10
                                        placeholder:text-slate-300`}
                                    placeholder="•"
                                    maxLength={1}
                                />
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-3 font-medium tracking-wide">{t('password_hint')}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                    <button
                        onClick={logout}
                        className="px-6 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition flex items-center gap-2"
                    >
                        <LogOut size={18} />
                        {t('logout')}
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={loading || imageUploading}
                        className="btn-premium-blue disabled:opacity-70"
                    >
                        <span>{loading ? t('saving') : t('save')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

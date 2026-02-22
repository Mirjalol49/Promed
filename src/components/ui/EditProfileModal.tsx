import React, { useState, useEffect } from 'react';
import {
    X,

    Eye,
    EyeOff,
    Lock,
    Save,
    Loader2,
    AlertCircle,
    LogOut,
    ChevronDown,
    Globe,
    Check,
    Mail,
    Volume2,
    VolumeX
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSettings } from '../../contexts/SettingsContext';
import { ProfileAvatar } from '../layout/ProfileAvatar';
import ConfirmationModal from './ConfirmationModal';
import { auth } from '../../lib/firebase';
import { updatePassword } from 'firebase/auth';
import { useToast } from '../../contexts/ToastContext';
import { compressImage } from '../../lib/imageOptimizer';
import { uploadAvatar, setOptimisticImage } from '../../lib/imageService';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useImageUpload } from '../../hooks/useImageUpload';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageUploadingOverlay } from './ImageUploadingOverlay';

import lockIcon from '../../assets/images/lock.png';
import cameraIcon from '../../assets/images/camera_icon.png';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLockEnabled: boolean;
    onToggleLock: (enabled: boolean) => void;
    userPassword: string;
    userImage: string;
    userEmail: string;
    onUpdateProfile: (data: { name: string; image?: File | string; password?: string }) => Promise<void>;
    userId: string;
    userName: string;
    onLogout: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
    isOpen,
    onClose,
    isLockEnabled,
    onToggleLock,
    userPassword,
    onUpdateProfile,
    userImage,
    userEmail,
    userId: propUserId,
    userName,
    onLogout
}) => {
    const { t, language, setLanguage } = useLanguage();
    const { soundEnabled, toggleSound } = useSettings();

    const languages = [
        { code: 'en', label: 'English' },
        { code: 'uz', label: "O'zbek" },
        { code: 'ru', label: 'Русский' }
    ];
    const { success, error: showError } = useToast();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [profileImage, setProfileImage] = useState<string>(userImage);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Local state for inputs
    const [nameInput, setNameInput] = useState(userName);
    const [currentPassInput, setCurrentPassInput] = useState(userPassword);
    const [pin, setPin] = useState(['', '', '', '', '', '']);
    const [isSaving, setIsSaving] = useState(false);

    const pinRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    // Use the new hook
    const {
        previewUrl,
        uploading: isUploading,
        progress: uploadProgress,
        handleImageSelect: onImageSelect,
        uploadedUrl: newAvatarUrl,
        reset: resetUpload
    } = useImageUpload({
        bucketName: 'promed-images',
        pathPrefix: `avatars/${propUserId}`, // Dynamic path
        onUploadComplete: (url) => {
            setProfileImage(url);
            // 🔥 Global Optimistic Update: Update sidebar/header instantly
            setOptimisticImage(`${propUserId}_profile`, url);
            success(t('photo_added_title'), t('toast_photo_added'));
        },
        onUploadError: (err) => {
            console.error("Hook Upload Error:", err);
            showError(t('toast_error_title'), t('toast_upload_failed'));
        }
    });

    const handlePinChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;

        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        if (value && index < 5) {
            pinRefs.current[index + 1]?.focus();
        }
    };

    const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            pinRefs.current[index - 1]?.focus();
        }
    };

    // Sync with global state when modal opens
    useEffect(() => {
        if (isOpen) {
            setNameInput(userName);
            setCurrentPassInput(userPassword);
            setProfileImage(userImage);
            setSelectedFile(null);
            setPin(['', '', '', '', '', '']);
            resetUpload(); // Reset hook state
        }
    }, [isOpen, userPassword, userImage, userName, resetUpload]);

    // Lock scroll when modal is open
    useScrollLock(isOpen);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        onImageSelect(e);
    };

    // ROBUST SAVE LOGIC (MATCH PATIENT LOGIC 100%)
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. FRESH AUTH CHECK
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error("No active session - please log out and log back in.");
            }
            const activeUserId = currentUser.uid;
            let finalAvatarUrl = profileImage;

            console.log("✓ Session verified for user:", activeUserId);

            // 2. UPDATE PASSWORD (Auth API)
            const newPinValue = pin.join('');
            if (newPinValue.length === 6) {
                console.log("• Updating Password...");
                try {
                    await updatePassword(currentUser, newPinValue);
                } catch (passError: any) {
                    console.error("Firebase Auth Error:", passError);
                    throw new Error(`Password update failed: ${passError.message}`);
                }
            } else if (newPinValue.length > 0) {
                throw new Error(t('toast_password_numeric_6') || 'PIN must be exactly 6 digits');
            }

            // 3. IMAGE IS ALREADY UPLOADED (Optimized)
            // if (selectedFile) logic removed as we now upload immediately
            finalAvatarUrl = profileImage;

            // 4. SYNC APP STATE (Handles DB update via App.tsx -> userService)
            await onUpdateProfile({
                name: nameInput,
                image: finalAvatarUrl,
                password: pin.join('') || undefined,
            });

            console.log("✓ Profile saved successfully!");
            success(t('profile_updated_title'), t('profile_updated_msg'));

            onClose();

        } catch (error: any) {
            console.error("CRITICAL SAVE FAILED:", error);
            showError(t('toast_error_title'), `${t('toast_save_failed')}: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-[440px] rounded-2xl shadow-modal border border-slate-100 overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">{t('edit_profile')}</h3>
                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} onClick={onClose} className="text-slate-400 hover:text-slate-600 transition rounded-lg p-1 hover:bg-slate-100">
                        <X size={20} />
                    </motion.button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Profile Image */}
                    <div className="flex justify-center mb-2">
                        <label className="relative group/photo cursor-pointer w-28 h-28">
                            <div className="w-full h-full rounded-full overflow-hidden border-4 border-white  group-hover/photo:ring-4 group-hover/photo:ring-promed-primary/30 group-hover/photo:scale-105 group-hover/photo: transition-all duration-500 ring-1 ring-slate-100 relative bg-slate-50">
                                <ProfileAvatar src={previewUrl || profileImage} alt="Profile" size={112} className="w-full h-full group-hover/photo:scale-110 transition duration-700" optimisticId={`${propUserId}_profile`} />

                                {/* Standard Hover Overlay */}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition duration-500 z-10">
                                    <img src={cameraIcon} alt="Camera" className="w-8 h-8 object-contain brightness-0 invert drop-shadow-md transform scale-90 group-hover/photo:scale-110 group-hover/photo:-translate-y-1 transition duration-500" />
                                </div>

                                {/* UPLOAD ANIMATION OVERLAY */}
                                <AnimatePresence>
                                    {isUploading && <ImageUploadingOverlay language={language} showText={false} progress={uploadProgress} />}
                                </AnimatePresence>
                            </div>
                            {/* Floating camera icon cue */}
                            <div className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-slate-100 text-slate-600 group-hover/photo:bg-promed-primary group-hover/photo:text-white transition-all duration-300 group-hover/photo:scale-110 group-hover/photo:translate-x-1 z-20 flex items-center justify-center">
                                <img src={cameraIcon} alt="Camera" className="w-[18px] h-[18px] object-contain opacity-70 group-hover/photo:brightness-0 group-hover/photo:invert" />
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} onClick={(e) => (e.currentTarget.value = '')} disabled={isUploading} />
                        </label>
                    </div>


                    {/* Language Settings */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 shadow-premium">
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('select_language')}</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {languages.map((lang) => (
                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                    key={lang.code}
                                    onClick={() => setLanguage(lang.code as any)}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all border ${language === lang.code
                                        ? 'bg-white border-promed-primary text-promed-primary shadow-sm'
                                        : 'bg-transparent border-transparent text-slate-500 hover:bg-white hover:shadow-sm'
                                        }`}
                                >
                                    {lang.label}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Security Toggle Section */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3 shadow-premium">
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('security_settings')}</h4>
                        <div className="flex items-center justify-between">
                            <div className="flex items-start space-x-3">
                                <div className={`p-2 rounded-lg ${isLockEnabled ? 'bg-promed-primary text-white' : 'bg-slate-200 text-slate-500'} transition-colors`}>
                                    <Lock size={24} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-800">{t('enable_lock')}</p>
                                    <p className="text-xs text-slate-500 leading-tight mt-0.5 pr-2">{t('lock_hint')}</p>
                                </div>
                            </div>
                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                onClick={() => onToggleLock(!isLockEnabled)}
                                className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-promed-primary ${isLockEnabled ? 'bg-promed-primary' : 'bg-slate-200'}`}
                            >
                                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${isLockEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </motion.button>
                        </div>
                    </div>

                    {/* Sound Settings */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 shadow-premium">
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('sound_settings') || 'Sound Preferences'}</h4>
                        <div className="flex items-center justify-between">
                            <div className="flex items-start space-x-3">
                                <div className={`p-2 rounded-lg ${soundEnabled ? 'bg-promed-primary text-white' : 'bg-slate-200 text-slate-500'} transition-colors`}>
                                    {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-800">{t('enable_sound') || 'Enable Sound'}</p>
                                    <p className="text-xs text-slate-500 leading-tight mt-0.5 pr-2">{t('sound_hint') || 'Play sound effects for notifications and actions'}</p>
                                </div>
                            </div>
                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                onClick={toggleSound}
                                className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-promed-primary ${soundEnabled ? 'bg-promed-primary' : 'bg-slate-200'}`}
                            >
                                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${soundEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </motion.button>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('full_name')}</label>
                            <input
                                type="text"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-400 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white transition-all text-sm shadow-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('email') || 'Email Address'}</label>
                            <div className="relative group/email">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/email:text-promed-primary transition-colors" size={16} />
                                <input
                                    type="email"
                                    value={userEmail}
                                    readOnly
                                    className="w-full bg-slate-100 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-slate-500 cursor-not-allowed text-sm shadow-sm font-medium"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/email:opacity-100 transition-opacity pointer-events-none">
                                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight">Verified</span>
                                </div>
                            </div>
                        </div>

                        {isLockEnabled && (
                            <>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('current_password')}</label>
                                    <div className="flex gap-2 justify-between opacity-100">
                                        {[...Array(6)].map((_, idx) => (
                                            <div
                                                key={idx}
                                                className="w-12 h-14 bg-slate-50 border border-slate-400 rounded-xl flex items-center justify-center text-xl font-bold text-promed-dark shadow-sm transition-all duration-200"
                                            >
                                                {showCurrentPass ? (currentPassInput[idx] || '•') : '•'}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end">
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="text-promed-primary hover:text-promed-dark transition flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-promed-light/50 px-2 py-1 rounded-md">
                                            {showCurrentPass ? <><EyeOff size={14} /> {t('hide')}</> : <><Eye size={14} /> {t('show')}</>}
                                        </motion.button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('new_password')}</label>
                                    <div className="flex gap-2 justify-between">
                                        {pin.map((digit, idx) => (
                                            <input
                                                key={idx}
                                                ref={el => { pinRefs.current[idx] = el; }}
                                                type={showNewPass ? "text" : "password"}
                                                inputMode="numeric"
                                                pattern="\d*"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handlePinChange(idx, e.target.value)}
                                                onKeyDown={(e) => handlePinKeyDown(idx, e)}
                                                className="w-12 h-14 bg-white border border-slate-400 rounded-xl text-center text-xl font-bold text-promed-dark transition-all shadow-sm"
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] text-slate-400 font-medium italic">{t('lock_hint')}</p>
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} type="button" onClick={() => setShowNewPass(!showNewPass)} className="text-promed-primary hover:text-promed-dark transition flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-promed-light/50 px-2 py-1 rounded-md">
                                            {showNewPass ? <><EyeOff size={14} /> {t('hide')}</> : <><Eye size={14} /> {t('show')}</>}
                                        </motion.button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-6 border-t border-slate-100 mt-4">
                        <h4 className="text-[11px] font-bold text-red-500/60 uppercase tracking-wider mb-3">{t('danger_zone')}</h4>
                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                            onClick={() => setIsLogoutModalOpen(true)}
                            className="w-full flex items-center justify-between p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-all group"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-red-500/10 text-red-500 rounded-lg group-hover:scale-110 transition-transform">
                                    <LogOut size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-red-500">{t('logout')}</p>
                                    <p className="text-[11px] text-red-500/60 font-medium">{t('logout_desc')}</p>
                                </div>
                            </div>
                            <ChevronDown size={16} className="text-red-500/30 -rotate-90" />
                        </motion.button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end p-6 border-t border-slate-100 space-x-3">
                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} onClick={onClose} className="px-5 py-2.5 text-sm text-slate-500 hover:text-slate-800 font-semibold transition hover:bg-slate-50 rounded-xl">
                        {t('cancel')}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn-premium-blue disabled:opacity-50"
                    >
                        <span>{isSaving ? t('saving') : t('save')}</span>
                    </motion.button>
                </div>

                <ConfirmationModal
                    isOpen={isLogoutModalOpen}
                    onClose={() => setIsLogoutModalOpen(false)}
                    onConfirm={() => {
                        setIsLogoutModalOpen(false);
                        onLogout();
                    }}
                    title={t('confirm_logout_title')}
                    description={t('confirm_logout_desc')}
                    confirmText={t('yes')}
                    cancelText={t('no')}
                    icon={LogOut}
                    variant="danger"
                />
            </div>
        </div>
    );
};

export default EditProfileModal;

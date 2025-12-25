import React, { useState, useEffect } from 'react';
import {
    X,
    Camera,
    Eye,
    EyeOff,
    Lock,
    LogOut,
    ChevronDown,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ProfileAvatar } from './ProfileAvatar';
import ConfirmationModal from './ConfirmationModal';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../contexts/ToastContext';
import { compressImage } from '../lib/imageOptimizer';
import { setOptimisticImage } from '../lib/imageService';
import { useScrollLock } from '../hooks/useScrollLock';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLockEnabled: boolean;
    onToggleLock: (enabled: boolean) => void;
    userPassword: string;
    userImage: string;
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
    userId: propUserId,
    userName,
    onLogout
}) => {
    const { t } = useLanguage();
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
        }
    }, [isOpen, userPassword, userImage, userName]);

    // Lock scroll when modal is open
    useScrollLock(isOpen);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setProfileImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    // ROBUST SAVE LOGIC (MATCH PATIENT LOGIC 100%)
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. FRESH AUTH CHECK (Phase 2 FIX)
            const { data: { user: freshUser }, error: authError } = await supabase.auth.getUser();
            if (authError || !freshUser) {
                throw new Error("No active session - please log out and log back in.");
            }
            const activeUserId = freshUser.id;
            let finalAvatarUrl = profileImage;

            console.log("✓ Session verified for user:", activeUserId);

            // 2. UPDATE PASSWORD (Auth API)
            const newPinValue = pin.join('');
            if (newPinValue.length === 6) {
                console.log("• Updating Password...");
                const { error: passError } = await supabase.auth.updateUser({
                    password: newPinValue
                });

                if (passError) {
                    console.error("Supabase Auth Error:", passError);
                    throw new Error(`Password update failed: ${passError.message}`);
                }
            } else if (newPinValue.length > 0) {
                throw new Error(t('toast_password_numeric_6') || 'PIN must be exactly 6 digits');
            }

            // 3. UPLOAD IMAGE (Phase 3: Storage Mirror)
            if (selectedFile) {
                console.log("• Compressing and uploading image...");

                // Seed optimistic cache immediately to prevent flicker
                const blobUrl = URL.createObjectURL(selectedFile);
                setOptimisticImage(`${activeUserId}_profile`, blobUrl);

                // Compress image before upload (Standard Practice)
                const compressedFile = await compressImage(selectedFile);

                // Construct Path (Matching Patient Style: bucket/category/id/file)
                const fileExt = compressedFile.name.split('.').pop();
                const fileName = `avatar_${Date.now()}.${fileExt}`;
                const filePath = `avatars/${activeUserId}/${fileName}`;

                // USE WORKING BUCKET: promed-images (standard for patients)
                const { error: uploadError } = await supabase.storage
                    .from('promed-images')
                    .upload(filePath, compressedFile, { upsert: true });

                if (uploadError) {
                    console.error("Supabase Storage Error:", uploadError);
                    throw new Error(`${t('toast_upload_failed')}: ${uploadError.message}`);
                }

                const { data } = supabase.storage.from('promed-images').getPublicUrl(filePath);
                finalAvatarUrl = data.publicUrl;
                console.log("✓ Image uploaded to storage:", finalAvatarUrl);
            }

            // 4. DATABASE UPDATE (Phase 3: Double-Write Strategy)
            console.log("• Updating database profile...");
            const updates = {
                full_name: nameInput,
                avatar_url: finalAvatarUrl, // Standard
                profile_image: finalAvatarUrl, // Double-write for backward compatibility
                updated_at: new Date().toISOString(),
            };

            const { error: dbError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', activeUserId);

            if (dbError) {
                console.error("Supabase Database Error:", dbError);
                throw new Error(`Failed to save profile: ${dbError.message}`);
            }

            // 5. SYNC APP STATE
            await onUpdateProfile({
                name: nameInput,
                image: finalAvatarUrl,
                password: pin.join('') || undefined,
            });

            console.log("✓ Profile saved successfully!");
            success(t('toast_profile_saved'));



            onClose();

        } catch (error: any) {
            console.error("CRITICAL SAVE FAILED:", error);
            showError(`${t('toast_save_failed')}: ${error.message}`);
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
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition rounded-lg p-1 hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Profile Image */}
                    <div className="flex justify-center mb-2">
                        <label className="relative group/photo cursor-pointer w-28 h-28">
                            <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-xl group-hover/photo:ring-4 group-hover/photo:ring-promed-primary/30 group-hover/photo:scale-105 group-hover/photo:shadow-2xl group-hover/photo:shadow-promed-primary/20 transition-all duration-500 ring-1 ring-slate-100 relative">
                                <ProfileAvatar src={profileImage} alt="Profile" size={112} className="w-full h-full group-hover/photo:scale-110 transition duration-700" optimisticId={`${propUserId}_profile`} />
                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition duration-500">
                                    <Camera className="text-white drop-shadow-md transform scale-90 group-hover/photo:scale-110 group-hover/photo:-translate-y-1 transition duration-500" size={32} />
                                </div>
                            </div>
                            {/* Floating camera icon cue */}
                            <div className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-slate-100 text-slate-600 group-hover/photo:bg-promed-primary group-hover/photo:text-white transition-all duration-300 group-hover/photo:scale-110 group-hover/photo:translate-x-1">
                                <Camera size={18} />
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                    </div>

                    {/* Security Toggle Section */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('security_settings')}</h4>
                        <div className="flex items-center justify-between">
                            <div className="flex items-start space-x-3">
                                <div className={`p-2 rounded-lg ${isLockEnabled ? 'bg-promed-primary text-white' : 'bg-slate-200 text-slate-500'} transition-colors`}>
                                    <Lock size={18} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-800">{t('enable_lock')}</p>
                                    <p className="text-xs text-slate-500 leading-tight mt-0.5 pr-2">{t('lock_hint')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onToggleLock(!isLockEnabled)}
                                className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-promed-primary ${isLockEnabled ? 'bg-promed-primary' : 'bg-slate-200'}`}
                            >
                                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${isLockEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
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
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-promed-primary/20 focus:border-promed-primary focus:bg-white transition-all text-sm shadow-sm"
                            />
                        </div>

                        {isLockEnabled && (
                            <>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('current_password')}</label>
                                    <div className="flex gap-2 justify-between opacity-100">
                                        {[...Array(6)].map((_, idx) => (
                                            <div
                                                key={idx}
                                                className="w-12 h-14 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-xl font-bold text-promed-dark shadow-sm transition-all duration-200"
                                            >
                                                {showCurrentPass ? (currentPassInput[idx] || '•') : '•'}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end">
                                        <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="text-promed-primary hover:text-promed-dark transition flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-promed-light/50 px-2 py-1 rounded-md">
                                            {showCurrentPass ? <><EyeOff size={14} /> {t('hide')}</> : <><Eye size={14} /> {t('show')}</>}
                                        </button>
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
                                                className="w-12 h-14 bg-white border border-slate-200 rounded-xl text-center text-xl font-bold text-promed-dark focus:outline-none focus:ring-4 focus:ring-promed-primary/10 focus:border-promed-primary transition-all shadow-sm"
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] text-slate-400 font-medium italic">{t('lock_hint')}</p>
                                        <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="text-promed-primary hover:text-promed-dark transition flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-promed-light/50 px-2 py-1 rounded-md">
                                            {showNewPass ? <><EyeOff size={14} /> {t('hide')}</> : <><Eye size={14} /> {t('show')}</>}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-6 border-t border-slate-100 mt-4">
                        <h4 className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-3">{t('danger_zone')}</h4>
                        <button
                            onClick={() => setIsLogoutModalOpen(true)}
                            className="w-full flex items-center justify-between p-4 bg-red-50/50 hover:bg-red-50 border border-red-100 rounded-xl transition-all group"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-red-100 text-red-600 rounded-lg group-hover:scale-110 transition-transform">
                                    <LogOut size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-red-600">{t('logout')}</p>
                                    <p className="text-[11px] text-red-400 font-medium">End your current session</p>
                                </div>
                            </div>
                            <ChevronDown size={16} className="text-red-300 -rotate-90" />
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end p-6 border-t border-slate-100 space-x-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm text-slate-500 hover:text-slate-800 font-semibold transition hover:bg-slate-50 rounded-xl">
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-promed-primary hover:bg-teal-800 text-white text-sm font-bold rounded-xl transition active:scale-95 shadow-md shadow-promed-primary/20 disabled:opacity-50"
                    >
                        {isSaving ? t('saving') : t('save')}
                    </button>
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

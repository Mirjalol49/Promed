import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { PinInput } from '../../components/ui/PinInput';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { ArrowRight, Lock } from 'lucide-react';
import lockIcon from '../../assets/images/lock.png';

interface ResetPasswordScreenProps {
    oobCode: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ oobCode, onSuccess, onCancel }) => {
    const { t } = useLanguage();
    const { error: showError, success: showSuccess } = useToast();

    // Verifying state
    const [isVerifying, setIsVerifying] = useState(true);
    const [email, setEmail] = useState('');

    // Input state
    const [newPin, setNewPin] = useState(['', '', '', '', '', '']);
    const [confirmPin, setConfirmPin] = useState(['', '', '', '', '', '']);
    const [step, setStep] = useState<'create' | 'confirm'>('create');
    const [loading, setLoading] = useState(false);
    const [pageError, setPageError] = useState('');

    useEffect(() => {
        const verifyCode = async () => {
            try {
                const email = await verifyPasswordResetCode(auth, oobCode);
                setEmail(email);
                setIsVerifying(false);
            } catch (err: any) {
                console.error("Invalid reset code:", err);
                setPageError(t('invalid_reset_link') || "This password reset link is invalid or has expired.");
                setIsVerifying(false);
            }
        };
        verifyCode();
    }, [oobCode]);

    const handleCreateSubmit = (pin: string) => {
        // Validation handled by PinInput constraint (numeric)
        // Just move to confirm step
        setStep('confirm');
    };

    const handleConfirmSubmit = async (pin: string) => {
        if (pin !== newPin.join('')) {
            showError(t('error'), t('pin_mismatch') || "PINs do not match. Please try again.");
            // Reset confirm step
            setConfirmPin(['', '', '', '', '', '']);
            return;
        }

        setLoading(true);
        try {
            await confirmPasswordReset(auth, oobCode, pin);
            showSuccess(t('success'), t('password_reset_success') || "Password reset successfully!");
            setTimeout(onSuccess, 2000);
        } catch (err: any) {
            console.error("Reset failed:", err);
            showError(t('error'), err.message || "Failed to reset password.");
            setLoading(false);
        }
    };

    if (isVerifying) {
        return (
            <div className="min-h-screen bg-promed-deep flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <p>{t('verifying_link') || "Verifying link..."}</p>
                </div>
            </div>
        );
    }

    if (pageError) {
        return (
            <div className="min-h-screen bg-promed-deep flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-500">
                        <Lock size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Link Expired</h3>
                    <p className="text-slate-500">{pageError}</p>
                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }} onClick={onCancel} className="btn-premium-blue w-full">
                        {t('back_to_login') || "Back to Login"}
                    </motion.button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-promed-deep flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-white/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center">
                {/* Icon */}
                <div className="mb-8 animate-float">
                    <img src={lockIcon} alt="Reset" className="w-24 h-24 object-contain" />
                </div>

                <h2 className="text-3xl font-black text-white mb-2 tracking-wider">
                    {step === 'create' ? (t('create_new_pin') || "Create New PIN") : (t('confirm_new_pin') || "Confirm New PIN")}
                </h2>
                <p className="text-white/60 mb-10 font-medium">
                    {step === 'create'
                        ? `Set a new 6-digit PIN for ${email}`
                        : "Please re-enter your PIN to confirm"
                    }
                </p>

                <div className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-[32px] p-8 shadow-2xl">
                    {step === 'create' ? (
                        <div className="space-y-6">
                            <PinInput
                                value={newPin}
                                onChange={setNewPin}
                                onComplete={handleCreateSubmit}
                                autoFocus
                            />
                            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">
                                Enter 6 numbers
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <PinInput
                                value={confirmPin}
                                onChange={setConfirmPin}
                                onComplete={handleConfirmSubmit}
                                autoFocus
                            />
                            {loading && (
                                <div className="flex justify-center">
                                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

import React from 'react';
import { Bell, BellRing, X, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * A floating banner that prompts the user to enable push notifications.
 * 
 * iOS CRITICAL: The "Enable" button click IS the user gesture required by Safari.
 * This component should be shown after login once the user has interacted with the app.
 * 
 * States:
 * - `prompt`: Not yet asked → show the enable banner
 * - `granted`: Already enabled → show nothing (or brief success)
 * - `denied`: User blocked → show subtle "re-enable in settings" hint
 * - `unsupported`: Browser can't do push → show nothing
 */
interface NotificationPromptProps {
    userId: string | null;
    onDismiss?: () => void;
}

export const NotificationPrompt: React.FC<NotificationPromptProps> = ({ userId, onDismiss }) => {
    const { t } = useLanguage();
    const { isSupported, permission, isLoading, requestPermission, error } = usePushNotifications(userId);
    const [dismissed, setDismissed] = React.useState(() => {
        try {
            return localStorage.getItem('graft_push_dismissed') === 'true';
        } catch { return false; }
    });
    const [showSuccess, setShowSuccess] = React.useState(false);

    // Don't show if unsupported, already granted, or dismissed
    if (!isSupported || permission === 'granted' || dismissed) {
        // Show brief success animation when just enabled
        if (showSuccess) {
            return (
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[380px] z-[200]"
                    >
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-emerald-100/50">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-emerald-900">
                                    {t('notifications_enabled') || 'Bildirishnomalar yoqildi!'}
                                </p>
                                <p className="text-xs text-emerald-600 mt-0.5">
                                    {t('notifications_enabled_desc') || 'Yangi xabarlar haqida xabar olasiz'}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            );
        }
        return null;
    }

    // If denied, show subtle hint
    if (permission === 'denied') {
        if (dismissed) return null;
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[380px] z-[200]"
                >
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-amber-100/50">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-amber-900">
                                {t('notifications_blocked') || 'Bildirishnomalar bloklangan'}
                            </p>
                            <p className="text-xs text-amber-600 mt-0.5">
                                {t('notifications_blocked_hint') || "Sozlamalar → Graft → Bildirishnomalar orqali yoqing"}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setDismissed(true);
                                localStorage.setItem('graft_push_dismissed', 'true');
                                onDismiss?.();
                            }}
                            className="p-1.5 rounded-lg hover:bg-amber-100 transition-colors flex-shrink-0"
                        >
                            <X className="w-4 h-4 text-amber-400" />
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    }

    // Main "Enable" prompt
    const handleEnable = async () => {
        const granted = await requestPermission();
        if (granted) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem('graft_push_dismissed', 'true');
        onDismiss?.();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 2 }}
                className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[400px] z-[200]"
            >
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl shadow-slate-200/60 relative overflow-hidden">
                    {/* Decorative gradient accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-promed-primary via-teal-400 to-emerald-400" />

                    {/* Close button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-400" />
                    </button>

                    <div className="flex items-start gap-4">
                        {/* Animated bell icon */}
                        <motion.div
                            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-promed-primary/10 to-teal-50 flex items-center justify-center flex-shrink-0 border border-promed-primary/10"
                            animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
                            transition={{ duration: 1.5, delay: 3, repeat: Infinity, repeatDelay: 5 }}
                        >
                            <BellRing className="w-6 h-6 text-promed-primary" />
                        </motion.div>

                        <div className="flex-1 min-w-0 pr-4">
                            <h3 className="text-sm font-black text-slate-900 tracking-wide">
                                {t('enable_notifications_title') || 'Bildirishnomalarni yoqing'}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {t('enable_notifications_desc') || 'Yangi xabarlar va muhim yangiliklar haqida darhol xabar oling'}
                            </p>

                            {/* iOS hint */}
                            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 font-medium">
                                <Smartphone className="w-3 h-3" />
                                <span>{t('enable_notifications_ios_hint') || "iPhone uchun: Home Screen'ga qo'shilgan bo'lishi kerak"}</span>
                            </div>

                            {error && (
                                <p className="text-xs text-rose-500 mt-2 font-medium">{error}</p>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 mt-4">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all active:scale-[0.98]"
                        >
                            {t('later') || 'Keyinroq'}
                        </button>
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: 'spring', stiffness: 800, damping: 35 }}
                            onClick={handleEnable}
                            disabled={isLoading}
                            className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-gradient-to-r from-promed-primary to-teal-500 hover:from-promed-primary/90 hover:to-teal-500/90 rounded-xl shadow-md shadow-promed-primary/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>{t('enabling') || 'Yoqilmoqda...'}</span>
                                </>
                            ) : (
                                <>
                                    <Bell className="w-3.5 h-3.5" />
                                    <span>{t('enable') || 'Yoqish'}</span>
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

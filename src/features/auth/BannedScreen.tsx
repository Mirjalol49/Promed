import React from 'react';
import { ShieldAlert, Phone, LogOut } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion } from 'framer-motion';

interface BannedScreenProps {
    onLogout: () => void;
}

export const BannedScreen: React.FC<BannedScreenProps> = ({ onLogout }) => {
    const { t } = useLanguage();

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center"
            >
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <ShieldAlert className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('banned_title')}</h2>
                <p className="text-gray-600 mb-6">{t('banned_desc')}</p>

                <a href="tel:+998937489141" className="block w-full gel-blue-style text-white font-bold py-4 px-4 rounded-xl mb-3 flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
                    <Phone className="w-5 h-5" />
                    {t('banned_contact_btn')}
                </a>

                <button onClick={onLogout} className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <LogOut className="w-5 h-5" />
                    {t('banned_logout')}
                </button>

                <div className="mt-4 text-sm text-gray-400">
                    Admin: +998 93 748 91 41
                </div>
            </motion.div>
        </div>
    );
};

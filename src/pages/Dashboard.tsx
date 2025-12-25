
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Users,
    Syringe,
} from 'lucide-react';
import { InjectionAppointmentWidget } from '../features/dashboard/Widgets';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccount } from '../contexts/AccountContext';
import { Patient } from '../types';
import Mascot from '../components/mascot/Mascot';
import { DashboardLoader } from '../components/ui/DashboardLoader';
import LockedOverlay from '../components/ui/LockedOverlay';
import TourGuide from '../components/tour/TourGuide';

interface DashboardProps {
    stats: {
        total: number;
        active: number;
        upcoming: number;
        newThisMonth: number;
    };
    onNewPatient: () => void;
    onUploadPhoto: () => void;
    onPatientSelect: (id: string) => void;
    patients: Patient[];
    isLoading?: boolean;
}

interface HeroCardProps {
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    shadow: string;
    mascot?: React.ReactNode;
}

const HeroCard: React.FC<HeroCardProps> = ({ label, value, icon: Icon, color, shadow, mascot }) => (
    <motion.div
        initial="idle"
        whileHover="hover"
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }} // Fix for Safari overflow:hidden + border-radius bug
        className={`relative p-4 md:p-7 rounded-[24px] md:rounded-[32px] h-[110px] md:h-[180px] overflow-hidden ${color} bg-opacity-90 backdrop-blur-sm border border-white/20 shadow-xl ${shadow} isolate`}
    >
        <div className="relative z-10 h-full flex flex-col justify-between pointer-events-none">
            <div className="space-y-1">
                <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-white/10 rounded-lg">
                        <Icon size={16} className="text-white" />
                    </div>
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/90">{label}</span>
                </div>
                <div className="flex items-baseline space-x-2 pt-1 md:pt-2">
                    <span className="text-4xl md:text-6xl font-black text-white tracking-tighter">{value}</span>
                </div>
            </div>
        </div>

        {/* Decorative elements - moved behind mascot */}
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl z-0 pointer-events-none" />
        <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-black/5 rounded-full blur-3xl opacity-50 z-0 pointer-events-none" />

        {mascot && (
            <div className="absolute bottom-0 right-0 md:bottom-2 md:right-2 z-20 opacity-100 scale-75 md:scale-100 origin-bottom-right transform-gpu pointer-events-none">
                {mascot}
            </div>
        )}
    </motion.div>
);

export const Dashboard: React.FC<DashboardProps> = ({
    stats,
    onNewPatient,
    onUploadPhoto,
    onPatientSelect,
    patients,
    isLoading
}) => {
    const { t } = useLanguage();
    const { subscriptionStatus } = useAccount();

    const today = new Date();
    today.setHours(0, 0, 0, 0);


    return (
        <div className="relative">
            {/* Tour Guide */}
            <TourGuide />


            <div className="space-y-10 p-2 sm:p-4">
                {/* Vitals Strip */}
                <div id="stats-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <HeroCard
                        label={t('operation')}
                        value={patients.filter(p => p.operationDate && new Date(p.operationDate).toDateString() === new Date().toDateString()).length}
                        icon={Activity}
                        color="bg-gradient-to-br from-rose-500 to-rose-600"
                        shadow="shadow-rose-500/30"
                        mascot={<Mascot mood="operation" size={115} floating={false} />}
                    />
                    <HeroCard
                        label={t('injection')}
                        value={stats.upcoming}
                        icon={Syringe}
                        color="bg-gradient-to-br from-blue-500 to-blue-600"
                        shadow="shadow-blue-500/30"
                        mascot={<Mascot mood="injection" size={115} floating={false} />}
                    />
                    <HeroCard
                        label={t('patients')}
                        value={stats.total}
                        icon={Users}
                        color="bg-gradient-to-br from-emerald-500 to-teal-600"
                        shadow="shadow-emerald-500/30"
                        mascot={<Mascot mood="happy" size={115} floating={false} />}
                    />
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 gap-8">
                    {/* Main: Upcoming Schedule */}
                    <div className="relative min-h-[500px]">
                        <div className="h-full">
                            <InjectionAppointmentWidget
                                patients={patients}
                                onViewPatient={onPatientSelect}
                            />
                        </div>

                        {/* Locked Content Overlay */}
                        {subscriptionStatus === 'frozen' && (
                            <LockedOverlay onPay={() => console.log('Initiating Payment...')} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

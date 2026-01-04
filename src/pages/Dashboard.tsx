import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Search,
    Users,
    Bell,
    Syringe,
} from 'lucide-react';
import { StatCard, InjectionAppointmentWidget } from '../features/dashboard/Widgets';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccount } from '../contexts/AccountContext';
import { Patient } from '../types';
import { DashboardLoader } from '../components/ui/DashboardLoader';
import LockedOverlay from '../components/ui/LockedOverlay';
import TourGuide from '../components/tour/TourGuide';
import operationIcon from '../components/mascot/operation_mascot.png';
import patientsIcon from '../components/mascot/happy_mascot.png';
import injectionIcon from '../components/mascot/injection_mascot.png';

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

    const todaysOperationsCount = patients.filter(p =>
        p.operationDate && new Date(p.operationDate).toDateString() === new Date().toDateString()
    ).length;

    return (
        <div className="relative">
            {/* Tour Guide */}
            <TourGuide />

            <div className="space-y-10 p-2 sm:p-4">
                {/* Vitals Strip - Strict 4px Spacing Rule */}
                <div id="stats-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <StatCard
                        label={t('operation')}
                        value={todaysOperationsCount}
                        icon={Activity}
                        mascotImg={operationIcon}
                        colorClass="bg-rose-500"
                        shadowColor="rgba(244, 63, 94, 0.3)"
                    />
                    <StatCard
                        label={t('injection')}
                        value={stats.upcoming}
                        icon={Syringe}
                        mascotImg={injectionIcon}
                        colorClass="bg-promed-primary"
                        shadowColor="hsla(206, 100%, 34%, 0.3)"
                    />
                    <StatCard
                        label={t('patients')}
                        value={stats.active}
                        icon={Users}
                        mascotImg={patientsIcon}
                        colorClass="bg-[hsl(160,100%,30%)]"
                        shadowColor="rgba(16, 185, 129, 0.3)"
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

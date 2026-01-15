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
import operationIcon from '../assets/images/operation.png';
import patientsIcon from '../assets/images/patients.png';
import injectionIcon from '../assets/images/injection.png';

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
                {/* Vitals Strip */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-promed-text tracking-tight flex items-center gap-2 px-2">
                        <div className="p-2 bg-promed-primary/10 rounded-xl border border-promed-primary/10 ">
                            <Activity className="w-5 h-5 text-promed-primary" />
                        </div>
                        {t('overview')}
                    </h3>
                    <div id="stats-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        <StatCard
                            label={t('operation')}
                            value={todaysOperationsCount}
                            icon={Activity}
                            mascotImg={operationIcon}
                            colorClass="bg-rose-500"
                            shadowColor=""
                        />
                        <StatCard
                            label={t('injection')}
                            value={stats.upcoming}
                            icon={Syringe}
                            mascotImg={injectionIcon}
                            colorClass="bg-promed-primary"
                            shadowColor=""
                            imgClassName="translate-x-2 md:translate-x-4"
                        />
                        <StatCard
                            label={t('patients')}
                            value={stats.active}
                            icon={Users}
                            mascotImg={patientsIcon}
                            colorClass="bg-[hsl(160,100%,30%)]"
                            shadowColor=""
                        />
                    </div>
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

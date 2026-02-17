import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Search,
    Users,
    Bell,
    Syringe,
} from 'lucide-react';
import { format } from 'date-fns';
import { uz, ru, enUS } from 'date-fns/locale';
import { formatCompactNumber, formatCurrency } from '../lib/formatters';
import { StatCard, InjectionAppointmentWidget } from '../features/dashboard/Widgets';
import { DashboardScheduler } from '../features/dashboard/DashboardScheduler';
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
        monthlyRevenue: number;
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
    const { t, language } = useLanguage();
    const { subscriptionStatus, role } = useAccount();

    const localeMap = {
        uz: uz,
        ru: ru,
        en: enUS
    };
    const currentLocale = localeMap[language as keyof typeof localeMap] || enUS;
    const currentMonth = format(new Date(), 'MMMM', { locale: currentLocale });

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
                    <div id="stats-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {/* 1. Revenue (Financials First) - HIDDEN FOR NURSE */}
                        {role !== 'nurse' && (
                            <StatCard
                                label={t('total_revenue') || 'Jami Tushum'}
                                value={formatCompactNumber(stats.monthlyRevenue || 0)}
                                icon={Activity}
                                colorClass="bg-indigo-600"
                                shadowColor=""
                                isLoading={isLoading}
                                subtext={currentMonth.toUpperCase()}
                                tooltipText={formatCurrency(stats.monthlyRevenue || 0, 'UZS')}
                            />
                        )}

                        {/* 2. Operations (Core Business) */}
                        <StatCard
                            label={t('operation')}
                            value={todaysOperationsCount}
                            icon={Activity}
                            colorClass="bg-rose-500"
                            shadowColor=""
                            isLoading={isLoading}
                            subtext={t('today') || 'BUGUN'}
                        />

                        {/* 3. Injections (Volume Business) */}
                        <StatCard
                            label={t('injection')}
                            value={stats.upcoming}
                            icon={Syringe}
                            colorClass="bg-blue-600"
                            shadowColor=""
                            isLoading={isLoading}
                            subtext={t('upcoming_patients') || 'KUTILAYOTGAN'}
                        />

                        {/* 4. Growth (New Blood) */}
                        <StatCard
                            label={t('new_patients_stat') || 'Yangi Bemorlar'}
                            value={stats.newThisMonth}
                            icon={Users}
                            colorClass="bg-emerald-500"
                            shadowColor=""
                            isLoading={isLoading}
                            subtext={currentMonth.toUpperCase()}
                        />
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 gap-8">
                    {/* Main: Upcoming Schedule */}
                    <div className="relative min-h-[500px]">
                        <DashboardScheduler
                            patients={patients}
                            onViewPatient={onPatientSelect}
                        />

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


import React from 'react';
import {
    Activity,
    Users,
    Droplet,
    Clipboard,
    Syringe,
    Plus,
    Camera
} from 'lucide-react';
import { VitalsCard, SurgeryFloorWidget, InjectionAppointmentWidget } from '../components/Widgets';
import { useLanguage } from '../contexts/LanguageContext';
import { Patient } from '../types';

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

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Vitals Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <VitalsCard
                    label={t('surgeries_today')}
                    value={patients.filter(p => p.operationDate && new Date(p.operationDate).toDateString() === new Date().toDateString()).length}
                    icon={Activity}
                    color="bg-rose-500"
                    isLoading={isLoading}
                />
                <VitalsCard
                    label={t('injections_due')}
                    value={stats.upcoming}
                    icon={Syringe}
                    color="bg-blue-500"
                    isLoading={isLoading}
                />
                <VitalsCard
                    label={t('total_patients')}
                    value={stats.total}
                    icon={Users}
                    color="bg-teal-500"
                    isLoading={isLoading}
                />
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main: Surgery Floor Widget (Left 2/3) */}
                <div className="lg:col-span-2 h-[500px]">
                    <SurgeryFloorWidget patients={patients} />
                </div>

                {/* Side: Injection Appointments (Right 1/3) */}
                <div className="h-[500px]">
                    <InjectionAppointmentWidget
                        patients={patients}
                        onViewPatient={onPatientSelect}
                    />
                </div>
            </div>
        </div>
    );
};

import React, { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useLanguage } from '../../contexts/LanguageContext';
import happyMascot from '../mascot/happy_mascot.png';
import injectionMascot from '../mascot/injection_mascot.png';
import operationMascot from '../mascot/operation_mascot.png';

const TourGuide: React.FC = () => {
    const { t } = useLanguage();
    const [run, setRun] = useState(false);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('hasSeenTour');
        if (!hasSeenTour) {
            setRun(true);
        }
    }, []);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
            localStorage.setItem('hasSeenTour', 'true');
        }
    };

    const steps: Step[] = [
        {
            target: 'body',
            content: (
                <div className="flex flex-col items-center text-center pt-4">
                    <img src={happyMascot} alt="Welcome" className="w-24 h-24 mb-4 object-contain " />
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                        {t('tour_welcome_title') || "Assalomu alaykum, Doktor!"}
                    </h3>
                    <p className="text-slate-600 text-sm">
                        {t('tour_welcome_desc') || "Men Graft yordamchisiman. Keling, sizga ish stolini ko'rsataman."}
                    </p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '#stats-grid',
            content: (
                <div className="relative pt-2">
                    <img
                        src={operationMascot}
                        alt="Stats"
                        className="w-16 h-16 absolute -top-12 -left-8 z-10"
                    />
                    <p className="text-slate-700 font-medium pl-4">
                        {t('tour_stats_desc') || "Bu yerda operatsiya va inyeksiyalar statistikasini kuzatib borasiz."}
                    </p>
                </div>
            ),
        },
        {
            target: '#add-patient-btn',
            content: (
                <div className="relative pt-2">
                    <img
                        src={injectionMascot}
                        alt="Add"
                        className="w-16 h-16 absolute -top-12 -left-8 z-10"
                    />
                    <p className="text-slate-700 font-medium pl-4">
                        {t('tour_add_btn_desc') || "Eng muhim tugma! Yangi bemor qo'shish uchun shu yerni bosing."}
                    </p>
                </div>
            ),
        }
    ];

    const tourStyles = {
        options: {
            zIndex: 10000,
            arrowColor: '#fff',
            backgroundColor: '#fff',
            overlayColor: 'rgba(15, 23, 42, 0.6)',
            primaryColor: '#10B981', // Emerald-500
            textColor: '#334155',
        },
        tooltipContainer: {
            borderRadius: '16px',
            fontFamily: 'Inter, sans-serif',
            padding: '20px',
            // boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
        buttonNext: {
            backgroundColor: '#10B981',
            color: '#fff',
            borderRadius: '8px',
            fontWeight: 600,
            padding: '10px 20px',
            outline: 'none',
        },
        buttonBack: {
            color: '#64748b',
            marginRight: 10,
            fontWeight: 500,
        },
        buttonSkip: {
            color: '#94a3b8',
            fontSize: '12px',
        },
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous={true}
            showSkipButton={true}
            showProgress={false}
            disableOverlayClose={true}
            spotlightClicks={true}
            callback={handleJoyrideCallback}
            styles={tourStyles}
            locale={{
                back: t('back') || 'Orqaga',
                close: t('close') || 'Yopish',
                last: t('finish') || 'Tugatish',
                next: t('next') || 'Keyingisi',
                skip: t('skip') || 'O\'tkazib yuborish',
            }}
        />
    );
};

export default TourGuide;

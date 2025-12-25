import React, { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step, Styles } from 'react-joyride';
import { useLanguage } from '../../contexts/LanguageContext';

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
                    <img
                        src="/images/happy.png"
                        alt="Graft Mascot"
                        className="w-16 h-16 absolute -top-8 -left-8 drop-shadow-lg"
                    />
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                        Assalomu alaykum, Doktor!
                    </h3>
                    <p className="text-slate-600 text-sm">
                        Men Graft yordamchisiman. Keling, sizga ish stolini ko'rsataman.
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
                        src="/images/happy.png"
                        alt="Graft Mascot"
                        className="w-12 h-12 absolute -top-10 -left-6 drop-shadow-md"
                    />
                    <p className="text-slate-700 font-medium">
                        Bu yerda operatsiya va inyeksiyalar statistikasini kuzatib borasiz.
                    </p>
                </div>
            ),
        },
        {
            target: '#add-patient-btn',
            content: (
                <div className="relative pt-2">
                    <img
                        src="/images/happy.png"
                        alt="Graft Mascot"
                        className="w-12 h-12 absolute -top-10 -left-6 drop-shadow-md"
                    />
                    <p className="text-slate-700 font-medium">
                        Eng muhim tugma! Yangi bemor qo'shish uchun shu yerni bosing.
                    </p>
                </div>
            ),
        }
    ];

    const tourStyles: unknown = {
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
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
                back: 'Orqaga',
                close: 'Yopish',
                last: 'Tugatish',
                next: 'Keyingisi',
                skip: 'O\'tkazib yuborish',
            }}
        />
    );
};

export default TourGuide;

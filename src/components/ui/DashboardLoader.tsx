import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
    {
        image: '/images/thinking.png',
        text: "Bemorlar kartasini qidiryapman..."
    },
    {
        image: '/images/injection.png',
        text: "Plazmani tayyorlayapmiz..."
    },
    {
        image: '/images/happy.png',
        text: "Hammasi joyida! Yuklanmoqda..."
    }
];

export const DashboardLoader: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentStep((prev) => (prev + 1) % steps.length);
        }, 800);

        return () => clearInterval(timer);
    }, []);

    // SSR Check
    if (typeof window === 'undefined') return null;

    return createPortal(
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-white/95 backdrop-blur-xl"
        >
            <div className="flex flex-col items-center">
                <div className="relative w-80 h-80 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={currentStep}
                            src={steps[currentStep].image}
                            alt="Loading Mascot"
                            className="w-64 h-64 object-contain drop-shadow-2xl"
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 1.1, y: -20 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        />
                    </AnimatePresence>
                </div>

                <div className="h-12 mt-6 flex items-center justify-center overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={currentStep}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-emerald-900 font-bold text-2xl text-center px-4 tracking-tight"
                        >
                            {steps[currentStep].text}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>,
        document.body
    );
};

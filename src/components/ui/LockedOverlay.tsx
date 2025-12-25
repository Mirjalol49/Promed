import React from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

interface LockedOverlayProps {
    onPay?: () => void;
}

const LockedOverlay: React.FC<LockedOverlayProps> = ({ onPay }) => {
    return (
        <div className="absolute inset-x-0 bottom-0 top-[100px] z-[40] flex items-center justify-center p-6 overflow-hidden">
            {/* Premium Lock Icon Guardian */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[50]">
                <div className="relative flex items-center justify-center">
                    {/* Rotating Rings */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                        className="absolute w-32 h-32 border-2 border-emerald-500/20 border-dashed rounded-full overflow-hidden"
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute w-28 h-28 border border-white/10 border-dashed rounded-full"
                    />

                    {/* The Lock Container */}
                    <div className="w-20 h-20 bg-slate-900 border-[3px] border-white/10 rounded-[28px] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10 overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent opacity-50" />
                        <Lock size={32} className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            {/* Frosted Glass Overlay Container */}
            <div className="w-full h-full bg-white/60 backdrop-blur-md border-t border-white/40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[40px] flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-10 duration-700">

                <div className="max-w-md px-6 space-y-6">
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                        To'liq ma'lumotlarni <br /> ko'rish uchun...
                    </h3>

                    <div className="py-2">
                        <span className="text-4xl sm:text-5xl font-black text-emerald-600 tracking-tighter">
                            280,000 UZS
                        </span>
                        <span className="text-slate-400 font-bold ml-2">/ oy</span>
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        onClick={onPay}
                        className="group relative flex items-center justify-center gap-3 w-full bg-slate-900 text-white font-black py-5 rounded-[24px] shadow-2xl shadow-slate-900/20 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <Lock size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="uppercase tracking-[0.2em] text-[10px] sm:text-xs">Obuna uchun to'lash</span>
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default LockedOverlay;

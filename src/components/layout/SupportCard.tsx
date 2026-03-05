import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, Phone, Send, ChevronDown } from 'lucide-react';

export const SupportCard: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    // Smooth scroll handled via framer-motion onAnimationComplete

    return (
        <div ref={cardRef} className="pt-6 pb-2 mt-auto">
            <div
                className="relative bg-[#F0F7FF] border border-blue-100/50 rounded-2xl p-4 overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-sm"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl transition-all duration-300 ${isExpanded ? 'gel-blue-style text-white shadow-md' : 'bg-white text-promed-primary shadow-sm group-hover:text-promed-primary'}`}>
                            <Headphones size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Texnik yordam</p>
                            <p className="text-[11px] text-slate-500 font-medium">24/7 aloqadamiz</p>
                        </div>
                    </div>
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="text-slate-400"
                    >
                        <ChevronDown size={16} strokeWidth={2.5} />
                    </motion.div>
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            onAnimationComplete={() => {
                                if (isExpanded && cardRef.current) {
                                    cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                }
                            }}
                            className="flex flex-col gap-2 relative z-10 overflow-hidden"
                            onClick={(e) => e.stopPropagation()} // prevent double toggling when clicking buttons inside
                        >
                            <a href="tel:+998937489141" className="flex items-center justify-between bg-white text-slate-800 font-bold px-3 py-2.5 rounded-xl border border-slate-200/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:border-slate-300 hover:shadow-md active:scale-[0.98] transition-all pl-3.5 group/phone">
                                <span className="text-xs tracking-wide group-hover/phone:text-emerald-600 transition-colors">+998 93 748 91 41</span>
                                <div className="bg-emerald-50 p-1.5 rounded-lg">
                                    <Phone size={14} strokeWidth={2.5} className="text-emerald-500" />
                                </div>
                            </a>
                            <a href="https://t.me/+998937489141" target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-promed-primary/5 text-promed-primary font-bold px-3 py-2.5 rounded-xl border border-promed-primary/10 hover:bg-promed-primary/10 hover:border-promed-primary/20 active:scale-[0.98] transition-all">
                                <Send size={14} strokeWidth={2.5} />
                                <span className="text-xs tracking-wide">Telegram orqali</span>
                            </a>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

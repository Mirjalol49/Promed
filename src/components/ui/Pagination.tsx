import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    const { t } = useLanguage();

    if (totalPages <= 1) return null;

    return (
        <div className="flex justify-center items-center py-6 w-full mt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 800, damping: 35 }}
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-promed-primary hover:bg-slate-50 rounded-full disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                </motion.button>

                <div className="flex items-center gap-2 px-3">
                    <span className="text-xs font-black text-promed-primary uppercase tracking-widest leading-none">
                        {currentPage}
                    </span>
                    <div className="w-[1px] h-3 bg-slate-200" />
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        {totalPages}
                    </span>
                </div>

                <motion.button
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 800, damping: 35 }}
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-promed-primary hover:bg-slate-50 rounded-full disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-colors"
                >
                    <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
                </motion.button>
            </div>
        </div>
    );
};

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const getPages = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="flex justify-center items-center pt-6 pb-6 w-full mt-6 border-t border-slate-200/60">
            <div className="flex items-center gap-2.5">
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="w-11 h-11 flex items-center justify-center text-slate-400 bg-white border border-slate-200/70 shadow-sm hover:text-blue-600 hover:border-blue-300 hover:bg-slate-50 rounded-[14px] disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-200/70 disabled:hover:bg-white transition-all"
                >
                    <ChevronLeft className="w-5 h-5 ml-[-1px]" strokeWidth={2.5} />
                </motion.button>

                {getPages().map((page, idx) => (
                    <React.Fragment key={idx}>
                        {page === '...' ? (
                            <span className="w-10 h-11 flex items-center justify-center text-slate-400 font-bold">
                                ...
                            </span>
                        ) : (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onPageChange(page as number)}
                                className={`w-11 h-11 flex items-center justify-center font-bold text-[15px] rounded-[14px] transition-all ${currentPage === page
                                    ? 'btn-premium-blue-sq !p-0 !rounded-[14px] drop-shadow-md'
                                    : 'bg-white text-slate-700 border border-slate-200/70 shadow-sm hover:border-blue-300 hover:text-blue-600 hover:bg-slate-50'
                                    }`}
                            >
                                {page}
                            </motion.button>
                        )}
                    </React.Fragment>
                ))}

                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="w-11 h-11 flex items-center justify-center text-slate-400 bg-white border border-slate-200/70 shadow-sm hover:text-blue-600 hover:border-blue-300 hover:bg-slate-50 rounded-[14px] disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-200/70 disabled:hover:bg-white transition-all"
                >
                    <ChevronRight className="w-5 h-5 mr-[-1px]" strokeWidth={2.5} />
                </motion.button>
            </div>
        </div>
    );
};

import React from 'react';
import { motion } from 'framer-motion';

export const DashboardSkeleton: React.FC = () => {
    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans fixed inset-0 z-50" role="status" aria-label="Loading dashboard">
            {/* Sidebar Skeleton */}
            <aside className="hidden lg:flex flex-col w-[260px] bg-white/80 backdrop-blur-2xl h-full border-r border-slate-200/60 relative shadow-[5px_0_30px_-10px_rgba(0,0,0,0.03)]">
                {/* Logo */}
                <div className="p-4 md:p-6">
                    <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse" />
                </div>

                {/* Nav Items */}
                <div className="flex-1 mt-2 px-4 space-y-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex items-center space-x-3 px-4 py-3 rounded-2xl mb-1">
                            <div className="w-6 h-6 rounded-md bg-slate-200 animate-pulse" />
                            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 mt-auto border-t border-slate-100 bg-white space-y-2">
                    <div className="flex items-center space-x-3 px-4 py-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                            <div className="h-2 w-16 bg-slate-200 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Skeleton */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
                {/* Header */}
                <header className="sticky top-0 z-20 h-16 md:h-20 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
                    <div className="h-full flex items-center justify-between px-4 md:px-10">
                        {/* Title */}
                        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
                        {/* Right Actions */}
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
                            <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-40 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                                    <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
                                </div>
                                <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
                                <div className="h-3 w-32 bg-slate-50 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>

                    {/* Chart/Table Area */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
                        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                            <div className="flex justify-between mb-6">
                                <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
                                <div className="h-8 w-24 bg-slate-100 rounded-lg animate-pulse" />
                            </div>
                            <div className="space-y-4">
                                <div className="h-64 bg-slate-50 rounded-2xl animate-pulse" />
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                            <div className="h-6 w-32 bg-slate-200 rounded animate-pulse mb-6" />
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
                                        <div className="flex-1">
                                            <div className="h-3 w-full bg-slate-100 rounded animate-pulse mb-2" />
                                            <div className="h-2 w-2/3 bg-slate-50 rounded animate-pulse" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

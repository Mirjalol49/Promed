import React from 'react';
import { Skeleton } from './Skeleton';

// --- Staff Main Page Skeleton ---
export const StaffSkeleton = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden h-[400px]">
                    {/* Top Accent */}
                    <Skeleton className="h-24 w-full rounded-t-[2rem]" />

                    {/* Avatar */}
                    <div className="flex justify-center -mt-12 relative z-10">
                        <Skeleton className="w-[88px] h-[88px] rounded-[1.5rem] border-4 border-white" />
                    </div>

                    {/* Content */}
                    <div className="px-6 pt-4 pb-6 space-y-6">
                        {/* Name & Role */}
                        <div className="flex flex-col items-center gap-2">
                            <Skeleton className="h-6 w-3/4 rounded-lg" />
                            <Skeleton className="h-4 w-1/3 rounded-lg" />
                        </div>

                        {/* Salary & Phone */}
                        <div className="space-y-4">
                            <Skeleton className="h-14 w-full rounded-xl" />
                            <Skeleton className="h-14 w-full rounded-xl" />
                        </div>

                        {/* Button */}
                        <Skeleton className="h-12 w-full rounded-xl mt-2" />
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- Lead Kanban Card Skeleton ---
export const LeadCardSkeleton = () => {
    return (
        <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
                    {/* Header: Name + Badge */}
                    <div className="flex justify-between items-start">
                        <div className="space-y-2 w-2/3">
                            <Skeleton className="h-5 w-3/4 rounded-md" />
                            <Skeleton className="h-3 w-1/2 rounded-md" />
                        </div>
                        <Skeleton className="h-6 w-6 rounded-full" />
                    </div>

                    {/* Source & Date */}
                    <div className="flex gap-2">
                        <Skeleton className="h-6 w-20 rounded-lg" />
                        <Skeleton className="h-6 w-24 rounded-lg" />
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-8 w-24 rounded-lg" />
                    </div>
                </div>
            ))}
        </>
    );
};

// --- Patient List Skeleton ---
export const PatientListSkeleton = () => {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-premium">
            <div className="p-5 border-b border-slate-100 flex justify-end">
                <Skeleton className="w-64 h-10 rounded-xl" />
            </div>

            {/* Desktop Table Skeleton */}
            <div className="hidden md:block w-full">
                <div className="border-b border-slate-200 bg-slate-50/50">
                    <div className="flex p-4 gap-4">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                </div>
                <div className="divide-y divide-slate-100">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-4 flex items-center gap-4">
                            {/* Name Column */}
                            <div className="w-1/4 flex items-center gap-3">
                                <Skeleton className="w-11 h-11 rounded-xl" />
                                <div className="space-y-1 flex-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                            {/* Date */}
                            <div className="w-1/4">
                                <Skeleton className="h-4 w-24" />
                            </div>
                            {/* Next Injection */}
                            <div className="w-1/4">
                                <Skeleton className="h-6 w-20 rounded-md" />
                            </div>
                            {/* Technique */}
                            <div className="w-1/4">
                                <Skeleton className="h-6 w-24 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile List Skeleton */}
            <div className="block md:hidden divide-y divide-slate-100">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-12 h-12 rounded-xl" />
                            <div className="space-y-1 flex-1">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                            <Skeleton className="w-16 h-6 rounded-lg" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 pl-[60px]">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Admin Registry Skeleton ---
export const AdminRegistrySkeleton = () => {
    return (
        <>
            {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-slate-50">
                    <td className="px-10 py-6">
                        <div className="flex items-center space-x-6">
                            <Skeleton className="w-14 h-14 rounded-2xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-48 rounded-lg" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-4 w-32 rounded-lg" />
                                    <Skeleton className="h-4 w-20 rounded-lg" />
                                </div>
                            </div>
                        </div>
                    </td>
                    <td className="px-8 py-5">
                        <div className="flex justify-end">
                            <Skeleton className="w-10 h-10 rounded-xl" />
                        </div>
                    </td>
                </tr>
            ))}
        </>
    );
};

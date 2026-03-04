import React, { useState, useEffect } from 'react';
import { Activity, Clock, Stethoscope, User, Calendar, Building2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccount } from '../../contexts/AccountContext';
import { subscribeToStaff } from '../../lib/staffService';
import { Staff } from '../../types';
import { subscribeToTransactions } from '../../lib/financeService';
import { Transaction } from '../../types';
import { formatWithSpaces } from '../../lib/formatters';
import { format } from 'date-fns';
import { uz, ru, enUS } from 'date-fns/locale';

export const OperationProgressTracker: React.FC<{ patientId: string }> = ({ patientId }) => {
    const { t, language } = useLanguage();
    const { accountId } = useAccount();

    const currentLocale = language === 'ru' ? ru : language === 'en' ? enUS : uz;

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);

    useEffect(() => {
        if (!accountId) return;
        const unsubTx = subscribeToTransactions(accountId, (allTx) => {
            setTransactions(allTx.filter(t => t.patientId === patientId && !t.isVoided && !t.returned));
        });
        const unsubStaff = subscribeToStaff(accountId, (data) => {
            setStaffList(data);
        }, (err) => console.error(err));

        return () => {
            unsubTx();
            unsubStaff();
        };
    }, [accountId, patientId]);

    // Grouping by precise surgery income transaction
    const surgeryIncomes = transactions
        .filter(t => t.type === 'income' && t.category === 'surgery' && !t.isVoided && !t.returned)
        .sort((a, b) => {
            const strA = `${a.date}T${a.time || '00:00'}`;
            const strB = `${b.date}T${b.time || '00:00'}`;
            if (strA === strB) {
                return a.createdAt && b.createdAt ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : a.id.localeCompare(b.id);
            }
            return strA.localeCompare(strB); // oldest first
        });

    const allSplits = transactions.filter(t => t.description?.startsWith('[Split]') && !t.isVoided && !t.returned);

    if (surgeryIncomes.length === 0) {
        return (
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 mb-6">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-3 mb-5 text-[16px]">
                    <div className="p-1.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
                        <Activity size={18} strokeWidth={2.5} />
                    </div>
                    {t('operation_progress') || 'Operatsiya tarixi'}
                </h3>
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
                    <div className="mx-auto w-[52px] h-[52px] bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center mb-4">
                        <Stethoscope className="h-6 w-6 text-slate-300 stroke-[2.5px]" />
                    </div>
                    <p className="text-[15px] font-extrabold text-slate-600">{t('no_operation_steps') || 'Operatsiya ma\'lumotlari yo\'q'}</p>
                    <p className="text-[13px] text-slate-400 mt-1.5 font-bold max-w-sm mx-auto">{t('add_phases_ph') || "Operatsiya to'lovi qo'shilgach, bu yerda avtomatik ravishda xodimlar ulushi ko'rinadi"}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2rem] p-4 sm:p-6 shadow-sm border border-slate-200 mb-6">
            <h3 className="font-extrabold text-slate-800 flex items-center gap-3 mb-6 text-[16px]">
                <div className="p-1.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
                    <Activity size={18} strokeWidth={2.5} />
                </div>
                {t('operation_progress') || 'Operatsiya tarixi'}
            </h3>

            <div className="space-y-6">
                {[...surgeryIncomes].reverse().map((income, index) => {
                    const sessionNumber = surgeryIncomes.length - index;
                    const date = income.date;

                    const splits = allSplits.filter(s =>
                        s.date === income.date &&
                        s.time === income.time &&
                        s.patientId === income.patientId
                    );

                    const totalIncome = Number(income.amount);
                    const totalSplits = splits.reduce((sum, s) => sum + Number(s.amount), 0);
                    const clinicAmount = Math.max(0, totalIncome - totalSplits);
                    const clinicPercent = totalIncome > 0 ? Math.round((clinicAmount / totalIncome) * 100) : 100;

                    return (
                        <div key={income.id} className="border border-slate-100 rounded-[2rem] overflow-hidden bg-slate-50/30 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                            {/* Session Header */}
                            <div className="bg-white px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between border-b border-slate-100 gap-2">
                                <div className="flex items-center gap-2.5 sm:gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-black text-sm border border-violet-100 flex-shrink-0">
                                        {sessionNumber}
                                    </div>
                                    <h4 className="font-extrabold text-slate-800 text-[14px] sm:text-[15px] truncate">{t('seans_n')?.replace('{n}', String(sessionNumber)).toLowerCase() || `${sessionNumber}-seans`}</h4>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[12px] font-bold text-slate-500 bg-slate-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-200/60 shrink-0">
                                    <Calendar size={12} className="text-slate-400" strokeWidth={2.5} />
                                    {format(new Date(date), 'dd MMM yyyy', { locale: currentLocale })}
                                </div>
                            </div>

                            {/* Splits List */}
                            <div className="p-4 md:p-5 flex flex-col gap-3">
                                {splits.map((split, sIdx) => {
                                    const staff = staffList.find(s => s.id === split.staffId);
                                    const displayName = staff?.fullName || split.description?.replace('[Split] ', '') || 'Staff';
                                    const splitAmount = Number(split.amount);
                                    const splitPercent = totalIncome > 0 ? Math.round((splitAmount / totalIncome) * 100) : 0;

                                    return (
                                        <div key={split.id || sIdx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-4 py-3 md:py-3.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group gap-2">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-sm border border-slate-200/60 bg-slate-100 group-hover:scale-105 transition-transform duration-300">
                                                    {staff?.imageUrl ? (
                                                        <img src={staff.imageUrl} alt={displayName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={16} className="text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-extrabold text-slate-800 text-[14px] truncate">{displayName}</span>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {staff && staff.role && (
                                                            <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                                                                {t(`role_${staff.role}`) || staff.role}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md">
                                                            {splitPercent}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-[13px] sm:text-[16px] font-black text-violet-600 flex items-baseline gap-1 shrink-0 self-end sm:self-center bg-violet-50/30 sm:bg-transparent px-2 py-0.5 sm:p-0 rounded-lg">
                                                {formatWithSpaces(splitAmount)} <span className="text-[10px] sm:text-[11px] text-violet-400">UZS</span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Klinika Net Profit */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-emerald-50/60 px-4 py-3 md:py-3.5 rounded-2xl border border-emerald-100/60 shadow-sm group hover:shadow-md transition-shadow gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center relative shadow-sm bg-white border border-emerald-200/60 group-hover:scale-105 transition-transform duration-300">
                                            <Building2 size={16} className="text-emerald-500" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-extrabold text-emerald-900 text-[14px] truncate">{t('clinic') || 'Klinika'}</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[9px] uppercase tracking-widest font-black text-emerald-500">
                                                    {t('net_profit') || 'Sof daromad'}
                                                </span>
                                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">
                                                    {clinicPercent}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[13px] sm:text-[16px] font-black text-emerald-600 flex items-baseline gap-1 shrink-0 self-end sm:self-center bg-emerald-100/30 sm:bg-transparent px-2 py-0.5 sm:p-0 rounded-lg">
                                        {formatWithSpaces(clinicAmount)} <span className="text-[10px] sm:text-[11px] text-emerald-500">UZS</span>
                                    </div>
                                </div>
                            </div>

                            {/* Total Summary Footer */}
                            <div className="bg-slate-100/50 px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                                <span className="text-[11px] sm:text-[13px] font-black tracking-widest text-slate-800 uppercase shrink-0">{t('total') || 'JAMI'}</span>
                                <div className="text-[15px] sm:text-[18px] font-black text-slate-800 flex items-baseline gap-1 truncate text-right">
                                    {formatWithSpaces(totalIncome)} <span className="text-[10px] sm:text-[13px] text-slate-400 shrink-0">UZS</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

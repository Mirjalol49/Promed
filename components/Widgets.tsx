
import React from 'react';
import {
  Users,
  UserPlus,
  Calendar,
  Clock,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Injection, InjectionStatus, Patient } from '../types';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';

// --- Stat Card ---
interface StatCardProps {
  label: string;
  value: string | number;
  change: string;
  icon: any;
  colorClass: string;
  shadowColor: string;
  isLoading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, change, icon: Icon, colorClass, shadowColor, isLoading }) => {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className={`p-7 rounded-2xl relative overflow-hidden h-[160px] bg-slate-200 animate-pulse`}>
        <div className="flex space-x-3 mb-5">
          <div className="w-10 h-10 bg-slate-300 rounded-lg"></div>
          <div className="h-4 bg-slate-300 rounded w-24 self-center"></div>
        </div>
        <div className="h-10 bg-slate-300 rounded w-16 mb-2"></div>
        <div className="h-3 bg-slate-300 rounded w-32"></div>
      </div>
    );
  }

  return (
    <div
      className={`p-7 rounded-2xl text-white relative overflow-hidden transition-transform hover:-translate-y-1 duration-300 ${colorClass}`}
      style={{ boxShadow: `0 10px 30px -5px ${shadowColor}` }}
    >
      <div className="relative z-10">
        <div className="flex items-center space-x-3 mb-5 opacity-90">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-inner">
            <Icon size={22} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-wide uppercase opacity-90">{label}</span>
        </div>
        <div className="flex items-baseline space-x-3">
          <span className="text-4xl font-bold tracking-tight text-white">{value}</span>
          <div className="flex items-center space-x-1 bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10">
            <span className="text-xs font-bold text-white">{change}</span>
          </div>
        </div>
        <p className="text-xs opacity-80 mt-2 pl-1 font-semibold">{t('last_month')}</p>
      </div>
      {/* Decorative elements */}
      <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute right-12 -top-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />
    </div>
  );
};

// --- Chart Widget ---
const chartData = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Apr', value: 200 },
  { name: 'May', value: 500 },
  { name: 'Jun', value: 700 },
];

export const StatsChart: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="bg-white p-7 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow duration-300 border border-slate-200">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">{t('patients_stats')}</h3>
          <p className="text-sm text-slate-400 font-medium mt-0.5">Overview of patient registration</p>
        </div>
        <select className="text-sm bg-slate-50 border-slate-200 border rounded-xl px-3 py-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-promed-primary/20 transition cursor-pointer font-bold">
          <option>{t('monthly')}</option>
          <option>{t('weekly')}</option>
        </select>
      </div>
      <div className="w-full h-[300px]" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0D7A72" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0D7A72" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }}
              dy={15}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                padding: '12px 16px',
                fontWeight: 'bold',
                color: '#1E293B',
                backgroundColor: '#ffffff'
              }}
              cursor={{ stroke: '#0D7A72', strokeWidth: 1, strokeDasharray: '4 4' }}
              itemStyle={{ color: '#0D7A72' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0D7A72"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorValue)"
              activeDot={{ r: 6, strokeWidth: 0, fill: '#0D7A72' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- Upcoming Injections List ---
interface UpcomingProps {
  patients: Patient[];
  onViewPatient: (id: string) => void;
}

export const UpcomingInjections: React.FC<UpcomingProps> = ({ patients, onViewPatient }) => {
  const { t } = useLanguage();
  // Flatten all injections, filter for scheduled, and sort
  const today = new Date().toISOString().split('T')[0];

  const upcoming = (patients || [])
    .flatMap(p => (p.injections || []).map(i => ({ ...i, patientName: p.fullName || 'Unknown', patientImg: p.profileImage, patientId: p.id })))
    .filter(i => i.status === InjectionStatus.SCHEDULED && i.date >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  return (
    <div className="bg-white p-7 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow duration-300 border border-slate-200 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">{t('todays_appointments')}</h3>
          <p className="text-sm text-slate-400 font-medium mt-0.5">Upcoming schedule</p>
        </div>
        <button className="text-sm text-promed-primary font-bold hover:bg-promed-primary/10 px-3 py-1.5 rounded-lg transition">{t('see_all')}</button>
      </div>

      <div className="space-y-3 flex-1">
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 space-y-2">
            <Calendar size={32} className="opacity-20" />
            <p className="font-medium">{t('no_upcoming')}</p>
          </div>
        ) : (
          upcoming.map((inj) => (
            <div
              key={inj.id + inj.patientId}
              className="flex items-center justify-between group cursor-pointer p-3 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100"
              onClick={() => onViewPatient(inj.patientId)}
            >
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img
                    src={inj.patientImg || "https://via.placeholder.com/40"}
                    alt={inj.patientName}
                    className="w-12 h-12 rounded-xl object-cover shadow-sm ring-1 ring-slate-100"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                    <div className="bg-emerald-500 w-2.5 h-2.5 rounded-full border-2 border-white"></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-promed-primary transition">{inj.patientName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1 font-medium">
                    <Clock size={12} className="text-slate-400" />
                    <span>{t('plasma_injection')}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${inj.date === today ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                  {inj.date === today ? t('today') : new Date(inj.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                {inj.date === today && <span className="text-xs font-bold text-slate-700">10:00 AM</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
